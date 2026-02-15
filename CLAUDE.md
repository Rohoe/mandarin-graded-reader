# CLAUDE.md — Multi-Language Graded Reader App

Project context and architecture notes for Claude Code sessions.

## What this app does

Single-page React + Vite app that generates graded readers in **Mandarin Chinese** and **Korean** using the Anthropic Claude API. Users select a language and proficiency level (HSK 1–6 for Chinese, TOPIK 1–6 for Korean); the app generates structured stories with vocabulary, comprehension questions, and Anki flashcard exports. Chinese and Korean content can coexist side-by-side.

## Running the app

```bash
npm install        # first time only
npm run dev        # starts at http://localhost:5173 (or 5174 if port taken)
npm run build      # production build to dist/
```

No `.env` file is required for basic use. On first load the app shows a setup screen prompting the user to enter their Anthropic API key (`sk-ant-...`). The key is stored in `localStorage`. For cloud sync, a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` is needed (see README for setup).

## Architecture

```
src/
  App.jsx                     Root layout; manages UI-only state (sidebar open,
                              settings modal, activeSyllabusId, standaloneKey,
                              syllabusView 'home'|'lesson')
  App.css                     Two-column layout, mobile header, toast notification
  index.css                   Design system: tokens, reset, shared primitives

  context/
    AppContext.jsx             useReducer-based global store + AppProvider
                              Exports: AppContext, AppProvider, useApp (re-export)
    useApp.js                 useApp hook (separate file — ESLint fast-refresh rule)
    actions.js                actions() helper factory (separate file — same reason)

  lib/
    languages.js              Language config registry. Exports getLang(id), getAllLanguages(),
                              DEFAULT_LANG_ID. Each language is a static object defining:
                              proficiency levels, scriptRegex, fonts, TTS config, prompt
                              fragments, decorative chars, romanization loader. Currently
                              supports 'zh' (Mandarin Chinese) and 'ko' (Korean).
    romanizer.js              Async romanization loader. Lazy-loads pinyin-pro (Chinese) or
                              hangul-romanization (Korean) via the language config's
                              getRomanizer() method. Returns { romanize(text): string[] }.
    vocabNormalizer.js        Migration helpers: normalizeSyllabus() adds langId + title_target
                              to legacy data. normalizeVocabWord() maps chinese/pinyin/english
                              ↔ generic target/romanization/translation fields.
    api.js                    Claude API calls: generateSyllabus(), generateReader(),
                              extendSyllabus(), gradeAnswers(). All accept optional langId
                              (last param, defaults to 'zh'). Prompt templates are built
                              from langConfig.prompts fragments — highly specific per language.
                              Uses anthropic-dangerous-direct-browser-access header.
                              Model: claude-sonnet-4-20250514
    storage.js                localStorage helpers — load/save for all persisted state.
                              Also fans writes to disk when a FileSystemDirectoryHandle
                              is registered via setDirectoryHandle(). API key is NOT
                              synced to file (stays local only).
    fileStorage.js            File System Access API layer. Persists app data as JSON
                              files in a user-chosen folder. Stores the directory handle
                              in IndexedDB (localStorage can't hold object handles).
                              File layout in chosen folder:
                                graded-reader-syllabi.json    (syllabi + syllabusProgress + standaloneReaders)
                                graded-reader-readers.json    (generatedReaders cache)
                                graded-reader-vocabulary.json (learnedVocabulary)
                                graded-reader-exported.json   (exportedWords array)
    parser.js                 Parses Claude's markdown response into structured data:
                              titleZh, titleEn, story, vocabulary[], questions[], ankiJson[],
                              grammarNotes[]. Accepts langId param — uses langConfig.scriptRegex
                              and langConfig.fields for language-aware parsing.
    anki.js                   Generates tab-separated Anki .txt export; duplicate prevention.
                              Accepts langId — uses langConfig.fields for column mapping and
                              langConfig.proficiency.name for tags/filename.
    supabase.js               Supabase client singleton (reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    cloudSync.js              Cloud sync helpers: signInWithGoogle(), signInWithApple(), signOut(),
                              pushToCloud(state), pullFromCloud(). Auth uses Supabase OAuth with
                              redirectTo: window.location.origin. pushToCloud upserts all syncable
                              state to user_data table; pullFromCloud returns the row or null
                              (PGRST116 = no row, not an error).

  components/
    ApiKeySetup               First-run screen; validates key starts with "sk-ant-"
    TopicForm                 Topic input + language selector (pill toggle: 中文 / 한국어)
                              + proficiency level pills (read from langConfig). Two modes:
                              syllabus / standalone. Sliders: lesson count (2–12, syllabus
                              mode only) and reader length (500–2000 chars, step 100).
                              Passes langId through to all API calls and reader creation.
                              Hint text below disabled Generate button when topic is empty.
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
    SyllabusHome              Overview page for a syllabus (shown when syllabusView='home').
                              Displays: topic, HSK badge, date, AI-generated summary, lesson
                              list with completion status and Start/Review CTAs, Continue
                              button, and a danger-zone Delete Syllabus button with inline
                              confirmation. Located at components/SyllabusHome/index.jsx.
                              "Add more lessons" collapsible panel: slider 2–6, Generate button
                              calls onExtend(additionalCount). Shows a fixed LoadingIndicator
                              overlay while state.loading is true.
    ReaderView                Main content area; empty/pre-generate/error/reading states.
                              Determines langId from reader.langId || lessonMeta.langId.
                              Sets data-lang attribute on <html> for CSS font overrides.
                              Empty state cycles through langConfig.decorativeChars every 2s;
                              dark mode override uses --color-accent at 0.45 opacity.
                              Shows "☰ Open menu" button (mobile-only, hidden on desktop
                              via CSS) that calls onOpenSidebar prop to open the sidebar.
                              Section order: story → comprehension questions → vocabulary
                              → grammar notes → Anki export.
                              "Next episode →" button at the bottom calls onContinueStory with
                              the current story text, topic, level, and langId.
                              Reader controls (romanization toggle + 🔊 TTS) sit as icon-only
                              buttons in the article header top-right. An IntersectionObserver
                              on the header detects when it scrolls off screen; buttons then
                              render via createPortal to document.body as a fixed floating
                              pill (needed because the fadeIn animation's transform creates
                              a containing block that breaks position:fixed).
                              Text-to-speech: 🔊 icon reads full story; each paragraph
                              is clickable to read individually (highlighted while speaking).
                              Voices loaded via Web Speech API voiceschanged event; filtered
                              by langConfig.tts.langFilter; best voice selected via
                              langConfig.tts.priorityVoices.
                              Romanization toggle: uses async romanizer loaded via
                              loadRomanizer(langId). Label from langConfig.romanizationLabel
                              (拼 for Chinese, Aa for Korean). Wraps chars in <ruby> tags.
                              renderChars() uses langConfig.scriptRegex for detection.
                              Click-to-define: bold vocab words are clickable (looked up via
                              vocabMap). Click shows a fixed-position popover with romanization
                              + definition. Closes on Escape, outside click, or scroll.
    VocabularyList            Collapsible accordion of vocab cards with examples
    ComprehensionQuestions    Collapsible question list with interactive answer input and AI grading.
                              Input mode: textarea per question + "Grade My Answers" button.
                              Results mode: per-question score badge (1–5) + feedback + optional
                              suggested answer (shown when score < 5/5) + overall score panel.
                              Calls gradeAnswers() from api.js; persists userAnswers + gradingResults
                              into the reader object via act.setReader(). State initialised from
                              reader.userAnswers / reader.gradingResults so results survive page reload.
    GrammarNotes              Collapsible section showing 3–5 grammar pattern cards per reader.
                              Each card shows: pattern (Chinese), label (English name),
                              explanation, and an example sentence from the story.
                              Renders nothing if grammarNotes is empty (old readers).
    AnkiExportButton          Shows new/skip counts; triggers download on click.
                              Accepts grammarNotes prop; merges grammar pattern cards
                              into preview counts and export (tagged Grammar).
    LoadingIndicator          Animated ink-wash Chinese characters (读写学文语书)
    GenerationProgress        Timed phase-based progress bar shown during API calls.
                              type='reader': 6 phases (~30s budget); shown in ReaderView
                              type='syllabus': 4 phases (~10s budget); shown in TopicForm
                              Uses setTimeout chain to advance through phases; bar
                              holds at ~97-98% until response arrives and component unmounts
    Settings                  API key update, dark mode toggle, default HSK level select,
                              save folder picker, API output tokens slider (4096–16384,
                              persisted to localStorage), storage usage meter, clear-all data.
                              Sticky header (title + close button stay visible when scrolling).
                              Close button enlarged to 32×32px for easier tap target.
```

## State shape (AppContext)

```js
{
  apiKey:            string,          // stored in localStorage only (never synced to file)
  syllabi:           Array<{          // all saved syllabi, newest first
    id:        string,                // "syllabus_<timestamp36>"
    topic:     string,
    level:     number,                // 1–6
    langId:    string,                // 'zh' | 'ko' (defaults to 'zh' for legacy data)
    summary:   string,                // AI-generated 2-3 sentence overview (may be '' for old data)
    lessons:   Array<{ lesson_number, title_zh, title_en, description, vocabulary_focus }>,
    createdAt: number,
  }>,
  syllabusProgress:  {                // per-syllabus progress, keyed by id
    [syllabusId]: { lessonIndex: number, completedLessons: number[] },
  },
  standaloneReaders: Array<{          // metadata for one-off readers, newest first
    key:       string,                // "standalone_<timestamp>"
    topic:     string,
    level:     number,
    langId:    string,                // 'zh' | 'ko'
    createdAt: number,
  }>,
  generatedReaders:  { [lessonKey]: parsedReaderData },  // in-memory + localStorage + file
                     // parsedReaderData fields: raw, titleZh, titleEn, story, vocabulary[],
                     //   questions[], ankiJson[], grammarNotes[], parseError,
                     //   userAnswers, gradingResults, topic, level, langId, lessonKey
  learnedVocabulary: { [targetWord]: { pinyin, english, langId?, dateAdded } },
  exportedWords:     Set<string>,     // serialised as array in localStorage + file
  loading:           boolean,
  loadingMessage:    string,
  error:             string | null,
  notification:      { type: 'success'|'error', message } | null,
  // API preferences (persisted to localStorage, not cleared by CLEAR_ALL_DATA)
  maxTokens:         number,          // API output ceiling, default 8192
  defaultLevel:      number,          // Default HSK level for TopicForm, default 3
  // Background generation (ephemeral, not persisted)
  pendingReaders:    { [lessonKey]: true },  // keys currently being generated
  // File storage
  fsInitialized:     boolean,         // true once async FS init completes on mount
  saveFolder:        { name: string } | null,  // active folder name, or null
  fsSupported:       boolean,         // false on Firefox/Safari (no showDirectoryPicker)
  // Cloud sync (ephemeral, not persisted)
  cloudUser:         object | null,   // Supabase User object, or null if not signed in
  cloudSyncing:      boolean,         // push/pull in progress
}
```

`activeSyllabusId`, `standaloneKey`, and `syllabusView` ('home'|'lesson') are local UI state in `App.jsx` (not persisted). When `syllabusView === 'home'` and `standaloneKey` is null, `SyllabusHome` is shown instead of `ReaderView`.

Lesson keys: `lesson_<syllabusId>_<lessonIndex>` for syllabus lessons, `standalone_<timestamp>` for one-off readers.

## Multi-language architecture

Language support is implemented via a config registry in `src/lib/languages.js`. Each language config defines: proficiency system (HSK/TOPIK), script detection regex, font stack, TTS config, romanization loader, decorative characters, and prompt fragments. All API calls, the parser, and the Anki exporter accept `langId` as a parameter.

**Adding a new language:** Add a config object to `languages.js` following the existing `zh`/`ko` shape. Install any romanization library needed. Add font import to `index.css` and a `[data-lang="xx"]` override block.

**Migration:** Legacy data (missing `langId`) is automatically normalized to `langId: 'zh'` at hydration via `vocabNormalizer.js`.

## Claude API integration

- **Model:** `claude-sonnet-4-20250514`
- **Endpoint:** `POST https://api.anthropic.com/v1/messages`
- **Required browser header:** `anthropic-dangerous-direct-browser-access: true`
- **All 4 API functions** (`generateSyllabus`, `generateReader`, `extendSyllabus`, `gradeAnswers`) accept `langId` as the last parameter (defaults to `'zh'`). Prompt templates are built from `langConfig.prompts` fragments.
- **Syllabus prompt:** Returns a JSON object `{ summary: string, lessons: [] }` (no markdown fences). Falls back gracefully if Claude returns a plain array (old format).
- **Reader prompt:** Returns structured markdown with sections 1–6; section 5 is an ` ```anki-json ``` ` block

The `learnedVocabulary` object keys are passed to Claude in each new reader request so it avoids re-introducing already-covered words.

## Response parsing (lib/parser.js)

Claude's reader response is parsed with regex section matching:
- Sections delimited by `### 1. Title`, `### 2. Story`, `### 3. Vocabulary`, `### 4. Comprehension`, `### 5. Anki`
- If section extraction fails, the component falls back to showing raw text with a "Regenerate" button
- `parseStorySegments()` splits story text into `{ type: 'text'|'bold'|'italic', content }` segments for rendering

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

Fonts loaded from Google Fonts (Noto Serif SC + Noto Serif KR + Cormorant Garamond). Layout: two-column on desktop (280px sidebar + flex main), single column with slide-in sidebar on mobile (≤768px).

**Language-specific typography:** `[data-lang="ko"]` on `<html>` overrides `--font-target` to Noto Serif KR and `--leading-target` to 1.8. The attribute is set by `ReaderView` based on the reader's `langId`. CSS classes `.text-target` and `.text-target-title` use these tokens; `.text-chinese` is kept as an alias for backwards compatibility.

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

## Deployment (Vercel)

The app is hosted at: `https://mandarin-graded-reader.vercel.app` (update when first deployed).

- **No `vercel.json` needed** — Vite is auto-detected by Vercel
- **No code changes needed** — `cloudSync.js` uses `window.location.origin` dynamically, so OAuth redirects work on any domain
- **Required env vars in Vercel dashboard:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Supabase redirect URL:** Add the Vercel production URL to Supabase → Authentication → URL Configuration → Redirect URLs. Without this, Google/Apple OAuth will fail in production.
- **`VITE_ANTHROPIC_API_KEY` is not set** — users enter their own key at runtime

## Known limitations / future work

- **API key security:** Key is in `localStorage` in plain text. Acceptable for personal use; a backend proxy would be needed for shared deployments.
- **localStorage quota:** ~5MB limit. The Settings page shows usage %. If many long readers are cached, old ones may need to be cleared manually.
- **File System Access API:** Only available in Chromium-based browsers (Chrome, Edge). Not supported in Firefox or Safari. Falls back gracefully to localStorage-only mode.
- **Parsing robustness:** The regex parser uses `#{2,4}\s*N\.` to match section headings, tolerating minor formatting variation (2–4 hash marks, any section title text). If section extraction fails entirely, the raw text fallback is shown. `parseVocabularySection` uses two patterns: Pattern A handles `(pinyin)` or `[pinyin]` with any dash/colon separator; Pattern B handles no-bracket format (pinyin backfilled from ankiJson). Any word in the ankiJson block but absent from the vocab section is appended automatically, ensuring all bolded story words are click-to-define.
- **No streaming:** Reader generation can take 15–30s with no partial content shown; only the ink-character animation plays during this time.
- **Mobile:** Uses `viewport-fit=cover` + `env(safe-area-inset-*)` for notch/Dynamic Island support, `100dvh` for iOS Safari viewport height, `pointerdown` (not `mousedown`) for the vocab popover close handler, and body scroll lock when the sidebar overlay is open.
- **Mobile sidebar:** The slide-in animation is handled entirely by the `.app-sidebar` wrapper in `App.css` (toggling `.app-sidebar--open`). `SyllabusPanel.css` must NOT apply its own `position: fixed` / `transform` on mobile — the inner `.syllabus-panel` just fills the wrapper with `width: 100%; height: 100%`.
