# CLAUDE.md — Multi-Language Graded Reader App

Single-page React + Vite app that generates graded readers in **Mandarin Chinese**, **Cantonese**, **Korean**, **French**, **Spanish**, and **English** using LLM APIs (Anthropic, OpenAI, Gemini, OpenAI-compatible). Users pick a target language, native language, and proficiency level; the app generates stories with vocabulary, comprehension questions, and Anki exports.

## Running the app

```bash
npm install        # first time only
npm run dev        # http://localhost:5173
npm run build      # production build
npm test           # unit tests (Vitest, 614 tests)
npm run test:e2e   # E2E tests (Playwright, 22 tests)
```

No `.env` needed for basic use. Users add their own API key in Settings. Cloud sync requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

## Key directories

```
src/
  App.jsx              Root layout, UI-only state (sidebar, modals, activeSyllabusId, standaloneKey, syllabusView, activePlanId)
  context/             useReducer global store (AppContext.jsx), useApp hook, actions factory, reducers/ (9 domain slices)
  i18n/                UI string translations: useT() hook, en/zh/yue/ko/fr/es language files
  lib/                 Core logic: api.js, chatApi.js, parser.js, storage.js, languages.js, nativeLanguages.js, providers.js, cloudSync.js, anki.js, stats.js
  prompts/             LLM prompt builders (syllabus, reader, grading, extend, tutor, assessment, weeklyPlan)
  hooks/               useTTS, useRomanization, useVocabPopover, useReaderGeneration, useTutorChat, useFocusTrap, useReadingTimer, usePWA, usePlanWeek
  components/          UI components (see docs/components.md for details)
e2e/                   Playwright E2E specs + fixtures
```

## Architecture highlights

- **Multi-language:** Config registry in `src/lib/languages.js` — each lang defines proficiency levels, script regex, fonts, TTS, romanization, prompt fragments. All API/parser/export functions accept `langId`. CJK langs (zh, yue) use character-based splitting; syllabic (ko) and Latin-script langs (fr, es, en) use word-based splitting.
- **Native language:** `src/lib/nativeLanguages.js` — configurable explanation language (English, Chinese, Korean, French, Spanish, Japanese). Prompts, vocab definitions, and translations use the learner's native language instead of always English.
- **UI i18n:** `src/i18n/` — lightweight custom `useT()` hook reads `state.nativeLang` and returns a `t(key, params)` function. ~400 keys across 6 language files (en, zh, yue, ko, fr, es). Fallback chain: current lang → English → raw key. Simple `{param}` interpolation. No external library.
- **Multi-provider LLM:** Registry in `src/lib/providers.js`. `callLLM()` dispatches to provider-specific functions. `buildLLMConfig(state)` from `llmConfig.js` builds config from state.
- **State:** useReducer in AppContext.jsx. Reducer split into 9 domain slices in `src/context/reducers/` (including `planReducer` for learning plans). Persistence extracted to `usePersistence.js`. Test-only exports: `_baseReducer`, `_reducer`, `_DATA_ACTIONS`.
- **Learning Plans:** LLM-driven orchestration layer composing existing features. `PlanOnboarding` wizard creates plans with assessed level. `PlanDashboard` shows weekly activity checklists. `usePlanWeek` manages weekly lifecycle. Activities route to existing `ReaderView`/`FlashcardReview`/`TutorChat`. State in `learningPlans` + `planProgress`.
- **Storage:** localStorage (primary) + opt-in File System Access API (Chrome) + Supabase cloud sync with auto-merge and undo.
- **Parsing:** Regex parser (default) in `parser.js`, structured JSON parser (opt-in) via `normalizeStructuredReader()`.
- **Syllabus→Reader connection:** Syllabus lesson metadata (`vocabulary_focus`, `difficulty_hint`) is threaded into reader prompts. `useReaderGeneration` builds cumulative context (prior lesson summaries, taught grammar patterns) so each lesson builds on previous ones. `SyllabusHome` aggregates a learning summary from completed readers.
- **Streaming:** Anthropic provider supports streaming responses via `generateReaderStream()` async generator. Text streams progressively to UI, then parses on completion.
- **AI Tutor Chat:** `src/lib/chatApi.js` provides multi-turn `callLLMChat`/`callLLMChatStream` for all providers. `src/prompts/tutorPrompt.js` builds context-rich system prompts. `src/hooks/useTutorChat.js` manages chat state, persists `chatHistory`/`chatSummary` on reader objects via `SET_READER`. "Open in Claude/ChatGPT" always available (copies lesson context to clipboard). UI in `src/components/TutorChat/`.

## Lesson keys

- Syllabus lessons: `lesson_<syllabusId>_<lessonIndex>`
- Standalone readers: `standalone_<timestamp>`
- Plan activities: `plan_<planId>_<activityId>`
- UI state (`activeSyllabusId`, `standaloneKey`, `syllabusView`, `activePlanId`) lives in App.jsx, persisted via `saveLastSession()`.

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

When making changes that affect architecture, components, APIs, or state shape, update the relevant `docs/` file and `README.md` in the same commit. This CLAUDE.md should stay concise (~60 lines); put details in `docs/`.
