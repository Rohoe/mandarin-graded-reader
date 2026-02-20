/**
 * LLM API integration — supports Anthropic, OpenAI, Google Gemini,
 * and OpenAI-compatible providers (DeepSeek, Groq, etc.).
 *
 * All public functions accept an `llmConfig` object as the first parameter:
 *   { provider, apiKey, model, baseUrl }
 */

import { getLang, DEFAULT_LANG_ID } from './languages';
import { buildSyllabusPrompt } from '../prompts/syllabusPrompt';
import { buildReaderSystem } from '../prompts/readerSystemPrompt';
import { buildGradingSystem } from '../prompts/gradingPrompt';
import { buildExtendSyllabusPrompt } from '../prompts/extendSyllabusPrompt';

// ── Shared retry logic ─────────────────────────────────────────

const MAX_RETRIES   = 2;
const BASE_DELAY_MS = 1000;

function isRetryable(status) {
  return status >= 500 || status === 429;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry: shared across all providers.
 * @param {string} url
 * @param {object} options - fetch options (may include signal)
 * @param {function} extractText - (responseData) => string
 * @param {string} providerLabel - for error messages
 */
async function fetchWithRetry(url, options, extractText, providerLabel) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        let msg = `[${providerLabel}] API error ${response.status}`;
        try {
          const err = await response.json();
          msg = err.error?.message || err.message || msg;
        } catch { /* ignore */ }
        const error = new Error(msg);
        error.status = response.status;

        if (!isRetryable(response.status) || attempt === MAX_RETRIES) throw error;
        lastError = error;
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[${providerLabel}] ${response.status} on attempt ${attempt + 1}, retrying in ${backoff}ms…`);
        await delay(backoff);
        continue;
      }

      const data = await response.json();
      return extractText(data);
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('Request timed out after 60 seconds. Try again or switch to a faster provider.');
      if (err.status !== undefined) throw err;
      if (attempt === MAX_RETRIES) throw err;
      lastError = err;
      const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[${providerLabel}] Network error on attempt ${attempt + 1}, retrying in ${backoff}ms…`, err.message);
      await delay(backoff);
    }
  }

  throw lastError;
}

// ── Provider-specific call functions ────────────────────────────

function callAnthropic(apiKey, model, systemPrompt, userMessage, maxTokens, signal) {
  return fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal,
    },
    data => data.content[0].text,
    'Anthropic',
  );
}

function callOpenAI(apiKey, model, systemPrompt, userMessage, maxTokens, baseUrl, signal) {
  const url = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`;
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userMessage });

  return fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
      }),
      signal,
    },
    data => data.choices[0].message.content,
    baseUrl ? 'OpenAI-Compatible' : 'OpenAI',
  );
}

function callGemini(apiKey, model, systemPrompt, userMessage, maxTokens, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  return fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    },
    data => data.candidates[0].content.parts[0].text,
    'Gemini',
  );
}

// ── Unified dispatcher ──────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 60_000;

async function callLLM(llmConfig, systemPrompt, userMessage, maxTokens = 4096, { signal: externalSignal } = {}) {
  const { provider, apiKey, model, baseUrl } = llmConfig;
  if (!apiKey) throw new Error('No API key provided. Please add your API key in Settings.');

  // Create timeout-based AbortController, linked to any external signal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (externalSignal) {
    if (externalSignal.aborted) { clearTimeout(timeoutId); controller.abort(); }
    else externalSignal.addEventListener('abort', () => { clearTimeout(timeoutId); controller.abort(); }, { once: true });
  }
  const { signal } = controller;

  try {
    switch (provider) {
      case 'anthropic':
        return await callAnthropic(apiKey, model, systemPrompt, userMessage, maxTokens, signal);
      case 'openai':
        return await callOpenAI(apiKey, model, systemPrompt, userMessage, maxTokens, null, signal);
      case 'gemini':
        return await callGemini(apiKey, model, systemPrompt, userMessage, maxTokens, signal);
      case 'openai_compatible':
        return await callOpenAI(apiKey, model, systemPrompt, userMessage, maxTokens, baseUrl, signal);
      default:
        return await callAnthropic(apiKey, model, systemPrompt, userMessage, maxTokens, signal);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Syllabus generation ───────────────────────────────────────

export async function generateSyllabus(llmConfig, topic, level, lessonCount = 6, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const prompt = buildSyllabusPrompt(langConfig, topic, level, lessonCount);

  const raw = await callLLM(llmConfig, '', prompt, 2048);

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
    if (!result) throw new Error('LLM returned an invalid syllabus format. Please try again.');
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

export async function gradeAnswers(llmConfig, questions, userAnswers, story, level, maxTokens = 2048, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const system = buildGradingSystem(langConfig, level);
  const answersBlock = questions
    .map((q, i) => `Q${i + 1}: ${typeof q === 'string' ? q : q.text}\nA${i + 1}: ${userAnswers[i] || '(no answer provided)'}`)
    .join('\n\n');
  const userMessage = `Story (for reference):\n${story}\n\n---\n\nQuestions and Student Answers:\n${answersBlock}`;
  const raw = await callLLM(llmConfig, system, userMessage, maxTokens);
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

// ── Structured output schema ──────────────────────────────────

export const READER_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title_target:  { type: 'string', description: 'Title in the target language' },
    title_en:      { type: 'string', description: 'English subtitle' },
    story:         { type: 'string', description: 'The story text with **bolded** vocabulary and *italicized* proper nouns' },
    vocabulary: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target:       { type: 'string', description: 'Word in target language' },
          romanization: { type: 'string', description: 'Pinyin, jyutping, or romanization' },
          english:      { type: 'string', description: 'English definition' },
          example_story:             { type: 'string', description: 'Example sentence from the story' },
          usage_note_story:          { type: 'string', description: 'Grammar/usage note for story example' },
          example_extra:             { type: 'string', description: 'Additional example sentence' },
          usage_note_extra:          { type: 'string', description: 'Grammar/usage note for extra example' },
        },
        required: ['target', 'romanization', 'english', 'example_story'],
      },
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text:        { type: 'string', description: 'Question in target language' },
        },
        required: ['text'],
      },
    },
    grammar_notes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern:     { type: 'string', description: 'Grammar pattern in target language' },
          label:       { type: 'string', description: 'English name of the pattern' },
          explanation: { type: 'string', description: 'One-sentence explanation' },
          example:     { type: 'string', description: 'Example from the story' },
        },
        required: ['pattern', 'label', 'explanation', 'example'],
      },
    },
  },
  required: ['title_target', 'title_en', 'story', 'vocabulary', 'questions', 'grammar_notes'],
};

// ── Structured output provider functions ─────────────────────

function callAnthropicStructured(apiKey, model, systemPrompt, userMessage, maxTokens, signal) {
  const tool = {
    name: 'create_reader',
    description: 'Create a structured graded reader response',
    input_schema: READER_JSON_SCHEMA,
  };
  return fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: userMessage }],
        tools: [tool],
        tool_choice: { type: 'tool', name: 'create_reader' },
      }),
      signal,
    },
    data => {
      const toolBlock = data.content.find(b => b.type === 'tool_use');
      if (!toolBlock) throw new Error('Anthropic did not return structured output');
      return JSON.stringify(toolBlock.input);
    },
    'Anthropic',
  );
}

function callOpenAIStructured(apiKey, model, systemPrompt, userMessage, maxTokens, baseUrl, signal) {
  const url = `${baseUrl || 'https://api.openai.com'}/v1/chat/completions`;
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userMessage });

  return fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'graded_reader',
            strict: true,
            schema: READER_JSON_SCHEMA,
          },
        },
      }),
      signal,
    },
    data => data.choices[0].message.content,
    baseUrl ? 'OpenAI-Compatible' : 'OpenAI',
  );
}

function callGeminiStructured(apiKey, model, systemPrompt, userMessage, maxTokens, signal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
      responseSchema: READER_JSON_SCHEMA,
    },
  };
  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  return fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    },
    data => data.candidates[0].content.parts[0].text,
    'Gemini',
  );
}

async function callLLMStructured(llmConfig, systemPrompt, userMessage, maxTokens = 8192, { signal: externalSignal } = {}) {
  const { provider, apiKey, model, baseUrl } = llmConfig;
  if (!apiKey) throw new Error('No API key provided. Please add your API key in Settings.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  if (externalSignal) {
    if (externalSignal.aborted) { clearTimeout(timeoutId); controller.abort(); }
    else externalSignal.addEventListener('abort', () => { clearTimeout(timeoutId); controller.abort(); }, { once: true });
  }
  const { signal } = controller;

  try {
    switch (provider) {
      case 'anthropic':
        return await callAnthropicStructured(apiKey, model, systemPrompt, userMessage, maxTokens, signal);
      case 'openai':
        return await callOpenAIStructured(apiKey, model, systemPrompt, userMessage, maxTokens, null, signal);
      case 'gemini':
        return await callGeminiStructured(apiKey, model, systemPrompt, userMessage, maxTokens, signal);
      case 'openai_compatible':
        // Falls back to regular call — structured output support varies
        return await callOpenAI(apiKey, model, systemPrompt, userMessage, maxTokens, baseUrl, signal);
      default:
        return await callAnthropicStructured(apiKey, model, systemPrompt, userMessage, maxTokens, signal);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Reader generation ─────────────────────────────────────────

export async function generateReader(llmConfig, topic, level, learnedWords = {}, targetChars = 1200, maxTokens = 8192, previousStory = null, langId = DEFAULT_LANG_ID, { signal, structured = false } = {}) {
  const langConfig = getLang(langId);
  // Build a range string scaled to reader size
  const rangePadding = targetChars <= 300 ? 50 : 100;
  const charRange = `${targetChars - rangePadding}-${targetChars + rangePadding}`;
  const system = buildReaderSystem(langConfig, level, topic, charRange, targetChars);

  const MAX_VOCAB_LIST = 200;
  const learnedList = Object.keys(learnedWords)
    .filter(w => !learnedWords[w].langId || learnedWords[w].langId === langId)
    .sort((a, b) => (learnedWords[b].dateAdded || 0) - (learnedWords[a].dateAdded || 0))
    .slice(0, MAX_VOCAB_LIST);
  const learnedSection = learnedList.length > 0
    ? `\n\nPreviously introduced vocabulary (do not reuse as "new" vocabulary — you may use these words freely in the story but do not list them in the vocabulary section):\n${learnedList.join(', ')}`
    : '';

  const truncatedStory = previousStory && previousStory.length > 600
    ? '[Earlier story truncated]\n…' + previousStory.slice(-600)
    : previousStory;
  const continuationSection = truncatedStory
    ? `\n\nThis is a continuation. Previous episode for narrative context:\n---\n${truncatedStory}\n---\nContinue the story with new events, maintaining the same characters and setting.`
    : '';

  const userMessage = `Generate a graded reader for the topic: ${topic}${learnedSection}${continuationSection}`;

  if (structured) {
    return await callLLMStructured(llmConfig, system, userMessage, maxTokens, { signal });
  }
  return await callLLM(llmConfig, system, userMessage, maxTokens, { signal });
}

// ── Syllabus extension ────────────────────────────────────────

export async function extendSyllabus(llmConfig, topic, level, existingLessons, additionalCount = 3, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const prompt = buildExtendSyllabusPrompt(langConfig, topic, level, existingLessons, additionalCount);

  const raw = await callLLM(llmConfig, '', prompt, 2048);

  let lessons;
  try {
    lessons = JSON.parse(raw.trim());
  } catch {
    const arrMatch = raw.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { lessons = JSON.parse(arrMatch[0]); } catch { /* fall through */ }
    }
    if (!lessons) throw new Error('LLM returned an invalid lesson format. Please try again.');
  }

  if (!Array.isArray(lessons)) throw new Error('Expected an array of lessons. Please try again.');
  return { lessons };
}
