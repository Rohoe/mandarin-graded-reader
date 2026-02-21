# Deployment, Testing & Known Limitations

## Deployment (Vercel)

Hosted at: `https://mandarin-graded-reader.vercel.app`

- No `vercel.json` needed — Vite auto-detected
- `cloudSync.js` uses `window.location.origin` dynamically (works on any domain)
- **Required env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Supabase redirect URL:** Add Vercel URL to Supabase → Auth → URL Configuration → Redirect URLs
- `VITE_ANTHROPIC_API_KEY` is NOT set — users provide their own key

## Testing

### Unit tests (Vitest) — 201 tests, 11 files

```bash
npm test              # run all
npm run test:watch    # watch mode
npm run test:coverage # V8 coverage
```

Files: `parser.test.js` (36), `reducer.test.js` (36), `stats.test.js` (21), `vocabNormalizer.test.js` (21), `storage.test.js` (21), `anki.test.js` (16), `prompts.test.js` (15), `cloudSync.test.js` (11), `llmConfig.test.js` (10), `api.test.js` (8), `providers.test.js` (6).

### E2E tests (Playwright) — 22 tests, 6 specs

```bash
npm run test:e2e      # run all
npm run test:e2e:ui   # UI mode
```

Two projects: Desktop Chrome + iPhone 14. Dev server auto-starts.
Specs: `demo-reader`, `settings`, `standalone-reader`, `syllabus-flow`, `flashcard`, `mobile`.
API mocking: `page.route()` interception (`e2e/fixtures/mockApiResponses.js`).
Helpers: `e2e/helpers/appHelpers.js` — `seedLocalStorage()`, `mockLLMApis()`.

### Test infrastructure
- `src/test/setup.js` — jest-dom/vitest, localStorage mock, matchMedia mock
- `src/test/fixtures/` — `sampleReaderMarkdown.js`, `sampleState.js`
- `playwright.config.js` — Desktop Chrome + iPhone 14 projects

## Known limitations

- **API key security:** Keys in localStorage plain text (never synced). OK for personal use.
- **localStorage quota:** ~5MB. LRU eviction after 30 cached / 30 days (only if backup exists). "Restore from backup" for evicted readers.
- **File System Access API:** Chrome/Edge only. Graceful fallback.
- **No streaming:** 15–30s generation with loading animation only.
- **Mobile:** `viewport-fit=cover` + `env(safe-area-inset-*)`, `100dvh`, `pointerdown` for popover close, body scroll lock for sidebar overlay.
- **Mobile sidebar:** Slide-in via `.app-sidebar` in `App.css`. `SyllabusPanel.css` must NOT apply `position: fixed` / `transform` on mobile.
