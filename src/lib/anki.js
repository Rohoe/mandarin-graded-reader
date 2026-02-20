/**
 * Anki export logic.
 * Generates tab-separated .txt files for Anki import.
 */

import { getLang, DEFAULT_LANG_ID } from './languages';

// ── Duplicate filtering ───────────────────────────────────────

export function prepareExport(ankiJson, exportedWords, langId = DEFAULT_LANG_ID) {
  const langConfig = getLang(langId);
  const targetField = langConfig.fields.target;
  const toExport  = [];
  const skipped   = [];

  for (const card of ankiJson) {
    const targetWord = card[targetField] || card.chinese || card.korean || '';
    if (!targetWord) continue;
    if (exportedWords.has(targetWord)) {
      skipped.push(targetWord);
    } else {
      toExport.push(card);
    }
  }

  return { toExport, skipped };
}

// ── File generation ───────────────────────────────────────────

function grammarNotesToCards(grammarNotes) {
  if (!grammarNotes?.length) return [];
  return grammarNotes.map(note => ({
    target:           note.pattern,
    chinese:          note.pattern,
    romanization:     '',
    pinyin:           '',
    translation:      note.label,
    english:          note.label,
    example_story:    note.example     || '',
    usage_note_story: note.explanation || '',
    example_extra:    '',
    usage_note_extra: '',
    _isGrammar:       true,
  }));
}

// Returns space-joined romanization of target-script characters only (for Anki plain text).
function romanizeForExport(text, romanizer, scriptRegex) {
  if (!romanizer || !text) return '';
  const chars = [...text];
  const romArr = romanizer.romanize(text);
  const parts = [];
  for (let i = 0; i < chars.length; i++) {
    if (scriptRegex.test(chars[i]) && romArr[i]) {
      parts.push(romArr[i]);
    }
  }
  return parts.join(' ');
}

export function generateAnkiExport(ankiJson, topic, level, exportedWords, { forceAll = false, grammarNotes = [], langId = DEFAULT_LANG_ID, verboseVocab = false, romanizer = null, vocabTranslations = {} } = {}) {
  const langConfig = getLang(langId);
  const targetField = langConfig.fields.target;
  const profName = langConfig.proficiency.name;

  const allCards = [...ankiJson, ...grammarNotesToCards(grammarNotes)];
  const { toExport: newCards, skipped } = prepareExport(allCards, exportedWords, langId);

  const today     = new Date().toISOString().split('T')[0];
  const topicTag  = topic.replace(/[\s/\\:*?"<>|]+/g, '_').replace(/_+/g, '_');
  const filename  = `anki_cards_${topicTag}_${profName}${level}_${today}.txt`;

  const toExport = forceAll ? allCards.filter(c => (c[targetField] || c.chinese || c.korean)) : newCards;

  const scriptRegex = langConfig.scriptRegex;

  let content = null;
  if (toExport.length > 0) {
    const lines = toExport.map((card, idx) => formatRow(card, level, topicTag, today, langConfig, verboseVocab, romanizer, scriptRegex, vocabTranslations, idx));
    content = lines.join('\n');
  }

  return {
    content,
    filename,
    stats:          { exported: toExport.length, skipped: forceAll ? 0 : skipped.length },
    exportedChinese: new Set(toExport.map(c => c[targetField] || c.chinese || c.korean)),
  };
}

function formatRow(card, level, topicTag, date, langConfig, verboseVocab = false, romanizer = null, scriptRegex = null, vocabTranslations = {}, cardIndex = 0) {
  const targetField = langConfig.fields.target;
  const romField = langConfig.fields.romanization;
  const transField = langConfig.fields.translation;
  const profName = langConfig.proficiency.name;

  const exampleParts = [];
  if (card.example_story) {
    exampleParts.push(card.example_story);
    if (verboseVocab && romanizer && scriptRegex) {
      const rom = romanizeForExport(card.example_story, romanizer, scriptRegex);
      if (rom) exampleParts.push(`<i>${rom}</i>`);
    }
    const storyTrans = vocabTranslations[`story-${cardIndex}`] || card.example_story_translation;
    if (verboseVocab && storyTrans) exampleParts.push(`<i>${storyTrans}</i>`);
    if (card.usage_note_story) exampleParts.push(`<i>${card.usage_note_story}</i>`);
  }
  if (card.example_extra) {
    if (exampleParts.length > 0) exampleParts.push('');
    exampleParts.push(card.example_extra);
    if (verboseVocab && romanizer && scriptRegex) {
      const rom = romanizeForExport(card.example_extra, romanizer, scriptRegex);
      if (rom) exampleParts.push(`<i>${rom}</i>`);
    }
    const extraTrans = vocabTranslations[`extra-${cardIndex}`] || card.example_extra_translation;
    if (verboseVocab && extraTrans) exampleParts.push(`<i>${extraTrans}</i>`);
    if (card.usage_note_extra) exampleParts.push(`<i>${card.usage_note_extra}</i>`);
  }
  const examples = exampleParts.join('<br>');

  const tags = card._isGrammar
    ? `${profName}${level} ${topicTag} ${date} Grammar`
    : `${profName}${level} ${topicTag} ${date}`;

  return [
    sanitize(card[targetField] || card.chinese || card.korean || ''),
    sanitize(card[romField] || card.pinyin || card.romanization || ''),
    sanitize(card[transField] || card.english || ''),
    sanitize(examples),
    sanitize(tags),
  ].join('\t');
}

function sanitize(str) {
  return (str || '').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
}

// ── Browser download ──────────────────────────────────────────

export function downloadFile(content, filename) {
  const bom  = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
