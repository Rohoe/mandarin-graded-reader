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
- **Dark mode** — Toggle in Settings; persists across sessions. Overrides all colour tokens via `[data-theme="dark"]` on the root element
- **Story continuation** — "Next episode →" button generates a follow-up reader that continues the narrative from the previous story, maintaining characters and setting
- **Extend syllabus** — "Add more lessons" panel on the syllabus home page appends 2–6 AI-generated lessons to an existing syllabus
- **Collapsible sidebar sections** — Syllabus lesson list and standalone readers list can be collapsed/expanded via caret buttons in their section headers
- **Text-to-speech** — "🔊 Listen" button reads the full story aloud; click any paragraph to hear just that sentence. Auto-selects the best available Chinese voice (Google neural, macOS Tingting/Meijia). Voice picker groups voices into Recommended / Other (Chrome/Edge)
- **Click-to-define** — Click any bolded vocabulary word in the story to see a popover with pinyin and English definition. Toggle off by clicking again, pressing Escape, or clicking elsewhere
- **Pinyin toggle** — "拼 Pinyin" button shows pinyin above every character using `<ruby>` tags (powered by `pinyin-pro`). Essential for HSK 1–3 learners
- **Disk persistence** — Optionally save all data as JSON files to a folder on your computer (Chrome/Edge only)
- **Cloud Sync** — Sign in with Google or Apple to push/pull all your data to/from Supabase. Manual sync via explicit Push/Pull buttons in Settings; API key stays local

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

### Accessing from your phone or tablet

To open the app on a mobile device on the same Wi-Fi network, start the dev server with the `--host` flag:

```bash
npm run dev -- --host
```

Vite will print a **Network** URL like `http://192.168.x.x:5173`. Open that URL on your phone.

> Your computer and mobile device must be on the same Wi-Fi network. You may also need to allow port 5173 through your firewall if the page doesn't load.

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

### Optional: Cloud sync via Supabase

The **Cloud Sync** section in Settings lets you push/pull all app data to/from a personal Supabase database.

**Prerequisites (one-time setup):**
1. Create a free project at [supabase.com](https://supabase.com)
2. Enable **Google** and/or **Apple** OAuth in Authentication → Providers
3. Add `http://localhost:5173` (and your production URL) to Authentication → URL Configuration → Redirect URLs
4. Run the following SQL in the SQL editor:

```sql
CREATE TABLE user_data (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  syllabi JSONB DEFAULT '[]',
  syllabus_progress JSONB DEFAULT '{}',
  standalone_readers JSONB DEFAULT '[]',
  generated_readers JSONB DEFAULT '{}',
  learned_vocabulary JSONB DEFAULT '{}',
  exported_words JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own data"
  ON user_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

5. Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Once configured, open Settings → Cloud Sync → sign in with Google or Apple. Use **Push to cloud ↑** to upload your data, and **Pull from cloud ↓** on another device to download it.

> Your API key is never synced to the cloud — it stays local to each device.

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
