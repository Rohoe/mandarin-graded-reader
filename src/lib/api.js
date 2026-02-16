/**
 * Claude API integration.
 * Reads the API key from the app's state (passed as argument) rather than
 * importing from storage, so callers control where the key comes from.
 */

import { getLang, DEFAULT_LANG_ID } from './languages';
import { buildSyllabusPrompt } from '../prompts/syllabusPrompt';
import { buildReaderSystem } from '../prompts/readerSystemPrompt';
import { buildGradingSystem } from '../prompts/gradingPrompt';
import { buildExtendSyllabusPrompt } from '../prompts/extendSyllabusPrompt';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-20250514';

// ── Core fetch wrapper ────────────────────────────────────────

const MAX_RETRIES   = 2;   // up to 3 total attempts
const BASE_DELAY_MS = 1000;

function isRetryable(status) {
  // Retry on server errors and rate limits; never retry client errors (400, 401, 403, etc.)
  return status >= 500 || status === 429;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callClaude(apiKey, systemPrompt, userMessage, maxTokens = 4096) {
  if (!apiKey) throw new Error('No API key provided. Please enter your Anthropic API key in Settings.');

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
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
        const error = new Error(msg);
        error.status = response.status;

        if (!isRetryable(response.status) || attempt === MAX_RETRIES) throw error;
        lastError = error;
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[callClaude] ${response.status} on attempt ${attempt + 1}, retrying in ${backoff}ms…`);
        await delay(backoff);
        continue;
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (err) {
      // Network errors (TypeError: Failed to fetch) are retryable
      if (err.status !== undefined) throw err; // Already an API error we decided not to retry
      if (attempt === MAX_RETRIES) throw err;
      lastError = err;
      const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[callClaude] Network error on attempt ${attempt + 1}, retrying in ${backoff}ms…`, err.message);
      await delay(backoff);
    }
  }

  throw lastError;
}

// ── Syllabus generation ───────────────────────────────────────

export async function generateSyllabus(apiKey, topic, level, lessonCount = 6, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const prompt = buildSyllabusPrompt(langConfig, topic, level, lessonCount);

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

// ── Answer grading ────────────────────────────────────────────

// Escape literal control characters inside JSON string values so JSON.parse
// doesn't choke on responses like: "feedback": "Good.\nAlso try harder."
// Handles all ASCII control chars (< 0x20) and also strips markdown fences.
function repairJSON(str) {
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) str = fenceMatch[1].trim();

  let result = '';
  let inString = false;
  let escaped = false;
  for (const char of str) {
    const code = char.codePointAt(0);
    if (escaped) {
      result += char;
      escaped = false;
    } else if (char === '\\' && inString) {
      result += char;
      escaped = true;
    } else if (char === '"') {
      result += char;
      inString = !inString;
    } else if (inString && code < 0x20) {
      // Escape any bare control character inside a string
      if (char === '\n') result += '\\n';
      else if (char === '\r') result += '\\r';
      else if (char === '\t') result += '\\t';
      else if (char === '\b') result += '\\b';
      else if (char === '\f') result += '\\f';
      else result += `\\u${code.toString(16).padStart(4, '0')}`;
    } else {
      result += char;
    }
  }
  return result;
}

export async function gradeAnswers(apiKey, questions, userAnswers, story, level, maxTokens = 2048, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const system = buildGradingSystem(langConfig, level);
  const answersBlock = questions
    .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${userAnswers[i] || '(no answer provided)'}`)
    .join('\n\n');
  const userMessage = `Story (for reference):\n${story}\n\n---\n\nQuestions and Student Answers:\n${answersBlock}`;
  const raw = await callClaude(apiKey, system, userMessage, maxTokens);
  const cleaned = repairJSON(raw.trim());
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* fall through */ }
    }
    throw new Error('Grading response could not be parsed. Please try again.');
  }
}

// ── Reader generation ─────────────────────────────────────────

export async function generateReader(apiKey, topic, level, learnedWords = {}, targetChars = 1200, maxTokens = 8192, previousStory = null, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  // Build a range string: e.g. 1200 → "1100-1300"
  const charRange = `${targetChars - 100}-${targetChars + 100}`;
  const system = buildReaderSystem(langConfig, level, topic, charRange);

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

export async function extendSyllabus(apiKey, topic, level, existingLessons, additionalCount = 3, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const prompt = buildExtendSyllabusPrompt(langConfig, topic, level, existingLessons, additionalCount);

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
