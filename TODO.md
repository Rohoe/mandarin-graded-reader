# TODO

## Critical Improvements

### ~~1. Context Re-render Cascade~~ ✅ DONE
Added `useAppSelector` hook with `useSyncExternalStore` for fine-grained subscriptions. Components only re-render when their selected slice changes.

### ~~2. No API Retry Logic~~ ✅ DONE
Added exponential backoff (3 retries) for 5xx/network errors in `callClaude`.

### ~~3. No Error Boundaries~~ ✅ DONE
Wrapped ReaderView, SyllabusPanel, Settings, and Stats in `<ErrorBoundary>` with graceful fallback UI.

### ~~4. Quiz Answer Data Loss~~ ✅ DONE
Auto-save draft answers to the reader object on every change (debounced).

---

## Meaningful Feature Additions

### 5. Spaced Repetition / Review System
The app generates Anki cards but has no internal review mechanism. Users learn words but have no way to track retention or get prompted to review.

**Idea:** Add a "Review" mode that surfaces words from `learnedVocabulary` using a lightweight SRS algorithm (SM-2 or simpler). Show "X words due for review" on the home screen.

### ~~6. Learning Statistics Dashboard~~ ✅ DONE
Added `StatsDashboard` modal with CSS-only bar charts showing vocabulary growth, per-language breakdown, quiz scores, streak counter, and activity counts. Activity logging integrated into `ADD_VOCABULARY`, `MARK_LESSON_COMPLETE`, and quiz grading. Accessible via "Stats" button in sidebar footer.

### 7. Reader Difficulty Validation
Claude might generate HSK 5 vocabulary for an HSK 2 request. No post-generation check.

**Idea:** After parsing, cross-reference vocabulary against known word frequency lists for the target level. Flag or warn if vocabulary significantly exceeds the requested level.

### 8. Inline Annotations / Highlighting
Readers are completely immutable. Users can't highlight difficult passages or add personal notes.

**Idea:** Allow click-to-highlight on story paragraphs with optional note attachment. Persist in the reader object.

### ~~9. PWA / Offline Support~~ ✅ DONE
Installed `vite-plugin-pwa` with Workbox runtime caching for Google Fonts. App is installable as a PWA with offline support for cached readers. SVG icons generated for 192x192, 512x512, and Apple touch icon.

---

## Code Quality & UX Fixes

### ~~10. Accessibility Gaps~~ ✅ DONE
- Replaced `<strong role="button">` with semantic `<button>` for vocab click-to-define
- Added `aria-controls` + matching `id` to all collapsible sections (VocabularyList, ComprehensionQuestions, GrammarNotes, SyllabusPanel)
- Fixed dark mode contrast: `--color-text-subtle` changed from `#8A8580` to `#A09A94` (~5.0:1 ratio, passes WCAG AA)
- Mobile touch targets: `.btn-sm` and TTS buttons now meet 44x44px minimum

### ~~11. ReaderView is 650+ Lines~~ ✅ DONE
Extracted 4 hooks (`useTTS`, `useRomanization`, `useVocabPopover`, `useReaderGeneration`) and 2 components (`StorySection`, `ReaderControls`). ReaderView reduced from ~660 lines to ~348 lines.

### ~~12. Console Logs in Production~~ ✅ DONE
Removed all debug `console.log` statements from `parser.js`, `api.js`, and `ReaderView.jsx`. Kept `console.warn` for non-critical issues.

### ~~13. Prompts Embedded in Code~~ ✅ DONE
Extracted 4 prompt builders to `src/prompts/`: `syllabusPrompt.js`, `readerSystemPrompt.js`, `gradingPrompt.js`, `extendSyllabusPrompt.js`.

### ~~14. Lazy-Load Reader Cache~~ ✅ DONE
Switched from monolithic `gradedReader_readers` localStorage key to per-reader keys with an index. Readers load on demand via `LOAD_CACHED_READER`. One-time migration from old format runs automatically on startup.

### ~~15. Cloud Sync Silent Failures~~ ✅ DONE
Added toast notifications for startup sync failure, reader push failure, and auto-sync failure (with dedup guard to avoid spam).

---

## Nice-to-Haves

| Idea | Why |
|------|-----|
| Vocab quiz mode | Flashcard-style review without leaving the app |
| Reading speed tracker | Time from opening a reader to completing comprehension |
| "Next episode" controls | Let users adjust difficulty/direction of continuations |
| Export to PDF | Printable readers for offline study |
| Sentence-level translation | Click a sentence to see English translation |
| Language-specific word frequency tagging | Show HSK/TOPIK level badge per vocab word |

---

## Server-side Reader Generation (Previous TODO)

Move Claude API calls from the browser to a backend so that a lost connection after clicking "Generate" doesn't lose the result.

**Proposed flow:**
1. Client POSTs `{ apiKey, topic, level, ... }` to a Supabase Edge Function (or Vercel Function)
2. Edge function calls Claude, parses the response, writes the reader directly to `user_data.generated_readers` in Supabase
3. Client subscribes to its Supabase row via Realtime and receives the reader as soon as it lands — no polling needed

**What needs building:**
- Edge function (Supabase or Vercel) that accepts generation params and handles the Claude call + parse + DB write
- Supabase Realtime subscription on the client (replaces waiting on the fetch to resolve)
- Update `pushGeneratedReader` flow — reader goes cloud-first instead of local-first

**Notes:**
- API key would transit the network to the edge function (currently stays in localStorage only — not fundamentally less safe, but worth noting)
- Supabase Edge Functions and Realtime are both available on the free tier
- Current client-side generation in `src/lib/api.js` (`generateReader`) can be reused or ported to the edge function
