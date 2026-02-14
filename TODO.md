# 漫读 — Feature Roadmap

## Planned features (priority order)

- [x] ~~**Text-to-speech** — "Listen" button on stories using the Web Speech API (built into Chrome, zero deps). Also support click-to-hear at the sentence level.~~

- [x] ~~**Pinyin toggle** — Toggle button that wraps story characters in `<ruby>` tags using `pinyin-pro`. Essential for HSK 1–3 learners.~~

- [ ] **Click-to-define words in story** — Highlight words that appear in the reader's vocabulary list; click to show a popover with pinyin + definition. Data is already parsed.

- [x] ~~**Dark mode** — Add `data-theme="dark"` to the root element and override the ~8 CSS custom property tokens. Toggle in Settings.~~

- [x] ~~**Grammar notes section** — Add a 6th section to Claude's reader prompt: key grammar patterns used in the story with brief explanations. New component similar to `VocabularyList`. Includes Anki export with `Grammar` tag.~~

- [x] ~~**Story continuation** — "Next episode →" button that passes the previous story to Claude and asks it to continue the narrative. Reuses all existing generation/parsing infrastructure.~~
