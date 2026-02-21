# CLAUDE.md — Multi-Language Graded Reader App

Single-page React + Vite app that generates graded readers in **Mandarin Chinese**, **Cantonese**, and **Korean** using LLM APIs (Anthropic, OpenAI, Gemini, OpenAI-compatible). Users pick a language and proficiency level; the app generates stories with vocabulary, comprehension questions, and Anki exports.

## Running the app

```bash
npm install        # first time only
npm run dev        # http://localhost:5173
npm run build      # production build
npm test           # unit tests (Vitest, 201 tests)
npm run test:e2e   # E2E tests (Playwright, 22 tests)
```

No `.env` needed for basic use. Users add their own API key in Settings. Cloud sync requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

## Key directories

```
src/
  App.jsx              Root layout, UI-only state (sidebar, modals, activeSyllabusId, standaloneKey, syllabusView)
  context/             useReducer global store (AppContext.jsx), useApp hook, actions factory
  lib/                 Core logic: api.js, parser.js, storage.js, languages.js, providers.js, cloudSync.js, anki.js, stats.js
  prompts/             LLM prompt builders (syllabus, reader, grading, extend)
  hooks/               useTTS, useRomanization, useVocabPopover, useReaderGeneration
  components/          UI components (see docs/components.md for details)
e2e/                   Playwright E2E specs + fixtures
```

## Architecture highlights

- **Multi-language:** Config registry in `src/lib/languages.js` — each lang defines proficiency levels, script regex, fonts, TTS, romanization, prompt fragments. All API/parser/export functions accept `langId`.
- **Multi-provider LLM:** Registry in `src/lib/providers.js`. `callLLM()` dispatches to provider-specific functions. `buildLLMConfig(state)` from `llmConfig.js` builds config from state.
- **State:** useReducer in AppContext.jsx. Pure reducer, persistence via useEffect. Test-only exports: `_baseReducer`, `_reducer`, `_DATA_ACTIONS`.
- **Storage:** localStorage (primary) + opt-in File System Access API (Chrome) + Supabase cloud sync with auto-merge and undo.
- **Parsing:** Regex parser (default) in `parser.js`, structured JSON parser (opt-in) via `normalizeStructuredReader()`.

## Lesson keys

- Syllabus lessons: `lesson_<syllabusId>_<lessonIndex>`
- Standalone readers: `standalone_<timestamp>`
- UI state (`activeSyllabusId`, `standaloneKey`, `syllabusView`) lives in App.jsx, not persisted.

## Design system

CSS custom properties in `index.css`. Key tokens: `--color-bg` (#FAF8F5), `--color-accent` (#4A7C7E), `--font-chinese`, `--font-target` (overridden by `[data-lang]`). Dark mode via `[data-theme="dark"]`. Two-column desktop (280px sidebar), single-column mobile (≤768px).

## Testing

Unit tests colocated with source (`*.test.js`). E2E in `e2e/` with Desktop Chrome + iPhone 14 projects. API mocking via `page.route()`. Test helpers in `e2e/helpers/appHelpers.js`.

## Detailed documentation

For in-depth reference, see the docs in `docs/`:
- **[docs/architecture.md](docs/architecture.md)** — File-by-file architecture, state shape, storage/sync details
- **[docs/components.md](docs/components.md)** — Component descriptions and prop contracts
- **[docs/api-and-parsing.md](docs/api-and-parsing.md)** — LLM provider integration, prompt system, response parsing
- **[docs/deployment.md](docs/deployment.md)** — Vercel deployment, testing infrastructure, known limitations

## Keeping docs current

When making changes that affect architecture, components, APIs, or state shape, update the relevant `docs/` file in the same commit. This CLAUDE.md should stay concise (~60 lines); put details in `docs/`.
