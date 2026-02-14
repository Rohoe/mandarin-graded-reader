# Claude Code Prompt: Mandarin Graded Reader App

## Project Overview

Build a single-page web application (React + Vite or plain HTML/CSS/JS — your choice based on what's cleanest) for generating Mandarin Chinese graded readers. The app uses the Anthropic Claude API as its intelligence layer. It should feel like a polished learning tool: clean, typographically considered, and designed with a Chinese learner in mind.

---

## Core Features

### 1. Syllabus Mode
- User enters a **topic** (e.g., "Chinese business culture", "Traditional festivals", "Modern technology") and selects an **HSK level** (1–6)
- App calls Claude to generate a **5–8 lesson syllabus** for that topic at that level
- Each syllabus item should include: a lesson title (in both Chinese and English), a one-sentence description of what the reader will cover, and an estimated vocabulary focus (e.g., "food ordering vocabulary", "time expressions")
- Syllabus is displayed as a **sequential lesson plan** — users work through it in order
- The currently active lesson is highlighted; completed lessons are marked ✓
- Syllabus persists in `localStorage` so users can return to it across sessions

### 2. Graded Reader Generation
- When user selects a lesson from the syllabus (or starts the next one), the app generates a full graded reader using the system prompt logic below
- Reader is displayed in a clean reading view with:
  - Chinese text with bolded vocabulary
  - Collapsible vocabulary list (word → pinyin → English → example sentences)
  - Comprehension questions section
- Each generated reader is **cached in `localStorage`** by lesson index so re-visiting doesn't re-generate
- Users can also generate a **standalone reader** (outside of any syllabus) by entering a custom topic directly

### 3. Anki Export
- After reading any lesson, user can click **"Export Anki Cards"**
- App generates a properly formatted `.txt` file using the tab-separated format specified in the system prompt
- File downloads automatically with the filename format: `anki_cards_[topic]_HSK[level]_[YYYY-MM-DD].txt`
- Implement **duplicate prevention**: maintain a `localStorage` list of all previously exported vocabulary (by Chinese word). Before generating the export file, cross-check and skip duplicates. Show a summary: "Added X new cards, skipped Y duplicates."

### 4. Vocabulary Memory
- Every time a reader is generated, extract and store the vocabulary list in `localStorage` under a running "learned words" ledger
- This ledger is passed to Claude when generating each new reader so it can avoid re-introducing already-covered words (or flag them as review words instead of new words)

---

## Claude API Integration

Use the standard Anthropic `/v1/messages` endpoint with `claude-sonnet-4-20250514`. Never hardcode API keys — read from an `.env` file (`ANTHROPIC_API_KEY` or equivalent for your framework).

### Syllabus Generation Prompt

```
You are a Mandarin Chinese curriculum designer. Generate a graded reader syllabus for the following parameters:

Topic: {topic}
HSK Level: {level}
Number of lessons: 6

Return a JSON array of lesson objects. Each object must have:
- "lesson_number": integer (1–6)
- "title_zh": Chinese lesson title (8–15 characters)
- "title_en": English lesson title
- "description": One English sentence describing what the reader covers
- "vocabulary_focus": 3–5 English keywords describing the vocabulary theme

Return ONLY valid JSON. No explanation, no markdown fences.
```

### Reader Generation Prompt

Use the full system prompt from the uploaded document (reproduced in the appendix below), substituting:
- `[INSERT LEVEL: 1-6]` → the selected HSK level
- `[INSERT TOPIC]` → the lesson title/description from the syllabus (or custom topic)

Also append to the user message:
```
Previously introduced vocabulary (do not reuse as "new" vocabulary — you may use these words freely in the story but do not list them in the vocabulary section):
{learned_words_list}
```

Parse the Claude response to extract:
1. The story text (for display)
2. The vocabulary list (for the UI and Anki export)
3. The comprehension questions

---

## App Structure

```
src/
  App.jsx (or index.html)
  components/
    SyllabusPanel.jsx       — sidebar showing lesson list
    ReaderView.jsx          — main reading area
    VocabularyList.jsx      — collapsible vocab section
    ComprehensionQuestions.jsx
    AnkiExportButton.jsx
    TopicForm.jsx           — for standalone reader generation
  lib/
    api.js                  — Claude API calls
    storage.js              — localStorage helpers
    anki.js                 — Anki file generation logic
    parser.js               — parse Claude's markdown/JSON response
```

---

## Design Direction

Go for a **refined editorial aesthetic** — think a premium language learning product, not a generic SaaS dashboard.

- **Color palette**: Warm off-white background, deep ink-black text, one accent color drawn from Chinese ink painting aesthetics (a muted vermillion or ink-wash teal). Avoid purple gradients and generic tech blues.
- **Typography**: Pair a beautiful serif or calligraphic-feel display font for headings with a highly legible body font. Chinese characters should render at comfortable reading sizes (18–22px for body text). Consider using `Noto Serif SC` or `ZCOOL XiaoWei` for Chinese text via Google Fonts.
- **Layout**: Two-column on desktop (syllabus sidebar left, reader right). Single column on mobile. Clean card components with generous padding.
- **Interactions**: Smooth fade-in when a new reader loads. Vocabulary items expand on click. Subtle progress indicator on the syllabus.
- **Loading states**: Show a tasteful loading animation while Claude generates (something more considered than a spinner — perhaps animated Chinese characters or a brush-stroke effect).

Do NOT use generic AI aesthetics (purple gradients, Inter font, cookie-cutter card layouts).

---

## State Management

Use React `useState`/`useContext` or simple module-level state. No Redux needed.

Key state:
```
{
  currentSyllabus: { topic, level, lessons: [...] } | null,
  currentLessonIndex: number,
  generatedReaders: { [lessonIndex]: readerData },
  learnedVocabulary: { [chineseWord]: { pinyin, english, dateAdded } },
  exportedWords: Set<string>
}
```

All of this should be persisted to `localStorage` and rehydrated on load.

---

## Error Handling

- If Claude API call fails, show a friendly error with a retry button
- If `localStorage` is full or unavailable, degrade gracefully (warn user, continue without persistence)
- Validate that Claude's JSON response is parseable before rendering; if malformed, show the raw text with a note

---

## Appendix: Full Graded Reader System Prompt

```
Create an educational graded reader in Mandarin Chinese for HSK [INSERT LEVEL: 1-6] learners.

If a user types in a series of words from the article, assume those are new vocabulary that should be appended to the list in the same format.

## VOCABULARY REQUIREMENTS
- Select 12-15 new vocabulary items appropriate for the specified HSK level
- Items may include single words, compound words, collocations, or idioms (成语/惯用语)
- Vocabulary should have high utility for the target proficiency band
- Each new item must appear at least 2 times throughout the story
- Bold all instances of new vocabulary: **新词**

## STORY REQUIREMENTS
- Length: 1000-1500 Chinese characters (字)
- Topic: [INSERT TOPIC]
- Calibrate language complexity to the HSK level:
  - HSK 1-2: Simple sentences (5-10 characters), basic 是/有/在 structures, high-frequency verbs, concrete nouns, present/past with 了
  - HSK 3-4: Compound sentences, 把/被 constructions, common complements (得、到、完), conjunctions (虽然...但是, 因为...所以), some idiomatic expressions
  - HSK 5-6: Complex syntax, literary expressions where appropriate (之、而、则), abstract vocabulary, formal and informal register as suits the content, classical allusions or chengyu if relevant to the topic
- Dialogue and discourse markers should reflect natural speech patterns appropriate to the context
- Avoid vocabulary or structures above the target HSK level unless explicitly introduced as new words

## OUTPUT FORMAT

### 1. Title
Chinese title + subtitle with target HSK level

### 2. Story
With bolded vocabulary and italicized proper nouns

### 3. Vocabulary List
For each word:
- Word (pinyin) - English definition
- Example sentence FROM STORY
- Additional example sentence (NOT from story, demonstrating different usage context)

### 4. Comprehension Questions
3-5 questions in Chinese at the target level

### 5. Anki Cards Data (JSON)
Return a JSON block tagged ```anki-json containing an array of card objects:
[
  {
    "chinese": "词",
    "pinyin": "cí",
    "english": "n. word/term",
    "example_story": "Story sentence using the word.",
    "example_extra": "Additional example sentence.",
    "usage_note_story": "Optional usage note for story example.",
    "usage_note_extra": "Optional usage note for extra example."
  }
]
```

---

## File Output

Generate the Anki `.txt` export from the JSON data above using this format:
- Tab-separated
- Columns: Chinese, Pinyin, English, Example (both sentences combined with line break), Tags
- Tags: HSK[level] [Story_Title_underscored] [Topic] [YYYY-MM-DD]
- Filename: anki_cards_[topic]_HSK[level]_[YYYY-MM-DD].txt
```

---

## Deliverables

1. All source files organized cleanly
2. A `README.md` with setup instructions (how to add API key, how to run locally)
3. The app should run with `npm run dev` or equivalent with no additional configuration beyond adding the API key

Keep the implementation focused and clean. Prefer simplicity over feature bloat. The reading experience is the core — everything else supports it.
