const LANG_MAP = {
  zh: 'zh-CN',
  yue: 'yue',
  ko: 'ko',
  fr: 'fr',
  es: 'es',
  en: 'en',
  ja: 'ja',
};

function stripMarkdown(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

/**
 * Translate text using Google Translate.
 * @param {string} text - Text to translate
 * @param {string} langId - Source language ID (legacy: target lang in reader context)
 * @param {object} [options] - Optional { from, to } locale codes for explicit direction
 */
export async function translateText(text, langId, options) {
  const sl = options?.from || LANG_MAP[langId] || 'zh-CN';
  const tl = options?.to || 'en';
  const clean = stripMarkdown(text).trim();
  if (!clean) return '';

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation failed (${res.status})`);

  const data = await res.json();
  // Response shape: [[["translated segment", "source segment", ...], ...], ...]
  const segments = data[0];
  if (!Array.isArray(segments)) throw new Error('Unexpected translation response');

  return segments.map(seg => seg[0]).join('');
}

/**
 * Batch translate multiple texts in a single API call (newline-joined).
 */
export async function batchTranslate(texts, { from = 'en', to = 'en' } = {}) {
  if (!texts || texts.length === 0) return [];
  const joined = texts.join('\n');
  const result = await translateText(joined, null, { from, to });
  return result.split('\n');
}
