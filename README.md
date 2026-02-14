# 读书 Mandarin Graded Reader

A single-page web app for generating Mandarin Chinese graded readers using Claude AI. Designed for HSK learners who want personalised reading practice with vocabulary tracking and Anki export.

## Features

- **Syllabus Mode** — Generate a course for any topic at HSK 1–6, with an AI-written summary and a dedicated home page showing all lessons and completion status
- **Graded Reader Generation** — Stories with bolded vocabulary, HSK-calibrated grammar
- **Vocabulary Memory** — Tracks learned words across sessions; new readers avoid repeating them
- **Anki Export** — Download flashcard files (.txt) with duplicate prevention; includes both vocabulary cards and grammar pattern cards (tagged `Grammar`)
- **Offline persistence** — All data stored in `localStorage`; pick up where you left off
- **Grammar Notes** — Each reader includes 3–5 collapsible grammar pattern cards explaining structures used in the story, with examples
- **Comprehension grading** — Type answers to comprehension questions and get AI-powered feedback with per-question scores; results persist across sessions
- **Syllabus home page** — Overview of all lessons with completion badges, a summary, Continue CTA, and delete button with confirmation
- **Configurable length** — Sliders for syllabus lesson count (2–12) and reader story length (500–2000 characters)
- **Disk persistence** — Optionally save all data as JSON files to a folder on your computer (Chrome/Edge only)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get an Anthropic API key

Sign up at [console.anthropic.com](https://console.anthropic.com) and create an API key (starts with `sk-ant-`).

> No `.env` file is required. When you first open the app, it will prompt you to paste your API key directly in the UI. The key is stored in your browser's `localStorage` — it never leaves your device except for calls to Anthropic's API.

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. **Enter your API key** on the setup screen (first run only)
2. **Choose "Course Syllabus"** — enter a topic (e.g. "Chinese business culture") and HSK level, then click "Generate Syllabus"
3. **Click a lesson** in the sidebar to generate its reader
4. **Read** the story; bolded words are new vocabulary
5. **Expand vocabulary cards** to see pinyin, definitions, example sentences, and italic usage notes explaining each example's grammar or nuance
6. **Export to Anki** — click the export button to download a `.txt` file. Already-exported words are skipped automatically; re-download at any time with the "Re-download Cards" button.

Alternatively, use **Single Reader** mode to generate a one-off story without a syllabus.

### Adjusting output length

Use the sliders in the sidebar form to control:
- **Lessons** (syllabus mode) — how many lessons to generate (2–12, default 6)
- **Reader Length** — target story length in Chinese characters (500–2000, default 1200)

To fix truncated readers, open **Settings → API Output Tokens** and drag the slider up. The default is 8,192 tokens. Values above 8,192 may require an API tier that supports extended output.

### Optional: Save to disk

In the **Settings** panel (⚙ icon), the **Save Folder** section lets you pick a folder on your computer. Once set, all data (syllabus, readers, vocabulary, exported words) is written to JSON files in that folder on every change, in addition to `localStorage`. This survives clearing browser data and works across machines if you sync the folder.

> Requires Chrome or Edge. Firefox and Safari do not support the File System Access API.

## Security note

Your API key is stored in plain text in `localStorage` and sent directly to Anthropic's API from your browser. This is acceptable for personal use. Do not share the URL with others if you have the key pre-filled.

## Tech stack

- React 18 + Vite 5
- No backend required
- Fonts: Noto Serif SC (Chinese), Cormorant Garamond (English)
- Zero UI framework dependencies — pure CSS with custom design tokens

## Building for production

```bash
npm run build
```

The output in `dist/` can be served from any static host (Netlify, Vercel, GitHub Pages, etc.). Users will still need to enter their own API key.
