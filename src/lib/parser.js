/**
 * Parses Claude's markdown response into structured data.
 * All functions return sensible defaults on parse failure.
 */

import { getLang, DEFAULT_LANG_ID } from './languages';

// ── Main reader parser ────────────────────────────────────────

export function parseReaderResponse(rawText, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const scriptRegex = langConfig.scriptRegex;

  console.log('[parser] parseReaderResponse called, length:', rawText?.length);
  const headingLines = rawText?.split('\n').filter(l => /^#{1,4}\s/.test(l));
  console.log('[parser] all headings in response:', headingLines);

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
      result.titleZh = lines[0] || '';
      result.titleEn = lines[1] || '';
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
    console.log('[parser] section4 match:', questionsSectionMatch ? 'YES' : 'NO');
    if (questionsSectionMatch) {
      console.log('[parser] section4 text:', JSON.stringify(questionsSectionMatch[1]));
      result.questions = parseQuestions(questionsSectionMatch[1]);
    }
    console.log('[parser] questions result:', result.questions);

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

    if (result.vocabulary.length === 0 && result.ankiJson.length > 0) {
      result.vocabulary = result.ankiJson.map(card => ({
        chinese:                  card[targetField] || card.chinese || card.korean || '',
        pinyin:                   card[romField] || card.pinyin || card.romanization || '',
        english:                  card[transField] || card.english || '',
        exampleStory:             card.example_story || '',
        exampleStoryTranslation:  card.example_story_translation || '',
        exampleExtra:             card.example_extra || '',
        exampleExtraTranslation:  card.example_extra_translation || '',
        usageNoteStory:           card.usage_note_story || '',
        usageNoteExtra:           card.usage_note_extra || '',
      }));
    } else if (result.vocabulary.length > 0 && result.ankiJson.length > 0) {
      // Enrich vocabulary items with usage notes + fill missing pinyin from the Anki JSON block
      const ankiByWord = new Map(result.ankiJson.map(c => [c[targetField] || c.chinese || c.korean, c]));
      const enriched = result.vocabulary.map(word => {
        const card = ankiByWord.get(word.chinese);
        if (!card) return word;
        return {
          ...word,
          pinyin:                  word.pinyin || card[romField] || card.pinyin || card.romanization || '',
          exampleStoryTranslation: card.example_story_translation || word.exampleStoryTranslation || '',
          exampleExtraTranslation: card.example_extra_translation || word.exampleExtraTranslation || '',
          usageNoteStory:          card.usage_note_story || word.usageNoteStory,
          usageNoteExtra:          card.usage_note_extra || word.usageNoteExtra,
        };
      });
      // Append any words present in ankiJson but absent from the vocabulary section
      const vocabChinese = new Set(enriched.map(v => v.chinese));
      const missing = result.ankiJson
        .filter(card => !vocabChinese.has(card[targetField] || card.chinese || card.korean))
        .map(card => ({
          chinese:                  card[targetField] || card.chinese || card.korean || '',
          pinyin:                   card[romField] || card.pinyin || card.romanization || '',
          english:                  card[transField] || card.english || '',
          exampleStory:             card.example_story || '',
          exampleStoryTranslation:  card.example_story_translation || '',
          exampleExtra:             card.example_extra || '',
          exampleExtraTranslation:  card.example_extra_translation || '',
          usageNoteStory:           card.usage_note_story || '',
          usageNoteExtra:           card.usage_note_extra || '',
        }));
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
  const patternA = /\*\*([^*\n]+)\*\*\s*[(\[]([^)\]\n]{1,40})[)\]]\s*[-–—:]\s*([^\n]+)/g;
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
    // Detect usage note lines: start with italic marker (*text*) after optional bullet
    const stripped = trimmed.replace(/^[-•]\s*/, '');
    if (/^\*[^*]/.test(stripped) && /\*\s*$/.test(stripped)) {
      // This is a usage note (italic line), attach to the last example
      usageNotes.push(stripped.replace(/^\*\s*/, '').replace(/\s*\*$/, ''));
      continue;
    }
    // Only collect lines that contain target script characters — skip English-only lines
    if (!scriptRegex.test(trimmed)) continue;
    if (examples.length < 2) examples.push(stripped);
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
    if (cleaned && cleaned.length > 2) questions.push(cleaned);
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
