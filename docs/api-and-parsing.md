# LLM API Integration & Response Parsing

## Provider endpoints

| Provider | Endpoint | Auth | Default Model |
|----------|----------|------|---------------|
| Anthropic | `api.anthropic.com/v1/messages` | `x-api-key` + `anthropic-version` + `anthropic-dangerous-direct-browser-access` | `claude-sonnet-4-20250514` |
| OpenAI | `api.openai.com/v1/chat/completions` | `Authorization: Bearer` | `gpt-4o` |
| Gemini | `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | Key in URL query param | `gemini-2.5-flash` |
| OpenAI-Compatible | Custom `baseUrl` + `/v1/chat/completions` | `Authorization: Bearer` | DeepSeek: `deepseek-chat`, Groq: `llama-3.3-70b-versatile` |

## Call flow

- `callLLM(llmConfig, systemPrompt, userMessage, maxTokens)` → dispatches to `callAnthropic`, `callOpenAI`, `callGemini`
- `callLLMStructured(...)` → `callAnthropicStructured` (tool use), `callOpenAIStructured` (json_schema), `callGeminiStructured` (responseMimeType); OpenAI-compatible falls back to `callLLM`
- AbortController with 60s timeout; `generateReader` accepts external signal
- `fetchWithRetry()`: exponential backoff (2 retries for 5xx/429)
- Prompt templates are provider-agnostic, built from `langConfig.prompts`

## Prompt types

- **Syllabus:** Returns JSON `{ summary, lessons[] }` (no markdown fences). Falls back if LLM returns plain array.
- **Reader (text mode):** Structured markdown with sections 1–6; section 5 is ` ```anki-json``` `
- **Reader (structured mode):** JSON matching `READER_JSON_SCHEMA`: `title_target`, `title_en`, `story`, `vocabulary[]`, `questions[]`, `grammar_notes[]`
- `learnedVocabulary` keys passed to LLM to avoid re-introducing covered words

## Response parsing (lib/parser.js)

### Regex parser (default)
- Sections: `### 1. Title`, `### 2. Story`, `### 3. Vocabulary`, `### 4. Comprehension`, `### 5. Anki`
- `#{2,4}\s*N\.` tolerates 2–4 hash marks
- Fallback: raw text with "Regenerate" button
- `parseStorySegments()` → `{ type: 'text'|'bold'|'italic', content }[]`
- `parseQuestions()` → `{ text, translation }[]` (extracts trailing parenthesized translations)
- `parseVocabularySection`: Pattern A = `(pinyin)` or `[pinyin]`; Pattern B = no-bracket (backfill from ankiJson). Missing vocab words auto-appended from ankiJson.
- Vocab items: canonical fields (target/romanization/translation) + legacy aliases (chinese/pinyin/english)

### Structured parser (opt-in)
- `normalizeStructuredReader(rawJson, langId)` converts JSON to same shape as regex parser output
- Falls back to regex parser on invalid JSON
- Not supported by OpenAI-compatible endpoints

## Anki export format

- Tab-separated: `Chinese \t Pinyin \t English \t Examples \t Tags`
- Tags: `HSK<level> <Topic_underscored> <YYYY-MM-DD>`
- Filename: `anki_cards_<topic>_HSK<level>_<YYYY-MM-DD>.txt`
- UTF-8 BOM for Excel. Duplicate prevention via `exportedWords` Set.

## Migration

- Legacy single `gradedReader_apiKey` → `providerKeys.anthropic` on first load
- Legacy data missing `langId` → normalized to `'zh'` via `vocabNormalizer.js`
