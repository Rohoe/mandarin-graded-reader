/**
 * Parses Claude's markdown response into structured data.
 * All functions return sensible defaults on parse failure.
 */

// ── Main reader parser ────────────────────────────────────────

export function parseReaderResponse(rawText) {
  const result = {
    raw:        rawText,
    titleZh:    '',
    titleEn:    '',
    story:      '',
    vocabulary: [],
    questions:  [],
    ankiJson:   [],
    parseError: null,
  };

  if (!rawText) {
    result.parseError = 'Empty response from API.';
    return result;
  }

  try {
    // ── 1. Title ──────────────────────────────────────────────
    // Look for "### 1. Title" section, or just grab the first heading
    const titleSectionMatch = rawText.match(/###\s*1\.\s*Title\s*\n+([\s\S]*?)(?=###\s*2\.)/i);
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
    const storySectionMatch = rawText.match(/###\s*2\.\s*Story\s*\n+([\s\S]*?)(?=###\s*3\.)/i);
    if (storySectionMatch) {
      result.story = storySectionMatch[1].trim();
    } else {
      // Fallback: try to find large Chinese text block
      const chineseBlock = rawText.match(/([\u4e00-\u9fff\s*_.,，。！？、；：""''（）【】]{200,})/);
      if (chineseBlock) result.story = chineseBlock[1].trim();
    }

    // ── 3. Vocabulary ─────────────────────────────────────────
    const vocabSectionMatch = rawText.match(/###\s*3\.\s*Vocabulary[^\n]*\n+([\s\S]*?)(?=###\s*4\.)/i);
    if (vocabSectionMatch) {
      result.vocabulary = parseVocabularySection(vocabSectionMatch[1]);
    }

    // ── 4. Comprehension Questions ────────────────────────────
    const questionsSectionMatch = rawText.match(/###\s*4\.\s*Comprehension[^\n]*\n+([\s\S]*?)(?=###\s*5\.|```anki-json|$)/i);
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

    // If vocab list is empty but we have anki data, synthesise from anki
    if (result.vocabulary.length === 0 && result.ankiJson.length > 0) {
      result.vocabulary = result.ankiJson.map(card => ({
        chinese:        card.chinese,
        pinyin:         card.pinyin,
        english:        card.english,
        exampleStory:   card.example_story || '',
        exampleExtra:   card.example_extra || '',
        usageNoteStory: card.usage_note_story || '',
        usageNoteExtra: card.usage_note_extra || '',
      }));
    }
  } catch (err) {
    result.parseError = err.message;
  }

  return result;
}

// ── Vocabulary section parser ─────────────────────────────────

function parseVocabularySection(text) {
  const items = [];
  if (!text) return items;

  // Split by numbered items or bold word markers
  // Pattern: **word** (pinyin) - definition
  const wordPattern = /\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*[-–—]\s*([^\n]+)/g;
  let match;

  while ((match = wordPattern.exec(text)) !== null) {
    const chinese = match[1].trim();
    const pinyin  = match[2].trim();
    const english = match[3].trim();

    // Try to extract the two example sentences that follow this entry
    const afterWord = text.slice(match.index + match[0].length);
    const examples  = extractExamples(afterWord);

    items.push({
      chinese,
      pinyin,
      english,
      exampleStory:   examples[0] || '',
      exampleExtra:   examples[1] || '',
      usageNoteStory: '',
      usageNoteExtra: '',
    });
  }

  return items;
}

function extractExamples(text) {
  // Grab the next 1-3 non-empty lines before the next bold word entry
  const lines = text.split('\n');
  const examples = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Stop if we hit the next vocab entry
    if (/^\*\*/.test(trimmed) || /^\d+\./.test(trimmed)) break;
    // Skip sub-headers
    if (/^#{1,4}/.test(trimmed)) break;
    if (examples.length < 2) examples.push(trimmed.replace(/^[-•]\s*/, ''));
    else break;
  }

  return examples;
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
