# CLAUDE.md — Multi-Language Graded Reader App

Project context and architecture notes for Claude Code sessions.

## What this app does

Single-page React + Vite app that generates graded readers in **Mandarin Chinese**, **Cantonese**, and **Korean** using LLM APIs. Supports multiple AI providers: **Anthropic Claude**, **OpenAI**, **Google Gemini**, and **OpenAI-compatible** endpoints (DeepSeek, Groq, custom). Users select a language and proficiency level (HSK 1–6 for Chinese, YUE 1–6 for Cantonese, TOPIK 1–6 for Korean); the app generates structured stories with vocabulary, comprehension questions, and Anki flashcard exports. All three languages coexist side-by-side.

## Running the app

```bash
npm install        # first time only
npm run dev        # starts at http://localhost:5173 (or 5174 if port taken)
npm run build      # production build to dist/
npm test           # run unit tests (Vitest)
npm run test:e2e   # run E2E tests (Playwright)
```

No `.env` file is required for basic use. The app can be used without an API key to browse existing readers, review vocabulary, and access all non-generative features. To generate new readers or grade comprehension questions, users select a provider and add their API key in Settings. Each provider stores its own key in `localStorage` — switching providers doesn't lose keys. For cloud sync, a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` is needed (see README for setup).

## Architecture

```
src/
  App.jsx                     Root layout; manages UI-only state (sidebar open,
                              settings modal, stats modal, flashcard modal,
                              activeSyllabusId, standaloneKey, syllabusView
                              'home'|'lesson')
  App.css                     Two-column layout, mobile header, toast notification
  index.css                   Design system: tokens, reset, shared primitives

  context/
    AppContext.jsx             useReducer-based global store + AppProvider.
                              Pure reducer (no side effects); all persistence via
                              useEffect hooks in AppProvider keyed to state slices.
                              Uses mountedRef to skip initial-render saves.
                              Generated readers use prevReadersRef diffing.
                              Exports: AppContext, AppProvider, useApp (re-export).
                              Test-only exports: _baseReducer, _reducer, _DATA_ACTIONS.
    useApp.js                 useApp hook (separate file — ESLint fast-refresh rule)
    actions.js                actions() helper factory (separate file — same reason)

  lib/
    languages.js              Language config registry. Exports getLang(id), getAllLanguages(),
                              getLessonTitle(lesson, langId), DEFAULT_LANG_ID.
                              Each language is a static object defining:
                              proficiency levels, scriptRegex, fonts, TTS config, prompt
                              fragments, decorative chars, romanization loader. Currently
                              supports 'zh' (Mandarin Chinese), 'yue' (Cantonese), and
                              'ko' (Korean).
    romanizer.js              Async romanization loader. Lazy-loads pinyin-pro (Chinese),
                              to-jyutping (Cantonese), or hangul-romanization (Korean) via
                              the language config's getRomanizer() method. Returns
                              { romanize(text): string[] }.
    vocabNormalizer.js        Migration helpers: normalizeSyllabus() adds langId + title_target
                              to legacy data. normalizeVocabWord() maps chinese/pinyin/english
                              ↔ generic target/romanization/translation fields.
    providers.js              Provider registry for multi-LLM support. Exports PROVIDERS
                              map, getProvider(id), DEFAULT_PROVIDER. Four providers:
                              anthropic, openai, gemini, openai_compatible (with presets
                              for DeepSeek, Groq, and custom endpoints). Each config
                              defines id, name, keyPlaceholder, defaultModel, models[].
    llmConfig.js              buildLLMConfig(state) — builds { provider, apiKey, model,
                              baseUrl } from app state for API functions.
    api.js                    LLM API calls: generateSyllabus(), generateReader(),
                              extendSyllabus(), gradeAnswers(). All accept llmConfig as
                              first param and optional langId as last param (defaults to
                              'zh'). callLLM() dispatches to provider-specific functions:
                              callAnthropic, callOpenAI (also used for compatible), callGemini.
                              Each call uses AbortController with 60s timeout; generateReader
                              accepts an external signal for abort-on-unmount.
                              Shared fetchWithRetry() for exponential backoff on 5xx/429.
                              Structured output: callLLMStructured() dispatches to
                              callAnthropicStructured (tool use), callOpenAIStructured
                              (json_schema), callGeminiStructured (responseMimeType).
                              OpenAI-compatible falls back to standard text callLLM.
                              READER_JSON_SCHEMA exported for structured output.
                              Prompt templates imported from src/prompts/.
    stats.js                  Derives learning statistics: computeStats(state), getStreak(),
                              getWordsByPeriod(). Used by StatsDashboard component.
    storage.js                localStorage helpers — load/save for all persisted state.
                              Per-reader lazy storage with index key. Also fans writes to
                              disk when a FileSystemDirectoryHandle is registered via
                              setDirectoryHandle(). Provider keys are NOT synced to file
                              or cloud. Includes migration from legacy single apiKey to
                              providerKeys map. LRU eviction of stale readers (>30 cached,
                              >30 days old) with backup verification — only evicts readers
                              confirmed to exist in cloud or file storage. Tracks evicted
                              keys in localStorage for restore UI.
    fileStorage.js            File System Access API layer. Persists app data as JSON
                              files in a user-chosen folder. Stores the directory handle
                              in IndexedDB (localStorage can't hold object handles).
                              readReaderFromFile(dirHandle, lessonKey) reads a single
                              reader from the monolithic readers JSON (used for restore).
                              File layout in chosen folder:
                                graded-reader-syllabi.json    (syllabi + syllabusProgress + standaloneReaders)
                                graded-reader-readers.json    (generatedReaders cache)
                                graded-reader-vocabulary.json (learnedVocabulary)
                                graded-reader-exported.json   (exportedWords array)
    parser.js                 Parses LLM markdown response into structured data:
                              titleZh, titleEn, story, vocabulary[], questions[], ankiJson[],
                              grammarNotes[]. Accepts langId param — uses langConfig.scriptRegex
                              and langConfig.fields for language-aware parsing.
                              extractExamples() strips verbose LLM prefixes (e.g. "Example
                              sentence FROM STORY:", "Additional example:") via
                              stripExamplePrefix(). Detects "Brief usage note" lines.
                              Vocab items include canonical fields (target, romanization,
                              translation) alongside legacy aliases (chinese, pinyin, english).
                              normalizeStructuredReader(rawJson, langId) converts structured
                              JSON (from tool use / json_schema) into the same shape as
                              parseReaderResponse; falls back to regex parser on invalid JSON.
    anki.js                   Generates tab-separated Anki .txt export; duplicate prevention.
                              Accepts langId — uses langConfig.fields for column mapping and
                              langConfig.proficiency.name for tags/filename.
    supabase.js               Supabase client singleton (reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    demoReader.js             Hardcoded HSK 2 demo reader ("小猫找朋友"). Exports
                              DEMO_READER_KEY = 'standalone_demo' and DEMO_READER_DATA.
                              Injected into initial state when no syllabi/readers exist.
                              Removed automatically on first real generation.
    cloudSync.js              Cloud sync helpers: signInWithGoogle(), signInWithApple(), signOut(),
                              pushToCloud(state), pullFromCloud(). Auth uses Supabase OAuth with
                              redirectTo: window.location.origin. pushToCloud upserts all syncable
                              state to user_data table; pullFromCloud returns the row or null
                              (PGRST116 = no row, not an error). pushReaderToCloud serialized
                              via module-level promise queue to prevent race conditions.
                              fetchCloudReaderKeys() returns Set of reader keys in cloud
                              (for eviction verification). pullReaderFromCloud(lessonKey)
                              fetches a single reader's data for on-demand restore.
                              mergeData(localState, cloudData) performs union merge of
                              syllabi, standalone readers, vocabulary, exported words, and
                              generated readers. pushMergedToCloud(merged) upserts the
                              merged result to Supabase.

  prompts/
    syllabusPrompt.js         buildSyllabusPrompt(langConfig, topic, level, lessonCount)
    readerSystemPrompt.js     buildReaderSystem(langConfig, level, topic, charRange, targetChars)
    gradingPrompt.js          buildGradingSystem(langConfig, level)
    extendSyllabusPrompt.js   buildExtendSyllabusPrompt(langConfig, topic, level, existingLessons, additionalCount)

  hooks/
    useTTS.js                 Voice loading, speech synthesis, per-paragraph speak.
                              Accepts ttsSpeechRate param; rate = ttsSpeechRate × langConfig.tts.defaultRate.
    useRomanization.jsx       Async romanizer loading, renderChars() with ruby tags.
                              Accepts pinyinOn from global state (romanizationOn) rather
                              than managing local toggle state. renderChars parses markdown
                              segments (**bold**, *italic*, plain) before applying ruby
                              romanization to each segment. romanizeText() handles plain
                              text → ruby JSX conversion.
    useVocabPopover.js        Vocab map, click handler, popover positioning, close logic
    useReaderGeneration.js    Generate/regenerate API calls + state updates.
                              Uses AbortController ref for abort-on-unmount.
                              Accepts useStructuredOutput flag to switch between
                              regex parser and normalizeStructuredReader.

  components/
    TopicForm                 Topic input + language selector (pill toggle: 中文 / 粵語 / 한국어)
                              + proficiency level pills (read from langConfig). Two modes:
                              syllabus / standalone. Sliders: lesson count (2–12, syllabus
                              mode only) and reader length (150–2000 chars, step 50).
                              Passes langId through to all API calls and reader creation.
                              Generate button is disabled if no API key is set; shows warning
                              message directing user to Settings. Hint text when topic is empty.
    SyllabusPanel             Left sidebar; syllabus dropdown, lesson list, standalone
                              readers list, progress bar, settings link.
                              Home (⌂) button in switcher row calls onGoSyllabusHome.
                              Standalone Readers section lists all standaloneReaders[]
                              with delete buttons; clicking opens the reader in ReaderView.
                              Syllabus deletion moved to SyllabusHome (no longer in sidebar).
                              formOpen state resets to false via useEffect when
                              activeSyllabusId changes (auto-collapses after generation).
                              Both syllabus lesson list and standalone readers list are
                              collapsible via caret (▾/▸) buttons; lessonsOpen and
                              standaloneOpen state (both default true).
                              Footer shows cloud sync status: ☁ icon + label indicating
                              "Not signed in", "Synced", "Unsynced", "Syncing…", or
                              "Not yet synced". Dirty detection compares lastModified
                              vs cloudLastSynced timestamps. When not signed in, a
                              "Sign in" link appears below the label and opens Settings.
                              Also shows "Cards" button to open FlashcardReview and
                              "Stats" button to open the StatsDashboard modal.
                              Standalone readers with seriesId are grouped as
                              collapsible series with episode numbers; ungrouped
                              readers render as before. Demo readers show "(sample)"
                              label and hide archive/delete buttons.
    SyllabusHome              Overview page for a syllabus (shown when syllabusView='home').
                              Displays: topic, HSK badge, date, AI-generated summary, lesson
                              list with completion status and Start/Review CTAs, Continue
                              button, and a danger-zone Delete Syllabus button with inline
                              confirmation. Located at components/SyllabusHome/index.jsx.
                              "Add more lessons" collapsible panel: slider 2–6, Generate button
                              calls onExtend(additionalCount). Shows a fixed LoadingIndicator
                              overlay while state.loading is true.
    ReaderView                Main content area; orchestrates hooks and sub-components.
                              Determines langId, sets data-lang attribute. Uses custom hooks:
                              useTTS, useRomanization, useVocabPopover, useReaderGeneration.
                              Reads romanizationOn, ttsSpeechRate, useStructuredOutput from
                              global state. TTS button rendered directly in the article header.
                              Delegates story rendering to StorySection. Demo reader detection:
                              shows dismissible banner, hides Mark Complete / Regenerate /
                              Continue Story for demo readers. Evicted reader detection:
                              shows "archived to free up storage" message with "Restore
                              from backup" button (tries file then cloud); on failure falls
                              through to normal "Generate Reader" UI.
    StorySection              Renders story paragraphs with vocab buttons, TTS click-to-read,
                              and popover portal for vocab definitions.
    StatsDashboard/           Modal showing learning stats: vocab growth bar chart, per-language
                              breakdown, quiz scores, streak counter, activity counts.
                              Flashcard stats section: total reviews, reviews today, retention
                              rate (% "got"), flashcard streak, mastery breakdown (mastered
                              ≥21d interval / learning / new). Uses computeStats() from
                              lib/stats.js. CSS-only charts. "Load full history" button
                              merges stashed activity entries. "Review flashcards" button
                              opens FlashcardReview modal.
    FlashcardReview/          Modal with daily session SRS. buildDailySession() in srs.js
                              collects due + new cards per day (configurable newCardsPerDay,
                              default 20). Supports forward (target→EN) and reverse (EN→target)
                              card directions with independent SRS tracking per direction.
                              Reverse cards unlock after a word has been reviewed forward ≥1 time.
                              Shows SRS interval previews below judgment buttons (e.g. "3d", "2w").
                              Undo via Ctrl+Z restores previous card's SRS state. Example
                              sentences shown on card back when available. Session is resumable
                              on same day; resets at midnight. Language filter pills when vocab
                              spans multiple languages. Session summary on completion with
                              mastery breakdown. Logs flashcard_reviewed activity with direction.
    VocabularyList            Collapsible accordion of vocab cards with examples.
                              Accepts `renderChars` prop — applies ruby romanization to word headers
                              and example sentences when romanization toggle is on.
                              Accepts TTS props (`speakText`, `speakingKey`, `ttsSupported`) and
                              translation props (`onTranslateExample`, `translatingKey`,
                              `vocabTranslations`). When `showParagraphTools` is true, renders
                              inline TTS (🔊) and EN buttons on each example sentence.
                              EN button fetches on-demand via Google Translate and caches in
                              `reader.vocabTranslations`; falls back to old LLM translations
                              (`exampleStoryTranslation`) for backward compat.
    ComprehensionQuestions    Collapsible question list with interactive answer input and AI grading.
                              Input mode: textarea per question + "Grade My Answers" button (disabled
                              if no API key; shows warning). Results mode: per-question score badge
                              (1–5) + feedback + toggleable suggested answer (always available,
                              collapsed by default via "Show suggested answer" button)
                              + overall score panel. Calls gradeAnswers() from api.js; persists
                              userAnswers + gradingResults into the reader object via act.setReader().
                              State initialised from reader.userAnswers / reader.gradingResults so
                              results survive page reload. Accepts renderChars prop from ReaderView;
                              when set (romanization toggle is on), question text is rendered with
                              <ruby> romanization annotations instead of plain renderInline().
                              Accepts TTS props (`speakText`, `speakingKey`, `ttsSupported`) —
                              renders inline TTS button before each question's EN button when
                              `showParagraphTools` is true. EN button fetches on-demand via
                              Google Translate. Questions are { text, translation } objects
                              (parser extracts trailing parenthesized translations; translation
                              no longer requested from LLM in new readers).
    GrammarNotes              Collapsible section showing 3–5 grammar pattern cards per reader.
                              Accepts `renderChars` prop — applies ruby romanization to `note.pattern`
                              and `note.example` when romanization toggle is on.
                              Each card shows: pattern (Chinese), label (English name),
                              explanation, and an example sentence from the story.
                              Renders nothing if grammarNotes is empty (old readers).
    AnkiExportButton          Shows new/skip counts; triggers download on click.
                              Accepts grammarNotes prop; merges grammar pattern cards
                              into preview counts and export (tagged Grammar).
                              When `verboseVocab` is ON, batch-translates missing example
                              sentences via Google Translate before exporting (async with
                              "Translating…" state). Caches translations back to reader
                              via `onCacheVocabTranslations`.
    LoadingIndicator          Animated ink-wash Chinese characters (读写学文语书)
    GenerationProgress        Timed phase-based progress bar shown during API calls.
                              type='reader': 6 phases (~30s budget); shown in ReaderView
                              type='syllabus': 4 phases (~10s budget); shown in TopicForm
                              Uses setTimeout chain to advance through phases; bar
                              holds at ~97-98% until response arrives and component unmounts.
                              Reads activeProvider from state to show dynamic provider name
                              (e.g. "Connecting to OpenAI…" instead of hardcoded Claude).
    Settings                  Tabbed modal with 4 tabs (Reading default when key
                              exists, AI Provider default for new users):
                              **Reading**: dark mode, romanization, paragraph tools, verbose
                              vocab, reading speed slider (0.5×–2.0×), default HSK/TOPIK/YUE
                              levels, TTS voice selectors.
                              **AI Provider**: provider pills with key-set indicator dots,
                              warning dot when no key configured, collapsible model picker,
                              API key input, base URL for custom.
                              **Sync**: storage usage meter, backup & restore,
                              cloud sync (sign-in + push/pull), save folder picker.
                              **Advanced**: output tokens slider (4096–16384), structured
                              output toggle (opt-in), re-parse cached readers button,
                              danger zone (clear-all data).
                              Sticky header (title + close button stay visible when scrolling).
                              Close button enlarged to 32×32px for easier tap target.
    SyncConflictDialog        Modal shown when local and cloud data differ (e.g., old browser
                              tab with stale localStorage). Displays comparison of cloud vs
                              local data (last updated timestamps, syllabus counts). User
                              chooses which to keep. Prevents accidental overwrite of newer
                              data by stale local state. Triggered on first sync from a device
                              that has never synced before when data differs.
```

## State shape (AppContext)

```js
{
  apiKey:            string,          // derived: providerKeys[activeProvider] (backward compat)
  providerKeys:     { anthropic, openai, gemini, openai_compatible },  // per-provider keys
  activeProvider:   string,           // 'anthropic' | 'openai' | 'gemini' | 'openai_compatible'
  activeModel:      string | null,    // model override, or null for provider default
  customBaseUrl:    string,           // base URL for openai_compatible provider
  customModelName:  string,           // model name for openai_compatible provider
  compatPreset:     string,           // 'deepseek' | 'groq' | 'custom'
  syllabi:           Array<{          // all saved syllabi, newest first
    id:        string,                // "syllabus_<timestamp36>"
    topic:     string,
    level:     number,                // 1–6
    langId:    string,                // 'zh' | 'yue' | 'ko' (defaults to 'zh' for legacy data)
    summary:   string,                // AI-generated 2-3 sentence overview (may be '' for old data)
    lessons:   Array<{ lesson_number, title_zh|title_yue|title_ko, title_en, description, vocabulary_focus }>,
    createdAt: number,
  }>,
  syllabusProgress:  {                // per-syllabus progress, keyed by id
    [syllabusId]: { lessonIndex: number, completedLessons: number[] },
  },
  standaloneReaders: Array<{          // metadata for one-off readers, newest first
    key:           string,            // "standalone_<timestamp>"
    topic:         string,
    level:         number,
    langId:        string,            // 'zh' | 'yue' | 'ko'
    createdAt:     number,
    seriesId?:     string,            // groups continuation chains (parent's key)
    episodeNumber?: number,           // 1-based episode within a series
    isDemo?:       boolean,           // true for the built-in demo reader
  }>,
  generatedReaders:  { [lessonKey]: parsedReaderData },  // in-memory + localStorage + file
                     // parsedReaderData fields: raw, titleZh, titleEn, story, vocabulary[],
                     //   questions[], ankiJson[], grammarNotes[], parseError,
                     //   userAnswers, gradingResults, vocabTranslations, topic, level, langId, lessonKey
  learnedVocabulary: { [targetWord]: { romanization, pinyin, translation, english, langId?, dateAdded,
                       // Forward SRS: interval, ease, nextReview, reviewCount, lapses
                       // Reverse SRS: reverseInterval, reverseEase, reverseNextReview, reverseReviewCount, reverseLapses
                       // exampleSentence (string, from reader vocab)
                     } },
  exportedWords:     Set<string>,     // serialised as array in localStorage + file
  loading:           boolean,
  loadingMessage:    string,
  error:             string | null,
  notification:      { type: 'success'|'error', message } | null,
  // API preferences (persisted to localStorage, not cleared by CLEAR_ALL_DATA)
  maxTokens:         number,          // API output ceiling, default 8192
  defaultLevel:      number,          // Default HSK level for TopicForm, default 3
  defaultTopikLevel: number,          // Default TOPIK level for TopicForm, default 2
  defaultYueLevel:   number,          // Default YUE level for TopicForm, default 2
  ttsKoVoiceURI:     string | null,   // Preferred Korean TTS voice URI, or null
  ttsYueVoiceURI:    string | null,   // Preferred Cantonese TTS voice URI, or null
  ttsSpeechRate:     number,          // TTS speed multiplier (0.5–2.0), default 1.0
  romanizationOn:    boolean,         // Show ruby romanization annotations (persisted, default false)
  verboseVocab:      boolean,         // Include example translations in Anki exports via Google Translate (default false)
  useStructuredOutput: boolean,      // Use provider-native structured output (default false)
  newCardsPerDay:    number,          // Max new flashcards per daily session, default 20
  // Reader eviction tracking (persisted to localStorage)
  evictedReaderKeys: Set<string>,     // lesson keys evicted from localStorage but available in backup
  // Background generation (ephemeral, not persisted)
  pendingReaders:    { [lessonKey]: true },  // keys currently being generated
  // Learning activity log (persisted to localStorage)
  learningActivity:  Array<{ type: string, timestamp: number, ... }>,
  // File storage
  fsInitialized:     boolean,         // true once async FS init completes on mount
  saveFolder:        { name: string } | null,  // active folder name, or null
  fsSupported:       boolean,         // false on Firefox/Safari (no showDirectoryPicker)
  // Cloud sync (ephemeral, not persisted)
  cloudUser:         object | null,   // Supabase User object, or null if not signed in
  cloudSyncing:      boolean,         // push/pull in progress
  cloudLastSynced:   number | null,   // timestamp of last successful push/pull
  lastModified:      number,          // timestamp bumped on every syncable data change
  syncConflict:      { cloudData, conflictInfo } | null, // shown when local/cloud differ
}
```

`activeSyllabusId`, `standaloneKey`, and `syllabusView` ('home'|'lesson') are local UI state in `App.jsx` (not persisted). When `syllabusView === 'home'` and `standaloneKey` is null, `SyllabusHome` is shown instead of `ReaderView`.

Lesson keys: `lesson_<syllabusId>_<lessonIndex>` for syllabus lessons, `standalone_<timestamp>` for one-off readers.

## Multi-language architecture

Language support is implemented via a config registry in `src/lib/languages.js`. Each language config defines: proficiency system (HSK/TOPIK/YUE), script detection regex, font stack, TTS config, romanization loader, decorative characters, and prompt fragments. All API calls, the parser, and the Anki exporter accept `langId` as a parameter.

**Adding a new language:** Add a config object to `languages.js` following the existing `zh`/`yue`/`ko` shape. Install any romanization library needed. Add font import to `index.css` and a `[data-lang="xx"]` override block.

**Migration:** Legacy data (missing `langId`) is automatically normalized to `langId: 'zh'` at hydration via `vocabNormalizer.js`.

## LLM API integration

The app supports multiple LLM providers via a registry in `src/lib/providers.js`. All 4 API functions accept `llmConfig` as the first parameter (built by `buildLLMConfig(state)` from `src/lib/llmConfig.js`) and `langId` as the last parameter (defaults to `'zh'`).

**Providers and endpoints:**

| Provider | Endpoint | Auth | Default Model |
|----------|----------|------|---------------|
| Anthropic | `api.anthropic.com/v1/messages` | `x-api-key` + `anthropic-version` + `anthropic-dangerous-direct-browser-access` | `claude-sonnet-4-20250514` |
| OpenAI | `api.openai.com/v1/chat/completions` | `Authorization: Bearer` | `gpt-4o` |
| Gemini | `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | Key in URL query param | `gemini-2.5-flash` |
| OpenAI-Compatible | Custom `baseUrl` + `/v1/chat/completions` | `Authorization: Bearer` | Depends on preset (DeepSeek: `deepseek-chat`, Groq: `llama-3.3-70b-versatile`) |

**Key architecture:**
- `callLLM(llmConfig, systemPrompt, userMessage, maxTokens)` dispatches to provider-specific functions
- `callLLMStructured(...)` dispatches to structured output variants (Anthropic tool use, OpenAI json_schema, Gemini responseMimeType); OpenAI-compatible falls back to `callLLM`
- All calls use `AbortController` with 60s timeout; `generateReader` accepts an external `signal` for abort-on-unmount
- Shared `fetchWithRetry()` handles exponential backoff (2 retries for 5xx/429)
- Prompt templates are provider-agnostic — built from `langConfig.prompts` fragments
- **Syllabus prompt:** Returns a JSON object `{ summary: string, lessons: [] }` (no markdown fences). Falls back gracefully if the LLM returns a plain array (old format).
- **Reader prompt (text mode):** Returns structured markdown with sections 1–6; section 5 is an ` ```anki-json ``` ` block
- **Reader prompt (structured mode):** Returns JSON matching `READER_JSON_SCHEMA` with fields: `title_target`, `title_en`, `story`, `vocabulary[]`, `questions[]`, `grammar_notes[]`

The `learnedVocabulary` object keys are passed to the LLM in each new reader request so it avoids re-introducing already-covered words.

**Migration:** Existing users with a single `gradedReader_apiKey` in localStorage are auto-migrated to `providerKeys.anthropic` on first load.

## Response parsing (lib/parser.js)

**Regex parser (default):** The LLM's reader response is parsed with regex section matching:
- Sections delimited by `### 1. Title`, `### 2. Story`, `### 3. Vocabulary`, `### 4. Comprehension`, `### 5. Anki`
- If section extraction fails, the component falls back to showing raw text with a "Regenerate" button
- `parseStorySegments()` splits story text into `{ type: 'text'|'bold'|'italic', content }` segments for rendering
- `parseQuestions()` returns `{ text, translation }` objects; extracts trailing parenthesized English translations (e.g. `问题？(Translation?)`) when present in old readers. New readers no longer request question translations from the LLM; translations are fetched on-demand via Google Translate
- Vocabulary items include both canonical fields (`target`, `romanization`, `translation`) and legacy aliases (`chinese`, `pinyin`, `english`) for backward compatibility

**Structured parser (opt-in):** `normalizeStructuredReader(rawJson, langId)` converts structured JSON from provider-native structured output into the same shape as `parseReaderResponse`. Falls back to the regex parser if JSON parsing fails. Vocabulary, questions, and grammar notes are mapped directly from the JSON schema fields.

## Anki export format

Tab-separated columns: `Chinese \t Pinyin \t English \t Examples \t Tags`

Tags format: `HSK<level> <Topic_underscored> <YYYY-MM-DD>`

Filename: `anki_cards_<topic>_HSK<level>_<YYYY-MM-DD>.txt`

UTF-8 BOM prepended for Excel compatibility. Duplicate prevention uses the `exportedWords` Set in state — words already exported are skipped and the count is shown before export.

## Design system

All tokens are CSS custom properties in `src/index.css`:

| Token | Value |
|-------|-------|
| `--color-bg` | `#FAF8F5` (warm off-white) |
| `--color-text` | `#1A1814` (ink black) |
| `--color-accent` | `#4A7C7E` (ink-wash teal) |
| `--font-chinese` | Noto Serif SC → Songti SC → SimSun → serif |
| `--font-target` | `var(--font-chinese)` (overridden by `[data-lang]`) |
| `--font-display` | Cormorant Garamond → Georgia → serif |
| `--text-chinese-body` | 1.25rem (20px) |
| `--leading-chinese` | 1.9 |
| `--leading-target` | `var(--leading-chinese)` (overridden by `[data-lang]`) |

Fonts loaded from Google Fonts (Noto Serif SC + Noto Serif TC + Noto Serif KR + Cormorant Garamond). Layout: two-column on desktop (280px sidebar + flex main), single column with slide-in sidebar on mobile (≤768px).

**Language-specific typography:** `[data-lang="ko"]` on `<html>` overrides `--font-target` to Noto Serif KR and `--leading-target` to 1.8. `[data-lang="yue"]` overrides `--font-target` to Noto Serif TC and `--leading-target` to 1.9. The attribute is set by `ReaderView` based on the reader's `langId`. CSS classes `.text-target` and `.text-target-title` use these tokens; `.text-chinese` is kept as an alias for backwards compatibility.

Dark mode is implemented via `[data-theme="dark"]` on `<html>`. The selector overrides all colour tokens plus `.card` and `.form-input` backgrounds (which use hardcoded `#fff` in light mode). Toggled by `state.darkMode` (persisted to `gradedReader_darkMode` in localStorage); a `useEffect` in `AppProvider` applies/removes the attribute.

## Persistent file storage

App supports opt-in disk persistence via the **File System Access API** (Chrome/Edge only).

**How it works:**
1. User clicks "Choose save folder…" in Settings → `window.showDirectoryPicker()` is called
2. The returned `FileSystemDirectoryHandle` is stored in **IndexedDB** (survives page reload; localStorage can't hold object handles)
3. On startup, `AppContext` loads the handle from IndexedDB, re-verifies permission, reads all JSON files, and hydrates state via `HYDRATE_FROM_FILES`
4. Every write goes to localStorage first (synchronous/fast), then fans out to the corresponding JSON file (async, fire-and-forget)
5. If the browser doesn't support `showDirectoryPicker` (Firefox, Safari), the folder section in Settings shows an informational message

**Write-through pattern in `storage.js`:**
```js
function saveWithFile(lsKey, value, fileKey) {
  save(lsKey, value);          // localStorage always written
  if (_dirHandle && fileKey) {
    writeJSON(_dirHandle, FILES[fileKey], ...)  // file written async
      .catch(e => console.warn(...));
  }
}
```

**Startup flow:**
- `AppContext` mounts → starts async `initFileStorage()`
- While initializing, `App.jsx` renders a loading spinner (`fsInitialized === false`)
- Once done (with or without a folder), `fsInitialized` is set to `true` and normal UI renders

## Cloud sync conflict detection

To prevent stale local data from overwriting newer cloud data (e.g., old browser tab with outdated localStorage), the app implements conflict detection via `detectConflict()` in `cloudSync.js`:

**How it works:**
1. **Hash-based comparison:** Local and cloud data are hashed to detect actual content differences (ignoring timestamp-only changes)
2. **First-sync detection:** If `cloudLastSynced` is `null` (device has never synced before) AND local data differs from cloud, show `SyncConflictDialog`
3. **User choice:** Dialog shows comparison (timestamps, syllabus counts) and lets user choose which data to keep
4. **Safe auto-sync:** If device has synced before (`cloudLastSynced` exists) and data differs, show conflict dialog instead of silently pushing

**Conflict resolution:**
- **Use Cloud Data:** Calls `HYDRATE_FROM_CLOUD` to overwrite local state with cloud data
- **Use Local Data:** Pushes local state to cloud via `pushToCloud()`, overwriting cloud
- **Merge:** Union-merges both sides via `mergeData()`, pushes merged result to cloud
- **Decide Later:** Closes dialog without syncing; user can manually sync via Settings

**Implementation:**
- `detectConflict(localState, cloudData)` returns `null` if data is identical, or a `conflictInfo` object with comparison metadata
- `state.syncConflict` stores `{ cloudData, conflictInfo }` when conflict detected
- `resolveSyncConflict(choice)` in `AppContext` handles user's choice ('cloud', 'local', or 'merge')
- `mergeData(localState, cloudData)` in `cloudSync.js` performs union merge of syllabi, readers, vocabulary, etc.
- `pushMergedToCloud(merged)` pushes the merged result to Supabase

**Auto-push safety guards:**
- `syncPausedRef` blocks auto-push during `clearAllData()` and until next startup sync completes
- Auto-push skips if `cloudLastSynced >= lastModified` (data already in sync, e.g. after merge/pull)
- `clearAllData()` calls `signOut()` before dispatching `CLEAR_ALL_DATA` to prevent empty-state push
- `RESTORE_FROM_BACKUP` does not bump `lastModified` (removed from `DATA_ACTIONS`) to prevent accidental cloud overwrite
- Startup sync preserves local-only readers (e.g. in-flight generation) when hydrating from cloud

## Deployment (Vercel)

The app is hosted at: `https://mandarin-graded-reader.vercel.app` (update when first deployed).

- **No `vercel.json` needed** — Vite is auto-detected by Vercel
- **No code changes needed** — `cloudSync.js` uses `window.location.origin` dynamically, so OAuth redirects work on any domain
- **Required env vars in Vercel dashboard:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Supabase redirect URL:** Add the Vercel production URL to Supabase → Authentication → URL Configuration → Redirect URLs. Without this, Google/Apple OAuth will fail in production.
- **`VITE_ANTHROPIC_API_KEY` is not set** — users enter their own key at runtime

## Testing

**Unit tests (Vitest):** 201 tests across 11 files, colocated with source (`*.test.js`).

```bash
npm test              # run all unit tests
npm run test:watch    # watch mode
npm run test:coverage # with V8 coverage
```

Test files: `parser.test.js` (36), `reducer.test.js` (36), `stats.test.js` (21), `vocabNormalizer.test.js` (21), `storage.test.js` (21), `anki.test.js` (16), `prompts.test.js` (15), `cloudSync.test.js` (11), `llmConfig.test.js` (10), `api.test.js` (8), `providers.test.js` (6).

**E2E tests (Playwright):** 22 tests across 6 spec files in `e2e/`.

```bash
npm run test:e2e      # run all E2E tests
npm run test:e2e:ui   # Playwright UI mode
```

Two projects: Desktop Chrome + iPhone 14 (mobile). Dev server starts automatically.
E2E specs: `demo-reader`, `settings`, `standalone-reader`, `syllabus-flow`, `flashcard`, `mobile`.
API mocking via `page.route()` interception (see `e2e/fixtures/mockApiResponses.js`).
Helpers: `e2e/helpers/appHelpers.js` — `seedLocalStorage()`, `mockLLMApis()`.

**Test infrastructure:**
- `src/test/setup.js` — jest-dom/vitest, localStorage mock, matchMedia mock
- `src/test/fixtures/` — `sampleReaderMarkdown.js`, `sampleState.js`
- `playwright.config.js` — Desktop Chrome + iPhone 14 projects
- Test-only exports: `AppContext.jsx` exports `_baseReducer`, `_reducer`, `_DATA_ACTIONS`
- `api.js` exports `isRetryable` for direct testing

## Known limitations / future work

- **API key security:** Provider keys are in `localStorage` in plain text (never synced to file or cloud). Acceptable for personal use; a backend proxy would be needed for shared deployments.
- **localStorage quota:** ~5MB limit. The Settings page shows usage %. Automatic LRU eviction removes readers older than 30 days when >30 are cached (only if backup exists in cloud or file storage). Evicted readers show a "Restore from backup" button when navigated to.
- **File System Access API:** Only available in Chromium-based browsers (Chrome, Edge). Not supported in Firefox or Safari. Falls back gracefully to localStorage-only mode.
- **Parsing robustness:** The regex parser uses `#{2,4}\s*N\.` to match section headings, tolerating minor formatting variation (2–4 hash marks, any section title text). If section extraction fails entirely, the raw text fallback is shown. `parseVocabularySection` uses two patterns: Pattern A handles `(pinyin)` or `[pinyin]` with any dash/colon separator; Pattern B handles no-bracket format (pinyin backfilled from ankiJson). Any word in the ankiJson block but absent from the vocab section is appended automatically, ensuring all bolded story words are click-to-define. The opt-in structured output mode bypasses regex entirely but is not supported by OpenAI-compatible endpoints.
- **No streaming:** Reader generation can take 15–30s with no partial content shown; only the ink-character animation plays during this time.
- **Mobile:** Uses `viewport-fit=cover` + `env(safe-area-inset-*)` for notch/Dynamic Island support, `100dvh` for iOS Safari viewport height, `pointerdown` (not `mousedown`) for the vocab popover close handler, and body scroll lock when the sidebar overlay is open.
- **Mobile sidebar:** The slide-in animation is handled entirely by the `.app-sidebar` wrapper in `App.css` (toggling `.app-sidebar--open`). `SyllabusPanel.css` must NOT apply its own `position: fixed` / `transform` on mobile — the inner `.syllabus-panel` just fills the wrapper with `width: 100%; height: 100%`.
