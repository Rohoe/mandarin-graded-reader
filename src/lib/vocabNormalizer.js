/**
 * Vocabulary normalizer.
 * Maps between legacy Chinese-specific field names (chinese/pinyin/english)
 * and generic field names (target/romanization/translation).
 * Also handles backfilling langId on legacy data.
 */

import { getLang, DEFAULT_LANG_ID } from './languages';

/**
 * Normalize a vocabulary word object to use generic field names.
 * Preserves original fields as well for backwards compatibility.
 */
export function normalizeVocabWord(word, langId = DEFAULT_LANG_ID) {
  if (!word) return word;
  const lang = getLang(langId);
  const { target, romanization, translation } = lang.fields;

  return {
    ...word,
    target:        word.target        || word[target]        || '',
    romanization:  word.romanization  || word[romanization]  || '',
    translation:   word.translation   || word[translation]   || '',
    // Keep legacy fields for backwards compatibility
    [target]:       word[target]       || word.target        || '',
    [romanization]: word[romanization] || word.romanization  || '',
    [translation]:  word[translation]  || word.translation   || '',
    langId: word.langId || langId,
  };
}

/**
 * Normalize an anki card to generic fields.
 */
export function normalizeAnkiCard(card, langId = DEFAULT_LANG_ID) {
  if (!card) return card;
  const lang = getLang(langId);
  const { target, romanization, translation } = lang.fields;

  return {
    ...card,
    target:        card[target]       || card.target        || '',
    romanization:  card[romanization] || card.romanization  || '',
    translation:   card[translation]  || card.translation   || '',
    // Keep original fields
    [target]:       card[target]       || card.target        || '',
    [romanization]: card[romanization] || card.romanization  || '',
    [translation]:  card[translation]  || card.translation   || '',
  };
}

/**
 * Normalize a syllabus to ensure it has langId and generic title fields.
 */
export function normalizeSyllabus(syllabus) {
  if (!syllabus) return syllabus;
  const langId = syllabus.langId || DEFAULT_LANG_ID;
  const lang = getLang(langId);

  return {
    ...syllabus,
    langId,
    lessons: (syllabus.lessons || []).map(lesson => ({
      ...lesson,
      title_target: lesson.title_target || lesson[lang.prompts.titleFieldKey] || lesson.title_zh || '',
      // Keep legacy field
      title_zh: lesson.title_zh || lesson.title_target || lesson[lang.prompts.titleFieldKey] || '',
    })),
  };
}

/**
 * Normalize a standalone reader metadata object.
 */
export function normalizeStandaloneReader(reader) {
  if (!reader) return reader;
  return {
    ...reader,
    langId: reader.langId || DEFAULT_LANG_ID,
  };
}

/**
 * Normalize all syllabi in a list (for hydration migration).
 */
export function normalizeSyllabi(syllabi) {
  if (!Array.isArray(syllabi)) return syllabi;
  return syllabi.map(normalizeSyllabus);
}

/**
 * Normalize standalone readers list.
 */
export function normalizeStandaloneReaders(readers) {
  if (!Array.isArray(readers)) return readers;
  return readers.map(normalizeStandaloneReader);
}
