/**
 * Claude API integration.
 * Reads the API key from the app's state (passed as argument) rather than
 * importing from storage, so callers control where the key comes from.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

// ── Core fetch wrapper ────────────────────────────────────────

async function callClaude(apiKey, systemPrompt, userMessage, maxTokens = 4096) {
  if (!apiKey) throw new Error('No API key provided. Please enter your Anthropic API key in Settings.');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    let msg = `API error ${response.status}`;
    try {
      const err = await response.json();
      msg = err.error?.message || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ── Syllabus generation ───────────────────────────────────────

const SYLLABUS_PROMPT = `You are a Mandarin Chinese curriculum designer. Generate a graded reader syllabus for the following parameters:

Topic: {topic}
HSK Level: {level}
Number of lessons: 6

Return a JSON array of lesson objects. Each object must have:
- "lesson_number": integer (1-6)
- "title_zh": Chinese lesson title (8-15 characters)
- "title_en": English lesson title
- "description": One English sentence describing what the reader covers
- "vocabulary_focus": 3-5 English keywords describing the vocabulary theme

Return ONLY valid JSON. No explanation, no markdown fences.`;

export async function generateSyllabus(apiKey, topic, level) {
  const prompt = SYLLABUS_PROMPT
    .replace('{topic}', topic)
    .replace('{level}', level);

  const raw = await callClaude(apiKey, '', prompt, 2048);

  // Try direct parse, then extract from surrounding text
  try {
    return JSON.parse(raw.trim());
  } catch {
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Claude returned an invalid syllabus format. Please try again.');
  }
}

// ── Reader generation ─────────────────────────────────────────

const READER_SYSTEM = `Create an educational graded reader in Mandarin Chinese for HSK {level} learners.

If a user types in a series of words from the article, assume those are new vocabulary that should be appended to the list in the same format.

## VOCABULARY REQUIREMENTS
- Select 12-15 new vocabulary items appropriate for the specified HSK level
- Items may include single words, compound words, collocations, or idioms (成语/惯用语)
- Vocabulary should have high utility for the target proficiency band
- Each new item must appear at least 2 times throughout the story
- Bold all instances of new vocabulary: **新词**

## STORY REQUIREMENTS
- Length: 1000-1500 Chinese characters (字)
- Topic: {topic}
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
Return a JSON block tagged \`\`\`anki-json containing an array of card objects:
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
\`\`\``;

export async function generateReader(apiKey, topic, level, learnedWords = {}) {
  const system = READER_SYSTEM
    .replace('{level}', level)
    .replace('{topic}', topic);

  const learnedList = Object.keys(learnedWords);
  const learnedSection = learnedList.length > 0
    ? `\n\nPreviously introduced vocabulary (do not reuse as "new" vocabulary — you may use these words freely in the story but do not list them in the vocabulary section):\n${learnedList.join(', ')}`
    : '';

  const userMessage = `Generate a graded reader for the topic: ${topic}${learnedSection}`;

  return await callClaude(apiKey, system, userMessage, 4096);
}
