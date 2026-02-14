# CLAUDE.md — Mandarin Graded Reader App

Project context and architecture notes for Claude Code sessions.

## What this app does

Single-page React + Vite app that generates Mandarin Chinese graded readers using the Anthropic Claude API. Users provide a topic and HSK level (1–6); the app generates structured stories with vocabulary, comprehension questions, and Anki flashcard exports.

## Running the app

```bash
npm install        # first time only
npm run dev        # starts at http://localhost:5173 (or 5174 if port taken)
npm run build      # production build to dist/
```

No `.env` file is required. On first load the app shows a setup screen prompting the user to enter their Anthropic API key (`sk-ant-...`). The key is stored in `localStorage`.

## Architecture

```
src/
  App.jsx                     Root layout; manages UI-only state (sidebar open,
                              settings modal, standalone reader key, completed lessons)
  App.css                     Two-column layout, mobile header, toast notification
  index.css                   Design system: tokens, reset, shared primitives

  context/
    AppContext.jsx             useReducer-based global store + AppProvider
                              Exports: AppContext, AppProvider, useApp (re-export)
    useApp.js                 useApp hook (separate file — ESLint fast-refresh rule)
    actions.js                actions() helper factory (separate file — same reason)

  lib/
    api.js                    Claude API calls: generateSyllabus(), generateReader()
                              Uses anthropic-dangerous-direct-browser-access header
                              Model: claude-sonnet-4-20250514
    storage.js                localStorage helpers — load/save for all persisted state.
                              Also fans writes to disk when a FileSystemDirectoryHandle
                              is registered via setDirectoryHandle(). API key is NOT
                              synced to file (stays local only).
    fileStorage.js            File System Access API layer. Persists app data as JSON
                              files in a user-chosen folder. Stores the directory handle
                              in IndexedDB (localStorage can't hold object handles).
                              File layout in chosen folder:
                                graded-reader-syllabus.json   (currentSyllabus + lessonIndex)
                                graded-reader-readers.json    (generatedReaders cache)
                                graded-reader-vocabulary.json (learnedVocabulary)
                                graded-reader-exported.json   (exportedWords array)
    parser.js                 Parses Claude's markdown response into structured data:
                              titleZh, titleEn, story, vocabulary[], questions[], ankiJson[]
    anki.js                   Generates tab-separated Anki .txt export; duplicate prevention

  components/
    ApiKeySetup               First-run screen; validates key starts with "sk-ant-"
    TopicForm                 Topic input + HSK selector; two modes: syllabus / standalone
    SyllabusPanel             Left sidebar; lesson list, progress bar, settings link
    ReaderView                Main content area; empty/pre-generate/error/reading states
    VocabularyList            Collapsible accordion of vocab cards with examples
    ComprehensionQuestions    Collapsible question list
    AnkiExportButton          Shows new/skip counts; triggers download on click
    LoadingIndicator          Animated ink-wash Chinese characters (读写学文语书)
    Settings                  API key update, save folder picker, storage usage meter,
                              clear-all data
```

## State shape (AppContext)

```js
{
  apiKey:            string,          // stored in localStorage only (never synced to file)
  currentSyllabus:   { topic, level, lessons: [...] } | null,
  lessonIndex:       number,
  generatedReaders:  { [lessonKey]: parsedReaderData },  // in-memory + localStorage + file
  learnedVocabulary: { [chineseWord]: { pinyin, english, dateAdded } },
  exportedWords:     Set<string>,     // serialised as array in localStorage + file
  loading:           boolean,
  loadingMessage:    string,
  error:             string | null,
  notification:      { type: 'success'|'error', message } | null,
  // File storage
  fsInitialized:     boolean,         // true once async FS init completes on mount
  saveFolder:        { name: string } | null,  // active folder name, or null
  fsSupported:       boolean,         // false on Firefox/Safari (no showDirectoryPicker)
}
```

Lesson keys follow the pattern `lesson_<topic>_<level>_<index>` for syllabus lessons and `standalone_<timestamp>` for one-off readers.

## Claude API integration

- **Model:** `claude-sonnet-4-20250514`
- **Endpoint:** `POST https://api.anthropic.com/v1/messages`
- **Required browser header:** `anthropic-dangerous-direct-browser-access: true`
- **Syllabus prompt:** Returns a JSON array of 6 lesson objects (no markdown fences)
- **Reader prompt:** Returns structured markdown with sections 1–5; section 5 is an ` ```anki-json ``` ` block

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
| `--font-display` | Cormorant Garamond → Georgia → serif |
| `--text-chinese-body` | 1.25rem (20px) |
| `--leading-chinese` | 1.9 |

Fonts loaded from Google Fonts. Layout: two-column on desktop (280px sidebar + flex main), single column with slide-in sidebar on mobile (≤768px).

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

## Known limitations / future work

- **API key security:** Key is in `localStorage` in plain text. Acceptable for personal use; a backend proxy would be needed for shared deployments.
- **localStorage quota:** ~5MB limit. The Settings page shows usage %. If many long readers are cached, old ones may need to be cleared manually.
- **File System Access API:** Only available in Chromium-based browsers (Chrome, Edge). Not supported in Firefox or Safari. Falls back gracefully to localStorage-only mode.
- **Parsing robustness:** The regex parser relies on Claude following the exact `### N. Section` format. If Claude deviates, the raw text fallback is shown.
- **No streaming:** Reader generation can take 15–30s with no partial content shown; only the ink-character animation plays during this time.
