# Deployment, Testing & Known Limitations

## Deployment (Vercel)

Hosted at: `https://mandarin-graded-reader.vercel.app`

- No `vercel.json` needed — Vite auto-detected
- `cloudSync.js` uses `window.location.origin` dynamically (works on any domain)
- **Required env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Supabase redirect URL:** Add Vercel URL to Supabase → Auth → URL Configuration → Redirect URLs
- `VITE_ANTHROPIC_API_KEY` is NOT set — users provide their own key

## Testing

### Unit tests (Vitest) — 738 tests, 29 files

```bash
npm test              # run all
npm run test:watch    # watch mode
npm run test:coverage # V8 coverage
```

Tests colocated with source (`*.test.js`/`*.test.jsx`). Covers lib, context/reducers, hooks, prompts, and i18n.

### E2E tests (Playwright) — 48 tests, 9 specs

```bash
npm run test:e2e      # run all
npm run test:e2e:ui   # UI mode
```

Two projects: Desktop Chrome + iPhone 14. Dev server auto-starts.
Specs: `accessibility`, `demo-reader`, `flashcard`, `mobile`, `settings`, `standalone-reader`, `streaming`, `syllabus-flow`, `undo-delete`.
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
- **Streaming:** Anthropic-only; other providers show 15–30s loading animation.
- **Mobile:** `viewport-fit=cover` + `env(safe-area-inset-*)`, `100dvh`, `pointerdown` for popover close, body scroll lock for sidebar overlay.
- **Mobile sidebar:** Slide-in via `.app-sidebar` in `App.css`. `SyllabusPanel.css` must NOT apply `position: fixed` / `transform` on mobile.
