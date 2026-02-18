/**
 * Parses Claude's markdown response into structured data.
 * All functions return sensible defaults on parse failure.
 */

import { getLang, DEFAULT_LANG_ID } from './languages';

// ── Main reader parser ────────────────────────────────────────

export function parseReaderResponse(rawText, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const scriptRegex = langConfig.scriptRegex;

  const result = {
    raw:          rawText,
    titleZh:      '',
    titleEn:      '',
    story:        '',
    vocabulary:   [],
    questions:    [],
    ankiJson:     [],
    grammarNotes: [],
    parseError:   null,
    langId,
  };

  if (!rawText) {
    result.parseError = 'Empty response from API.';
    return result;
  }

  try {
    // ── 1. Title ──────────────────────────────────────────────
    const titleSectionMatch = rawText.match(/#{2,4}\s*1\.\s*Title\s*\n+([\s\S]*?)(?=#{2,4}\s*2\.)/i);
    if (titleSectionMatch) {
      const titleBlock = titleSectionMatch[1].trim();
      const lines = titleBlock.split('\n').map(l => l.trim()).filter(Boolean);
      result.titleZh = (lines[0] || '').replace(/\*\*/g, '').replace(/^\*|\*$/g, '');
      result.titleEn = (lines[1] || '').replace(/\*\*/g, '').replace(/^\*|\*$/g, '');
    } else {
      // Fallback: first # heading
      const h1 = rawText.match(/^#{1,3}\s+(.+)$/m);
      if (h1) result.titleZh = h1[1].trim();
    }

    // ── 2. Story ──────────────────────────────────────────────
    const storySectionMatch = rawText.match(/#{2,4}\s*2\.\s*Story\s*\n+([\s\S]*?)(?=#{2,4}\s*3\.)/i);
    if (storySectionMatch) {
      result.story = storySectionMatch[1].trim();
    } else {
      // Fallback: strip heading lines from top, take text up to the next ## section
      const withoutTopHeadings = rawText.replace(/^(#{1,4}[^\n]*\n)+\s*/, '');
      const bodyMatch = withoutTopHeadings.match(/^([\s\S]*?)(?=\n#{1,4}\s)/);
      if (bodyMatch) result.story = bodyMatch[1].trim();
      else {
        // Build a regex for detecting 200+ target script chars
        const scriptCharClass = scriptRegex.source;
        const blockRegex = new RegExp(`([${scriptCharClass.slice(1, -1)}\\s*_.,，。！？、；：""''（）【】]{200,})`);
        const scriptBlock = rawText.match(blockRegex);
        if (scriptBlock) result.story = scriptBlock[1].trim();
      }
    }

    // Strip any stray leading heading lines from the story
    result.story = result.story.replace(/^(#{1,4}[^\n]*\n\n?)+/, '').trim();

    // ── 3. Vocabulary ─────────────────────────────────────────
    const vocabSectionMatch = rawText.match(
      /#{2,4}\s*(?:3\.[^\n]*|词汇[表列]?)\s*\n+([\s\S]*?)(?=#{2,4}\s*(?:4\.|理解|comprehension|```anki-json)|```anki-json|$)/i
    );
    if (vocabSectionMatch) {
      result.vocabulary = parseVocabularySection(vocabSectionMatch[1], scriptRegex);
    }

    // ── 4. Comprehension Questions ────────────────────────────
    const questionsSectionMatch = rawText.match(
      /#{2,4}\s*(?:4\.[^\n]*|理解[题问]?[^\n]*)\s*\n+([\s\S]*?)(?=#{2,4}\s*(?:5\.|anki)|```anki-json|$)/i
    );
    if (questionsSectionMatch) {
      result.questions = parseQuestions(questionsSectionMatch[1]);
    }

    // ── 5. Anki JSON ──────────────────────────────────────────
    const ankiMatch = rawText.match(/```anki-json\s*\n([\s\S]*?)\n```/);
    if (ankiMatch) {
      try {
        result.ankiJson = JSON.parse(ankiMatch[1]);
      } catch {
        result.ankiJson = [];
      }
    }

    // ── 6. Grammar Notes ──────────────────────────────────────
    const grammarSectionMatch = rawText.match(
      /#{2,4}\s*6\.[^\n]*\s*\n+([\s\S]*?)(?=#{2,4}\s*7\.|$)/i
    );
    if (grammarSectionMatch) {
      result.grammarNotes = parseGrammarNotes(grammarSectionMatch[1]);
    }

    // If vocab list is empty but we have anki data, synthesise from anki
    const targetField = langConfig.fields.target;
    const romField = langConfig.fields.romanization;
    const transField = langConfig.fields.translation;

    function makeVocabFromCard(card) {
      const t = card[targetField] || card.chinese || card.korean || '';
      const r = card[romField] || card.pinyin || card.romanization || '';
      const tr = card[transField] || card.english || '';
      return {
        target: t, romanization: r, translation: tr,
        chinese: t, pinyin: r, english: tr,
        exampleStory:             stripExamplePrefix(card.example_story || ''),
        exampleStoryTranslation:  card.example_story_translation || '',
        exampleExtra:             stripExamplePrefix(card.example_extra || ''),
        exampleExtraTranslation:  card.example_extra_translation || '',
        usageNoteStory:           card.usage_note_story || '',
        usageNoteExtra:           card.usage_note_extra || '',
      };
    }

    if (result.vocabulary.length === 0 && result.ankiJson.length > 0) {
      result.vocabulary = result.ankiJson.map(makeVocabFromCard);
    } else if (result.vocabulary.length > 0 && result.ankiJson.length > 0) {
      // Enrich vocabulary items with usage notes + fill missing pinyin from the Anki JSON block
      const ankiByWord = new Map(result.ankiJson.map(c => [c[targetField] || c.chinese || c.korean, c]));
      const enriched = result.vocabulary.map(word => {
        const card = ankiByWord.get(word.target || word.chinese);
        if (!card) return word;
        const rom = word.romanization || word.pinyin || card[romField] || card.pinyin || card.romanization || '';
        return {
          ...word,
          target: word.target || word.chinese,
          romanization: rom,
          translation: word.translation || word.english,
          pinyin: rom,
          exampleStoryTranslation: card.example_story_translation || word.exampleStoryTranslation || '',
          exampleExtraTranslation: card.example_extra_translation || word.exampleExtraTranslation || '',
          usageNoteStory:          card.usage_note_story || word.usageNoteStory,
          usageNoteExtra:          card.usage_note_extra || word.usageNoteExtra,
        };
      });
      // Append any words present in ankiJson but absent from the vocabulary section
      const vocabTargets = new Set(enriched.map(v => v.target || v.chinese));
      const missing = result.ankiJson
        .filter(card => !vocabTargets.has(card[targetField] || card.chinese || card.korean))
        .map(makeVocabFromCard);
      result.vocabulary = missing.length > 0 ? [...enriched, ...missing] : enriched;
    }
  } catch (err) {
    result.parseError = err.message;
  }

  return result;
}

// ── Vocabulary section parser ─────────────────────────────────

function parseVocabularySection(text, scriptRegex) {
  const items = [];
  const seen  = new Set();
  if (!text) return items;

  function pushItem(chinese, pinyin, english, afterText) {
    if (seen.has(chinese)) return;
    seen.add(chinese);
    const { examples, usageNotes } = extractExamples(afterText, scriptRegex);
    items.push({
      target: chinese,
      romanization: pinyin,
      translation: english,
      chinese,
      pinyin,
      english,
      exampleStory:   examples[0] || '',
      exampleExtra:   examples[1] || '',
      usageNoteStory: usageNotes[0] || '',
      usageNoteExtra: usageNotes[1] || '',
    });
  }

  // Pattern A: **word** (pinyin) — definition  [() or [], any dash/colon separator]
  const patternA = /\*\*([^*\n]+)\*\*\s*[([]([^)\]\n]{1,40})[)\]]\s*[-–—:]\s*([^\n]+)/g;
  let match;
  while ((match = patternA.exec(text)) !== null) {
    pushItem(
      match[1].trim(),
      match[2].trim(),
      match[3].trim(),
      text.slice(match.index + match[0].length),
    );
  }

  // Pattern B: **word** — definition  (no pinyin brackets; pinyin filled later from ankiJson)
  const patternB = /\*\*([^*\n]+)\*\*\s*[-–—]\s*([^\n*[({]+)/g;
  while ((match = patternB.exec(text)) !== null) {
    pushItem(
      match[1].trim(),
      '',
      match[2].trim(),
      text.slice(match.index + match[0].length),
    );
  }

  return items;
}

// Strip verbose prefixes that some LLMs (especially Gemini) add to example lines
function stripExamplePrefix(text) {
  return text
    .replace(/^[-•*]\s*/, '')                                           // bullet markers
    .replace(/^(?:example\s+sentence\s+(?:from\s+story|FROM\s+STORY)\s*:\s*)/i, '')  // "Example sentence FROM STORY:"
    .replace(/^(?:additional\s+example\s+(?:sentence\s*)?:\s*)/i, '')   // "Additional example sentence:"
    .replace(/^(?:example\s+(?:sentence\s*)?:\s*)/i, '')                // "Example sentence:" / "Example:"
    .trim();
}

function extractExamples(text, scriptRegex) {
  const lines = text.split('\n');
  const examples = [];
  const usageNotes = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Stop if we hit the next vocab entry
    if (/^\*\*/.test(trimmed) || /^\d+\./.test(trimmed)) break;
    // Skip sub-headers
    if (/^#{1,4}/.test(trimmed)) break;
    // Detect usage note lines: italic (*text*) or "Brief usage note" / "Usage note" prefix
    const bulletStripped = trimmed.replace(/^[-•*]\s*/, '');
    if (/^\*[^*]/.test(bulletStripped) && /\*\s*$/.test(bulletStripped)) {
      usageNotes.push(bulletStripped.replace(/^\*\s*/, '').replace(/\s*\*$/, ''));
      continue;
    }
    if (/^(?:brief\s+)?usage\s+note\b/i.test(bulletStripped)) {
      // "Brief usage note for the story example — ..." or "...:" → extract after dash or colon
      const noteText = bulletStripped.replace(/^(?:brief\s+)?usage\s+note[^—–:,-]*[—–:,-]\s*/i, '').trim();
      if (noteText) usageNotes.push(noteText);
      continue;
    }
    // Only collect lines that contain target script characters — skip English-only lines
    if (!scriptRegex.test(trimmed)) continue;
    const cleaned = stripExamplePrefix(trimmed);
    if (examples.length < 2) examples.push(cleaned);
    else break;
  }

  return { examples, usageNotes };
}

// ── Comprehension question parser ─────────────────────────────

function parseQuestions(text) {
  if (!text) return [];

  const questions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Strip leading number/bullet
    const cleaned = line.replace(/^[\d]+[.、)]\s*/, '').replace(/^[-•]\s*/, '').trim();
    if (cleaned && cleaned.length > 2) {
      // Extract trailing English translation in parentheses: 问题？(Translation?)
      const transMatch = cleaned.match(/^(.*?\S)\s*\(([^)]+)\)\s*$/);
      if (transMatch) {
        questions.push({ text: transMatch[1], translation: transMatch[2] });
      } else {
        questions.push({ text: cleaned, translation: '' });
      }
    }
  }

  return questions;
}

// ── Grammar notes parser ──────────────────────────────────────

function parseGrammarNotes(text) {
  if (!text) return [];
  const items = [];
  // Match: **Pattern** (English name) — explanation
  const headerPattern = /\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*[-–—]\s*([^\n]+)/g;
  let match;
  while ((match = headerPattern.exec(text)) !== null) {
    const pattern     = match[1].trim();
    const label       = match[2].trim();
    const explanation = match[3].trim();
    // Next non-empty line after the header is the example
    const afterHeader = text.slice(match.index + match[0].length);
    const exampleLine = afterHeader.split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
    items.push({ pattern, label, explanation, example: exampleLine });
  }
  return items;
}

// ── Story text rendering helpers ──────────────────────────────

/**
 * Converts markdown bold (**word**) and italic (*word*) in story text
 * to React-safe HTML string segments.
 * Returns an array of { type: 'text'|'bold'|'italic', content: string }
 */
export function parseStorySegments(storyText) {
  if (!storyText) return [];

  const segments = [];
  // Match **bold** or *italic* or plain text
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|[^*]+)/g;
  let m;

  while ((m = pattern.exec(storyText)) !== null) {
    if (m[2] !== undefined) {
      segments.push({ type: 'bold', content: m[2] });
    } else if (m[3] !== undefined) {
      segments.push({ type: 'italic', content: m[3] });
    } else {
      segments.push({ type: 'text', content: m[0] });
    }
  }

  return segments;
}

// ── Structured output normalizer ─────────────────────────────

/**
 * Converts a structured JSON reader response (from tool use / json_schema)
 * into the same shape as parseReaderResponse returns.
 */
export function normalizeStructuredReader(rawJson, langId = DEFAULT_LANG_ID) {
  let data;
  try {
    data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch {
    // Fallback to regex parser if JSON is invalid
    return parseReaderResponse(rawJson, langId);
  }

  const vocabulary = (data.vocabulary || []).map(v => ({
    target:       v.target || v.chinese || v.korean || '',
    chinese:      v.target || v.chinese || '',
    korean:       v.korean || v.target || '',
    romanization: v.romanization || v.pinyin || v.jyutping || '',
    pinyin:       v.romanization || v.pinyin || '',
    translation:  v.english || '',
    english:      v.english || '',
    exampleStory:             v.example_story || '',
    exampleStoryTranslation:  v.example_story_translation || '',
    usageNoteStory:           v.usage_note_story || '',
    exampleExtra:             v.example_extra || '',
    exampleExtraTranslation:  v.example_extra_translation || '',
    usageNoteExtra:           v.usage_note_extra || '',
  }));

  const ankiJson = vocabulary.map(v => ({
    chinese:      v.target,
    korean:       v.target,
    target:       v.target,
    pinyin:       v.romanization,
    romanization: v.romanization,
    english:      v.translation,
    translation:  v.translation,
    example_story:             v.exampleStory,
    example_story_translation: v.exampleStoryTranslation,
    usage_note_story:          v.usageNoteStory,
    example_extra:             v.exampleExtra,
    example_extra_translation: v.exampleExtraTranslation,
    usage_note_extra:          v.usageNoteExtra,
  }));

  const questions = (data.questions || []).map(q => ({
    text:        q.text || '',
    translation: q.translation || '',
  }));

  const grammarNotes = (data.grammar_notes || []).map(n => ({
    pattern:     n.pattern || '',
    label:       n.label || '',
    explanation: n.explanation || '',
    example:     n.example || '',
  }));

  return {
    raw:          typeof rawJson === 'string' ? rawJson : JSON.stringify(data),
    titleZh:      data.title_target || '',
    titleEn:      data.title_en || '',
    story:        data.story || '',
    vocabulary,
    questions,
    ankiJson,
    grammarNotes,
    parseError:   null,
    langId,
  };
}
