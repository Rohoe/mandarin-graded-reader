# Architecture Reference

## File-by-file guide

### `src/context/`

| File | Description |
|------|-------------|
| `AppContext.jsx` | useReducer-based global store + AppProvider. Pure reducer (no side effects); all persistence via useEffect hooks keyed to state slices. Uses `mountedRef` to skip initial-render saves. Generated readers use `prevReadersRef` diffing. Test-only exports: `_baseReducer`, `_reducer`, `_DATA_ACTIONS`. |
| `useApp.js` | useApp hook (separate file for ESLint fast-refresh rule) |
| `actions.js` | actions() helper factory (separate file for same reason) |

### `src/lib/`

| File | Description |
|------|-------------|
| `languages.js` | Language config registry. Exports `getLang(id)`, `getAllLanguages()`, `getLessonTitle()`, `DEFAULT_LANG_ID`. Each lang: proficiency levels, scriptRegex, fonts, TTS config, romanization loader, decorative chars, prompt fragments. Supports `'zh'`, `'yue'`, `'ko'`. |
| `romanizer.js` | Async romanization loader. Lazy-loads pinyin-pro (zh), to-jyutping (yue), hangul-romanization (ko). Returns `{ romanize(text): string[] }`. |
| `vocabNormalizer.js` | Migration helpers: `normalizeSyllabus()` adds langId + title_target. `normalizeVocabWord()` maps chinese/pinyin/english ↔ target/romanization/translation. |
| `providers.js` | Provider registry. Exports `PROVIDERS`, `getProvider(id)`, `DEFAULT_PROVIDER`. Four providers: anthropic, openai, gemini, openai_compatible (presets: DeepSeek, Groq, custom). |
| `llmConfig.js` | `buildLLMConfig(state)` → `{ provider, apiKey, model, baseUrl }` |
| `api.js` | LLM API calls: `generateSyllabus()`, `generateReader()`, `extendSyllabus()`, `gradeAnswers()`. All accept `llmConfig` first, `langId` last. `callLLM()` dispatches to provider-specific functions. `fetchWithRetry()` for backoff. `callLLMStructured()` for structured output. Exports `isRetryable` for testing. |
| `stats.js` | `computeStats(state)`, `getStreak()`, `getWordsByPeriod()` |
| `storage.js` | localStorage helpers with file fan-out via `setDirectoryHandle()`. Per-reader lazy storage. LRU eviction (>30 cached, >30 days). Provider keys NOT synced to file/cloud. |
| `fileStorage.js` | File System Access API layer. Stores directory handle in IndexedDB. File layout: `graded-reader-syllabi.json`, `graded-reader-readers.json`, `graded-reader-vocabulary.json`, `graded-reader-exported.json`. |
| `parser.js` | Parses LLM markdown → structured data. `normalizeStructuredReader()` for JSON mode. Language-aware via `langConfig.scriptRegex`. Vocab items have both canonical (target/romanization/translation) and legacy (chinese/pinyin/english) fields. |
| `anki.js` | Tab-separated Anki .txt export. UTF-8 BOM. Duplicate prevention via `exportedWords` Set. |
| `supabase.js` | Supabase client singleton |
| `demoReader.js` | Hardcoded HSK 2 demo reader. `DEMO_READER_KEY = 'standalone_demo'`. Injected when no data exists, removed on first generation. |
| `cloudSync.js` | Cloud sync: `signInWithGoogle()`, `signInWithApple()`, `signOut()`, `pushToCloud()`, `pullFromCloud()`. `mergeData()` for union merge. `computeMergeSummary()` for human-readable diffs. `pushReaderToCloud` serialized via promise queue. |

### `src/prompts/`

| File | Function |
|------|----------|
| `syllabusPrompt.js` | `buildSyllabusPrompt(langConfig, topic, level, lessonCount)` |
| `readerSystemPrompt.js` | `buildReaderSystem(langConfig, level, topic, charRange, targetChars)` |
| `gradingPrompt.js` | `buildGradingSystem(langConfig, level)` |
| `extendSyllabusPrompt.js` | `buildExtendSyllabusPrompt(langConfig, topic, level, existingLessons, additionalCount)` |

### `src/hooks/`

| File | Description |
|------|-------------|
| `useTTS.js` | Voice loading, speech synthesis, per-paragraph speak. Rate = `ttsSpeechRate × langConfig.tts.defaultRate`. |
| `useRomanization.jsx` | Async romanizer loading, `renderChars()` with ruby tags. Parses markdown segments before applying romanization. |
| `useVocabPopover.js` | Vocab map, click handler, popover positioning, close logic |
| `useReaderGeneration.js` | Generate/regenerate API calls + state updates. AbortController for abort-on-unmount. |

## State shape

```js
{
  // Provider config
  apiKey, providerKeys, activeProvider, activeModel,
  customBaseUrl, customModelName, compatPreset,

  // Content
  syllabi: [{ id, topic, level, langId, summary, lessons[], createdAt }],
  syllabusProgress: { [syllabusId]: { lessonIndex, completedLessons[] } },
  standaloneReaders: [{ key, topic, level, langId, createdAt, seriesId?, episodeNumber?, isDemo? }],
  generatedReaders: { [lessonKey]: parsedReaderData },
  learnedVocabulary: { [targetWord]: { romanization, translation, langId, dateAdded, SRS fields... } },
  exportedWords: Set<string>,

  // UI
  loading, loadingMessage, error, notification,

  // Preferences (persisted, not cleared by CLEAR_ALL_DATA)
  maxTokens, defaultLevel, defaultTopikLevel, defaultYueLevel,
  ttsKoVoiceURI, ttsYueVoiceURI, ttsSpeechRate,
  romanizationOn, verboseVocab, useStructuredOutput, newCardsPerDay,

  // Storage & sync
  evictedReaderKeys: Set<string>,
  pendingReaders: { [lessonKey]: true },
  learningActivity: [{ type, timestamp, ... }],
  fsInitialized, saveFolder, fsSupported,
  cloudUser, cloudSyncing, cloudLastSynced, lastModified, hasMergeSnapshot,
}
```

## Storage layers

### localStorage (always)
Primary storage. ~5MB limit. Settings shows usage %. LRU eviction for readers.

### File System Access API (opt-in, Chrome/Edge)
Write-through: localStorage first, then async file write. Directory handle stored in IndexedDB. On startup: load handle → verify permission → hydrate via `HYDRATE_FROM_FILES`.

### Cloud sync (opt-in, Supabase)
Auto-merge on startup with undo. Hash-based conflict detection. Pre-merge snapshot for revert. Safety guards: `syncPausedRef`, skip if already synced, signOut before clearAll.

## Multi-language: adding a new language

1. Add config object to `languages.js` (follow zh/yue/ko shape)
2. Install romanization library if needed
3. Add font import to `index.css`
4. Add `[data-lang="xx"]` CSS override block
5. Legacy data without `langId` auto-normalizes to `'zh'`
