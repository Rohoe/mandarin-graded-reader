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
Number of lessons: {lessonCount}

Return a JSON object with exactly two keys:
- "summary": A 2-3 sentence overview (in English) of what the learner will cover across all lessons
- "lessons": an array of lesson objects, each with:
  - "lesson_number": integer (1-{lessonCount})
  - "title_zh": Chinese lesson title (8-15 characters)
  - "title_en": English lesson title
  - "description": One English sentence describing what the reader covers
  - "vocabulary_focus": 3-5 English keywords describing the vocabulary theme

Return ONLY valid JSON. No explanation, no markdown fences.`;

export async function generateSyllabus(apiKey, topic, level, lessonCount = 6) {
  const prompt = SYLLABUS_PROMPT
    .replace('{topic}', topic)
    .replace('{level}', level)
    .replace(/\{lessonCount\}/g, lessonCount);

  const raw = await callClaude(apiKey, '', prompt, 2048);

  let result;
  try {
    result = JSON.parse(raw.trim());
  } catch {
    // Try extracting an object first, then an array (legacy fallback)
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { result = JSON.parse(objMatch[0]); } catch { /* fall through */ }
    }
    if (!result) {
      const arrMatch = raw.match(/\[[\s\S]*?\]/);
      if (arrMatch) result = JSON.parse(arrMatch[0]);
    }
    if (!result) throw new Error('Claude returned an invalid syllabus format. Please try again.');
  }

  // Normalise: handle both new { summary, lessons } and old plain-array formats
  if (Array.isArray(result)) {
    return { summary: '', lessons: result };
  }
  return { summary: result.summary || '', lessons: result.lessons || [] };
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
- Length: {targetChars} Chinese characters (字)
- Topic: {topic}
- Calibrate language complexity to the HSK level:
  - HSK 1-2: Simple sentences (5-10 characters), basic 是/有/在 structures, high-frequency verbs, concrete nouns, present/past with 了
  - HSK 3-4: Compound sentences, 把/被 constructions, common complements (得、到、完), conjunctions (虽然...但是, 因为...所以), some idiomatic expressions
  - HSK 5-6: Complex syntax, literary expressions where appropriate (之、而、则), abstract vocabulary, formal and informal register as suits the content, classical allusions or chengyu if relevant to the topic
- Dialogue and discourse markers should reflect natural speech patterns appropriate to the context
- Avoid vocabulary or structures above the target HSK level unless explicitly introduced as new words

## OUTPUT FORMAT

IMPORTANT: Use EXACTLY these English section headings (do not translate them to Chinese):

### 1. Title
Chinese characters only (no bold markers, no English, no HSK level suffix)
English subtitle on the next line

### 2. Story
With bolded vocabulary and italicized proper nouns

### 3. Vocabulary List
For each word:
- **Word** (pinyin) - English definition
- Example sentence FROM STORY
- *Brief usage note for the story example — explain the grammar pattern, collocation, register, or nuance shown (1 sentence, in English)*
- Additional example sentence (NOT from story, demonstrating different usage context)
- *Brief usage note for the additional example — explain what new aspect of usage this example shows (1 sentence, in English)*

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
    "usage_note_story": "Usage note explaining what this example demonstrates.",
    "example_extra": "Additional example sentence.",
    "usage_note_extra": "Usage note explaining what this example demonstrates."
  }
]
\`\`\`

### 6. Grammar Notes
Identify 3-5 key grammar patterns used in the story. For each pattern:
- **Pattern** (English name) — one-sentence explanation of the structure and when to use it
- Example sentence taken directly from the story`;

// ── Answer grading ────────────────────────────────────────────

const GRADING_SYSTEM = `You are a Chinese language teacher grading reading comprehension answers.
The student is studying Mandarin at HSK level {level}.

Evaluate each answer for accuracy and completeness. Be encouraging but honest.
The student may answer in English or Chinese.

Return ONLY valid JSON — no explanation, no markdown fences:
{
  "overallScore": "X/Y",
  "overallFeedback": "1-2 sentences of general feedback.",
  "feedback": [
    {
      "question": "original question",
      "userAnswer": "student's answer",
      "score": "X/5",
      "feedback": "Specific feedback."
    }
  ]
}

Score 1–5: 5=fully correct, 4=mostly correct, 3=partial, 2=mostly wrong, 1=incorrect/blank.
Overall score = sum / (questions × 5).`;

export async function gradeAnswers(apiKey, questions, userAnswers, story, level, maxTokens = 2048) {
  const system = GRADING_SYSTEM.replace('{level}', level);
  const answersBlock = questions
    .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${userAnswers[i] || '(no answer provided)'}`)
    .join('\n\n');
  const userMessage = `Story (for reference):\n${story}\n\n---\n\nQuestions and Student Answers:\n${answersBlock}`;
  const raw = await callClaude(apiKey, system, userMessage, maxTokens);
  try {
    return JSON.parse(raw.trim());
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Grading response could not be parsed. Please try again.');
  }
}

// ── Reader generation ─────────────────────────────────────────

export async function generateReader(apiKey, topic, level, learnedWords = {}, targetChars = 1200, maxTokens = 8192, previousStory = null) {
  // Build a range string: e.g. 1200 → "1100-1300 Chinese characters"
  const charRange = `${targetChars - 100}-${targetChars + 100}`;
  const system = READER_SYSTEM
    .replace('{level}', level)
    .replace('{topic}', topic)
    .replace('{targetChars}', charRange);

  const learnedList = Object.keys(learnedWords);
  const learnedSection = learnedList.length > 0
    ? `\n\nPreviously introduced vocabulary (do not reuse as "new" vocabulary — you may use these words freely in the story but do not list them in the vocabulary section):\n${learnedList.join(', ')}`
    : '';

  const continuationSection = previousStory
    ? `\n\nThis is a continuation. Previous episode for narrative context:\n---\n${previousStory}\n---\nContinue the story with new events, maintaining the same characters and setting.`
    : '';

  const userMessage = `Generate a graded reader for the topic: ${topic}${learnedSection}${continuationSection}`;

  return await callClaude(apiKey, system, userMessage, maxTokens);
}

// ── Syllabus extension ────────────────────────────────────────

export async function extendSyllabus(apiKey, topic, level, existingLessons, additionalCount = 3) {
  const existingTitles = existingLessons
    .map((l, i) => `${i + 1}. ${l.title_en} (${l.title_zh})`)
    .join('\n');

  const startNumber = existingLessons.length + 1;
  const endNumber = existingLessons.length + additionalCount;

  const prompt = `You are a Mandarin Chinese curriculum designer extending an existing graded reader syllabus.

Topic: ${topic}
HSK Level: ${level}
Number of new lessons to add: ${additionalCount}

Existing lessons (do NOT repeat these):
${existingTitles}

Generate ${additionalCount} NEW lessons that continue the curriculum, numbered ${startNumber}–${endNumber}.
Each new lesson should build on the existing ones and introduce new aspects of the topic.

Return ONLY a JSON array of the new lesson objects (no wrapper object, no explanation, no markdown fences):
[
  {
    "lesson_number": ${startNumber},
    "title_zh": "Chinese lesson title (8-15 characters)",
    "title_en": "English lesson title",
    "description": "One English sentence describing what the reader covers",
    "vocabulary_focus": ["3-5 English keywords describing the vocabulary theme"]
  }
]`;

  const raw = await callClaude(apiKey, '', prompt, 2048);

  let lessons;
  try {
    lessons = JSON.parse(raw.trim());
  } catch {
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { lessons = JSON.parse(arrMatch[0]); } catch { /* fall through */ }
    }
    if (!lessons) throw new Error('Claude returned an invalid lesson format. Please try again.');
  }

  if (!Array.isArray(lessons)) throw new Error('Expected an array of lessons. Please try again.');
  return { lessons };
}
