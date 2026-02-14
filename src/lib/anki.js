/**
 * Anki export logic.
 * Generates tab-separated .txt files for Anki import.
 */

// ── Duplicate filtering ───────────────────────────────────────

export function prepareExport(ankiJson, exportedWords) {
  const toExport  = [];
  const skipped   = [];

  for (const card of ankiJson) {
    if (!card.chinese) continue;
    if (exportedWords.has(card.chinese)) {
      skipped.push(card.chinese);
    } else {
      toExport.push(card);
    }
  }

  return { toExport, skipped };
}

// ── File generation ───────────────────────────────────────────

export function generateAnkiExport(ankiJson, topic, level, exportedWords, { forceAll = false } = {}) {
  const { toExport: newCards, skipped } = prepareExport(ankiJson, exportedWords);

  const today     = new Date().toISOString().split('T')[0];
  const topicTag  = topic.replace(/[\s/\\:*?"<>|]+/g, '_').replace(/_+/g, '_');
  const filename  = `anki_cards_${topicTag}_HSK${level}_${today}.txt`;

  const toExport = forceAll ? ankiJson.filter(c => c.chinese) : newCards;

  let content = null;
  if (toExport.length > 0) {
    const lines = toExport.map(card => formatRow(card, level, topicTag, today));
    content = lines.join('\n');
  }

  return {
    content,
    filename,
    stats:          { exported: toExport.length, skipped: forceAll ? 0 : skipped.length },
    exportedChinese: new Set(toExport.map(c => c.chinese)),
  };
}

function formatRow(card, level, topicTag, date) {
  const exampleParts = [];
  if (card.example_story) {
    exampleParts.push(card.example_story);
    if (card.usage_note_story) exampleParts.push(`<i>${card.usage_note_story}</i>`);
  }
  if (card.example_extra) {
    if (exampleParts.length > 0) exampleParts.push('');
    exampleParts.push(card.example_extra);
    if (card.usage_note_extra) exampleParts.push(`<i>${card.usage_note_extra}</i>`);
  }
  const examples = exampleParts.join('<br>');

  const tags = `HSK${level} ${topicTag} ${date}`;

  return [
    sanitize(card.chinese),
    sanitize(card.pinyin),
    sanitize(card.english),
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
