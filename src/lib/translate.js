const LANG_MAP = {
  zh: 'zh-CN',
  yue: 'yue',
  ko: 'ko',
};

function stripMarkdown(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

export async function translateText(text, langId) {
  const sl = LANG_MAP[langId] || 'zh-CN';
  const clean = stripMarkdown(text).trim();
  if (!clean) return '';

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=en&dt=t&q=${encodeURIComponent(clean)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation failed (${res.status})`);

  const data = await res.json();
  // Response shape: [[["translated segment", "source segment", ...], ...], ...]
  const segments = data[0];
  if (!Array.isArray(segments)) throw new Error('Unexpected translation response');

  return segments.map(seg => seg[0]).join('');
}
