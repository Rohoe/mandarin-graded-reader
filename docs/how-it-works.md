# How the Graded Reader App Works

*Last updated: 2026-02-26 · Commit: 5a4b58e*

A guided tour of the codebase for someone with a CS background but rusty on modern web dev.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [The Tech Stack (and Why)](#the-tech-stack)
3. [How the App Starts Up](#how-the-app-starts-up)
4. [The Component Tree — What's on Screen](#the-component-tree)
5. [State Management — The Brain of the App](#state-management)
6. [The Main User Flow: Generating a Reader](#generating-a-reader)
7. [How LLM Calls Work](#how-llm-calls-work)
8. [Parsing the LLM Response](#parsing-the-llm-response)
9. [Storage — Where Data Lives](#storage)
10. [The Language System](#the-language-system)
11. [Supporting Features](#supporting-features)
12. [Key Patterns to Know](#key-patterns)

---

## The Big Picture <a id="the-big-picture"></a>

This is a **single-page web app** (no page navigation — everything happens on one HTML page). The user:

1. Picks a language (Mandarin Chinese, Cantonese, or Korean) and proficiency level
2. Enters a topic (like "ordering food at a restaurant")
3. The app calls an AI language model (ChatGPT, Claude, Gemini, etc.) with a carefully constructed prompt
4. The AI generates a graded reading passage with vocabulary, grammar notes, and comprehension questions
5. The user reads the story, clicks words for definitions, listens to pronunciation, and answers questions
6. Vocabulary gets tracked over time and can be exported to Anki (a flashcard app)

Think of it as: **User Input → AI Prompt → AI Response → Parse into structured data → Display interactively**.

---

## The Tech Stack <a id="the-tech-stack"></a>

| Tool | What it does | Analogy |
|------|-------------|---------|
| **React** | UI library — builds the interface from reusable components | Like building with LEGO bricks, each component is a brick |
| **Vite** | Dev server + build tool — bundles your code for the browser | Like a compiler, but for web apps |
| **JavaScript (JSX)** | The language everything is written in. JSX lets you write HTML-like syntax inside JS | Think of JSX as a template language embedded in JS |
| **CSS Custom Properties** | Design tokens (colors, fonts, spacing) defined once, used everywhere | Like constants/variables but for styling |
| **localStorage** | Browser-built-in key-value storage | Like a simple database that lives in your browser |
| **Supabase** | Cloud database (optional) for syncing across devices | Like Firebase — a hosted database with auth |
| **Vitest / Playwright** | Unit testing / end-to-end browser testing | JUnit-style tests + automated browser clicking |

There's **no backend server** — the app runs entirely in the browser. API calls go directly from the browser to the AI provider (Anthropic, OpenAI, etc.).

---

## How the App Starts Up <a id="how-the-app-starts-up"></a>

```
index.html
  └─ loads main.jsx
       └─ renders <App />
            └─ <AppProvider>        ← sets up global state (reads from localStorage)
                 └─ <AppShell />    ← the actual visible UI
```

**`main.jsx`** is the entry point. It does one thing: mount the React app into the page.

**`App.jsx`** is the root component. It wraps everything in `AppProvider` (the state container) and manages navigation-like state: which syllabus is selected, which view is showing.

**`AppContext.jsx`** (`src/context/`) creates the global state store. On startup, it reads all saved data from localStorage — your syllabi, generated readers, vocabulary, settings — so the app picks up where you left off.

---

## The Component Tree — What's on Screen <a id="the-component-tree"></a>

The visual layout is a two-column design:

```
┌──────────────────────────────────────────────────┐
│                    App Shell                      │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Sidebar   │         Main Content Area           │
│  (280px)   │                                     │
│            │   ┌─────────────────────────────┐   │
│ • Syllabi  │   │  SyllabusHome (lesson grid)  │   │
│ • Readers  │   │       — or —                 │   │
│ • Search   │   │  ReaderView (story + vocab)  │   │
│            │   └─────────────────────────────┘   │
│            │                                     │
│ ────────── │                                     │
│ Settings ⚙ │                                     │
│ Stats 📊   │                                     │
└────────────┴─────────────────────────────────────┘
```

**Key components** (in `src/components/`):

- **`SyllabusPanel.jsx`** — The left sidebar. Lists your courses (syllabi) and standalone readers. Each syllabus expands to show its lessons.
- **`SyllabusHome.jsx`** — When you click a syllabus, this shows the lesson grid with progress tracking.
- **`ReaderView.jsx`** — The main reading experience. This is the most complex component — it orchestrates story display, vocabulary popovers, TTS (text-to-speech), comprehension questions, and Anki export.
- **`TopicForm.jsx`** — The "New Reader" modal. Lets you pick language, level, and topic.
- **`Settings.jsx`** — Tabbed settings modal (AI provider config, reading preferences, sync).

**How components talk to each other:**

Components don't pass data directly between siblings. Instead, they all read from and write to the **global state store** (AppContext). When one component updates the state, any other component watching that piece of state automatically re-renders.

---

## State Management — The Brain of the App <a id="state-management"></a>

### The Concept

Imagine all of the app's data in one big JavaScript object:

```js
{
  // What AI provider to use
  activeProvider: 'anthropic',
  providerKeys: { anthropic: 'sk-...', openai: null, ... },

  // Your courses
  syllabi: [
    { id: 'abc', topic: 'Travel', level: 'HSK3', langId: 'zh', lessons: [...] }
  ],

  // Generated reading passages (keyed by lesson)
  generatedReaders: {
    'lesson_abc_0': { story: '...', vocabulary: [...], questions: [...] },
    'standalone_170000': { ... }
  },

  // Words you've learned
  learnedVocabulary: {
    '你好': { translation: 'hello', romanization: 'nǐ hǎo', ... }
  },

  // UI preferences
  darkMode: false,
  romanizationOn: true,
  // ... and more
}
```

### The Pattern: useReducer

This app uses React's **useReducer** — a pattern borrowed from Redux. Here's the mental model:

```
Current State  +  Action  →  Reducer Function  →  New State
```

1. Something happens (user clicks "Generate", toggles dark mode, etc.)
2. The component calls `dispatch({ type: 'SET_DARK_MODE', payload: true })`
3. The **reducer** (a big switch statement) sees the action type and returns a new state object with that change applied
4. React re-renders any component that depends on the changed data

The reducer is a **pure function** — given the same state and action, it always returns the same result. No side effects, no API calls, no saving to disk. This makes it predictable and testable.

**Where side effects happen:**

- **`usePersistence.js`** — A hook that watches for state changes and saves them to localStorage. It runs *after* the reducer, as a React effect.
- **`AppContext.jsx`** — Watches `lastModified` and debounce-pushes changes to the cloud (Supabase) 3 seconds after the last change.

### How Components Read State: useAppSelector

Instead of every component getting the *entire* state object (which would cause everything to re-render on any change), components use `useAppSelector`:

```js
// Only re-renders when darkMode changes, ignores everything else
const darkMode = useAppSelector(s => s.darkMode);

// Only re-renders when this specific reader changes
const reader = useAppSelector(s => s.generatedReaders[lessonKey]);
```

This is a performance optimization. Under the hood it uses `useSyncExternalStore` — a React API that lets you subscribe to specific slices of external state.

---

## The Main User Flow: Generating a Reader <a id="generating-a-reader"></a>

Let's trace what happens when a user generates a new reading passage:

### Step 1: User fills out the form (TopicForm.jsx)

They pick a language, level, and topic. Hit "Generate".

### Step 2: Optimistic UI update

The app immediately:
- Creates an entry in the sidebar (so it looks like something is happening)
- Navigates to the reader view
- Shows a loading/streaming indicator

The reader doesn't exist yet — we're being optimistic that it will succeed.

### Step 3: Build the LLM prompt (src/prompts/)

The app constructs a detailed system prompt that tells the AI exactly what to generate:

```
"You are a language learning content creator. Generate a graded reader
for HSK 3 level Mandarin Chinese about 'ordering food at a restaurant'.

The story should be 300-500 characters. Use vocabulary appropriate for
HSK 3. Format your response with these sections:
## 1. Title
## 2. Story
## 3. Vocabulary List
## 4. Comprehension Questions
## 5. Anki Cards Data (JSON)
## 6. Grammar Notes"
```

The prompt includes language-specific rules (character counts, romanization format, level-appropriate grammar patterns) pulled from the language config in `languages.js`.

### Step 4: Call the AI API (src/lib/api.js)

`callLLM()` dispatches the request to the appropriate provider:

```
callLLM(config, systemPrompt, userMessage)
  → if provider is 'anthropic': POST to api.anthropic.com/v1/messages
  → if provider is 'openai':    POST to api.openai.com/v1/chat/completions
  → if provider is 'gemini':    POST to googleapis.com/.../generateContent
```

For Anthropic, the app supports **streaming** — the response arrives word-by-word and is displayed in real-time (like watching ChatGPT type).

### Step 5: Parse the response (src/lib/parser.js)

The AI returns a big block of markdown text. `parseReaderResponse()` uses regex patterns to extract structured data from it:

```
Raw markdown text
  → Extract title (Chinese + English)
  → Extract story body
  → Extract vocabulary items (word | romanization | meaning)
  → Extract comprehension questions
  → Extract Anki JSON data
  → Extract grammar notes
  → Return structured object
```

This is the most fragile part of the system — LLMs don't always follow the format perfectly. The parser has fallback patterns and produces `parseWarnings` when sections don't parse cleanly.

### Step 6: Save and display

The parsed reader object is dispatched to the store (`SET_READER` action), which:
1. Updates `generatedReaders[lessonKey]` in state
2. Triggers `usePersistence` to save to localStorage
3. Triggers cloud sync (if enabled)
4. `ReaderView` re-renders with the new data

---

## How LLM Calls Work <a id="how-llm-calls-work"></a>

### The Provider System (src/lib/providers.js)

The app supports four LLM providers, configured as a **registry**:

```js
const PROVIDERS = {
  anthropic: {
    name: 'Anthropic (Claude)',
    models: ['claude-sonnet-4-20250514', ...],
    defaultModel: 'claude-sonnet-4-20250514',
  },
  openai: { ... },
  gemini: { ... },
  openai_compatible: { ... },  // any API that speaks OpenAI's format
};
```

Adding a new provider means adding one entry here and one `case` in `callLLM()`.

### Config Resolution (src/lib/llmConfig.js)

`buildLLMConfig(state)` reads the user's current settings and produces a clean config:

```js
{ provider: 'anthropic', apiKey: 'sk-...', model: 'claude-sonnet-4-20250514', baseUrl: null }
```

### Error Handling

- **Retry with backoff**: 5xx errors and rate limits (429) are retried up to 2 times with exponential backoff
- **Timeout**: Every request has a 5-minute abort timer
- **CORS proxy**: Anthropic calls go through a CORS proxy (`corsproxy.io`) because browsers block direct API calls to `api.anthropic.com`

### Streaming (Anthropic only)

`generateReaderStream()` returns an **async generator** — a function that yields values over time:

```js
async function* generateReaderStream(config, prompt, message) {
  const response = await fetch(url, { ... });
  const reader = response.body.getReader();
  // Read Server-Sent Events (SSE) chunks
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Parse SSE data, extract text deltas
    yield textChunk;  // "yields" each piece of text as it arrives
  }
}
```

The `useReaderGeneration` hook consumes this generator and updates `streamingText` state on each chunk, so the UI updates in real-time.

---

## Parsing the LLM Response <a id="parsing-the-llm-response"></a>

### The Regex Parser (src/lib/parser.js)

The AI is instructed to format its response with markdown headings. The parser looks for these headings and extracts content between them:

```
## 1. Title          → captures Chinese title + English title
## 2. Story          → captures story body (everything until next heading)
## 3. Vocabulary     → captures word|pinyin|meaning rows
## 4. Questions      → captures numbered questions with answer options
## 5. Anki Cards     → captures JSON array for flashcard export
## 6. Grammar Notes  → captures grammar pattern explanations
```

Each section has a primary regex and 1-2 fallback patterns for when the AI formats things slightly differently.

### Structured Output (Optional)

Instead of parsing markdown, the app can ask the AI to return JSON directly using provider-specific features (Anthropic's tool-use, OpenAI's `response_format`, Gemini's `responseSchema`). The `normalizeStructuredReader()` function maps this JSON to the same shape as the regex parser output.

---

## Storage — Where Data Lives <a id="storage"></a>

Data is persisted in up to three places, layered like a cake:

### Layer 1: localStorage (always on)

Every piece of state has a localStorage key:

```
gradedReader_syllabi          → JSON array of syllabi
gradedReader_reader_lesson_abc_0  → JSON for one reader
gradedReader_readerIndex      → list of all reader keys
gradedReader_learnedVocabulary → all learned words
gradedReader_darkMode         → true/false
... etc.
```

`usePersistence.js` watches for state changes and writes them reactively. On app startup, `buildInitialState()` reads everything back.

Individual readers are stored as separate keys (not one giant blob) so we don't hit localStorage size limits.

### Layer 2: File System Access API (Chrome, opt-in)

Chrome has an API that lets web apps read/write to a folder on your actual hard drive (with permission). The app can:
- Save all data as JSON files in a folder you choose
- Read them back on startup
- "Evict" old readers from localStorage (to save space) knowing they're safe on disk

The directory handle is stored in IndexedDB (another browser storage mechanism) so it persists across sessions.

### Layer 3: Supabase Cloud Sync (opt-in)

If you sign in with Google/Apple, data syncs to a Supabase (PostgreSQL) database:

- **Push**: 3 seconds after any state change, the app pushes to the cloud
- **Pull**: On startup, the app pulls cloud data and merges it with local data
- **Conflict resolution**: If both local and cloud have changes, the app auto-merges (taking the union of syllabi/readers and keeping the most recent version of each)
- **Undo**: Before any merge, a "pre-merge snapshot" is saved so you can undo if something goes wrong

---

## The Language System <a id="the-language-system"></a>

### Language Config Registry (src/lib/languages.js)

Each language is a config object:

```js
{
  id: 'zh',
  name: 'Mandarin Chinese',
  levels: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'],
  scriptRegex: /[\u4e00-\u9fff]/,        // regex matching Chinese characters
  fonts: { target: 'Noto Sans SC, ...' },
  tts: { lang: 'zh-CN', ... },
  prompts: {
    storyLength: '300-500 characters',
    vocabFormat: 'word | pinyin | meaning',
    // ... lots more language-specific prompt fragments
  },
}
```

All language-specific behavior is driven by this config. Functions throughout the codebase call `getLang(langId)` to get the right config. This means:

- **Adding a new language** = adding one config object + any needed romanization support
- **No if/else chains** scattered around the code for language differences

### Romanization (src/lib/romanizer.js)

Each language has its own romanization system (pronunciation guide):
- Mandarin: **Pinyin** (你好 → nǐ hǎo) via `pinyin-pro` library
- Cantonese: **Jyutping** (你好 → nei5 hou2) via `to-jyutping`
- Korean: **Romanization** (안녕 → annyeong) via `hangul-romanization`

These libraries are **lazy-loaded** — they're not downloaded until the user actually needs romanization for that language. This keeps the initial page load fast.

---

## Supporting Features <a id="supporting-features"></a>

### Text-to-Speech (src/hooks/useTTS.js)

Uses the browser's built-in Web Speech API. The hook:
1. Finds available voices for the current language
2. Lets the user pick a preferred voice in Settings
3. Provides `speak(text)` and `stop()` functions

### Vocabulary Tracking

When you mark a lesson as complete, its vocabulary is added to `learnedVocabulary`. This serves two purposes:
1. **SRS Flashcards**: Words get spaced repetition scheduling (due dates, intervals, ease factors)
2. **Smarter generation**: Previously learned words are included in future prompts so the AI doesn't re-teach them

### Anki Export (src/lib/anki.js, ankiApkg.js)

Vocabulary can be exported in two formats:
1. **Tab-delimited text** — simple copy-paste into Anki
2. **`.apkg` file** — a proper Anki package (using sql.js to build the SQLite database Anki expects, then compressed with fflate)

The export only includes "new" cards (words not previously exported) to avoid duplicates.

### Comprehension Grading (src/lib/api.js)

After answering comprehension questions, the user can have the AI grade their answers. This makes a separate LLM call with the story, questions, correct answers, and user's answers. The AI returns feedback for each question.

---

## Key Patterns to Know <a id="key-patterns"></a>

### 1. Config Registries

Both languages and providers use the same pattern: a plain object where each key maps to a config. Functions look up the right config by ID. This is the [Strategy Pattern](https://en.wikipedia.org/wiki/Strategy_pattern) — swap behavior by swapping config, not by writing conditionals.

### 2. Pure Reducer + Side Effects in Hooks

The reducer is pure (no side effects). All I/O (saving, syncing, API calls) happens in hooks and effects that *react* to state changes. This separation makes the reducer easy to test and reason about.

### 3. Optimistic UI

When generating a reader, the UI updates immediately (shows loading state, adds sidebar entry) before the API call completes. This makes the app feel responsive even though the AI call takes 10-30 seconds.

### 4. Custom Hooks for Complex Logic

Complex behaviors are extracted into hooks (files in `src/hooks/`):
- `useReaderGeneration` — generation + streaming + parsing lifecycle
- `useRomanization` — lazy-loading romanizers, rendering ruby text
- `useTTS` — voice selection and playback
- `useVocabPopover` — click-on-word interaction

Each hook encapsulates one concern. Components compose multiple hooks to build the full experience.

### 5. Lazy Loading

Heavy libraries (romanization, SQL.js for Anki) are loaded with dynamic `import()` — they're only downloaded when actually needed. This keeps the initial bundle small and the app fast to load.

### 6. No Router

There's no URL-based routing (no React Router). Navigation is handled with React state: `activeSyllabusId`, `syllabusView`, and `standaloneKey` in `App.jsx` determine what's shown. This is simpler for a single-purpose app where you don't need shareable URLs.

---

## File Quick Reference

| File | One-line purpose |
|------|-----------------|
| `src/main.jsx` | Mounts React app to the page |
| `src/App.jsx` | Root shell, navigation state |
| `src/context/AppContext.jsx` | Global state store (useReducer) |
| `src/context/actions.js` | Action creator helpers |
| `src/context/useAppSelector.js` | Fine-grained state subscriptions |
| `src/context/usePersistence.js` | Auto-save state to localStorage |
| `src/lib/api.js` | All LLM API calls |
| `src/lib/providers.js` | LLM provider registry |
| `src/lib/languages.js` | Language config registry |
| `src/lib/parser.js` | Parse LLM markdown → structured data |
| `src/lib/storage.js` | localStorage read/write |
| `src/lib/cloudSync.js` | Supabase sync logic |
| `src/lib/anki.js` | Anki flashcard export |
| `src/lib/llmConfig.js` | Build LLM config from settings |
| `src/prompts/*.js` | LLM prompt construction |
| `src/hooks/*.js` | Reusable behavior (TTS, romanization, etc.) |
| `src/components/*.jsx` | UI components |
| `src/index.css` | Design tokens + global styles |
