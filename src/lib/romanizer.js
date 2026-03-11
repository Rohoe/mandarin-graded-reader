/**
 * Async romanization loader.
 * Lazy-loads the romanization library for the active language.
 * Returns { romanize(text): string[] } — an array of romanization per character.
 */

import { getLang } from './languages';

const cache = {};

export async function loadRomanizer(langId) {
  if (cache[langId]) return cache[langId];
  const langConfig = getLang(langId);
  if (!langConfig.getRomanizer) return null;
  const romanizer = await langConfig.getRomanizer();
  cache[langId] = romanizer;
  return romanizer;
}
