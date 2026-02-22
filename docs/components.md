# Component Reference

## `TopicForm`
Topic input + language selector (pill toggle: 中文 / 粵語 / 한국어) + proficiency level pills. Two modes: syllabus / standalone. Sliders: lesson count (2–12, syllabus), reader length (150–2000 chars, step 50). Generate button disabled without API key. ARIA `role="radiogroup"` on mode, language, and level pill groups; individual pills use `role="radio"` with `aria-checked`.

## `SyllabusPanel`
Left sidebar: syllabus dropdown, lesson list, standalone readers list, progress bar, settings link. Home (⌂) button. Collapsible sections (▾/▸). Cloud sync status in footer. Cards + Stats buttons. Series grouping for standalone readers with `seriesId`. Demo readers show "(sample)" label.

## `SyllabusHome`
Overview page (syllabusView='home'). Topic, HSK badge, date, AI summary, lesson list with completion status. "Add more lessons" panel (slider 2–6). Delete Syllabus with inline confirmation. Fixed LoadingIndicator overlay during loading.

## `ReaderView`
Main content area. Orchestrates hooks: useTTS, useRomanization, useVocabPopover, useReaderGeneration, useSentenceTranslate. Sets `data-lang` attribute. Demo reader detection (dismissible banner, hides Mark Complete/Regenerate). Evicted reader detection with "Restore from backup" button. Mutual exclusion between vocab, selection, and sentence popovers. Shows streaming preview (live text + cursor animation) when Anthropic streaming is active.

## `ReaderHeader`
Extracted from ReaderView. Renders title, proficiency badge, difficulty badge (via `assessDifficulty()`), and title-level TTS button.

## `ReaderActions`
Extracted from ReaderView. Mark Complete, Regenerate, and other action buttons below the reader content.

## `StorySection`
Renders story paragraphs with vocab buttons, TTS click-to-read, popover portal for vocab definitions. Paragraphs are split into clickable sentence spans via `splitParagraphIntoSentences()`. New props: `langId`, `onSentenceClick`, `sentencePopover`, `sentencePopoverRef`, `onSubSelection`, `romanizer`.

## `SentencePopover`
Portal-based popover shown on sentence click. Displays original sentence (selectable), romanization (if enabled), and translation (via Google Translate). Supports word drill-down: drag-select text within the popover to see a sub-translation.

## `VocabularyList`
Collapsible accordion of vocab cards. Props: `renderChars` (ruby romanization), TTS props (`speakText`, `speakingKey`, `ttsSupported`), translation props (`onTranslateExample`, `translatingKey`, `vocabTranslations`). Inline TTS (🔊) and EN buttons when `showParagraphTools` is true.

## `ComprehensionQuestions`
Question list with textarea input + "Grade My Answers" button. Results: per-question score (1–5) + feedback + toggleable suggested answer. Persists userAnswers + gradingResults to reader object. Accepts renderChars, TTS, and translation props.

## `GrammarNotes`
3–5 grammar pattern cards per reader. Each: pattern (target lang), label, explanation, example sentence. Renders nothing if empty.

## `AnkiExportButton`
Shows new/skip counts. Merges grammar cards into export (tagged Grammar). When `verboseVocab` ON, batch-translates examples via Google Translate before export.

## `FlashcardReview/`
Modal with daily SRS session. `buildDailySession()` collects due + new cards. Forward and reverse directions with independent SRS tracking. Interval previews below judgment buttons. Missed/almost re-queued. Undo via Ctrl+Z. Per-language sessions (resumable same day, reset at midnight). Language filter pills.

## `StatsDashboard/`
Modal: vocab growth chart, per-language breakdown, quiz scores, streak, activity counts. Flashcard stats: total reviews, retention rate, mastery breakdown. CSS-only charts.

## `Settings`
Tabbed modal (4 tabs). Tab bar uses `role="tablist"` / `role="tab"` with `aria-selected` and keyboard navigation. Each tab is extracted into its own component:
- **`SettingsReadingTab`**: dark mode, romanization, paragraph tools, verbose vocab, reading speed, default levels, TTS voices
- **`SettingsAITab`**: provider pills with key-set indicators, model picker, API key input, base URL
- **`SettingsSyncTab`**: storage meter, backup/restore, cloud sync, "Revert last sync", save folder
- **`SettingsAdvancedTab`**: output tokens slider, structured output toggle, re-parse button, danger zone

## `LoadingIndicator`
Animated ink-wash Chinese characters (读写学文语书).

## `GenerationProgress`
Phase-based progress bar. type='reader' (6 phases, ~30s) or type='syllabus' (4 phases, ~10s). Shows dynamic provider name.
