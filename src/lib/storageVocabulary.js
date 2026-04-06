import { load, saveWithFile, getDirectoryHandle } from './storageHelpers';
import { writeJSON, FILES } from './fileStorage';

const KEYS = {
  VOCABULARY: 'gradedReader_learnedVocabulary',
  EXPORTED: 'gradedReader_exportedWords',
};

export function loadLearnedVocabulary() {
  return load(KEYS.VOCABULARY, {});
}

export function addLearnedVocabulary(wordList) {
  const existing = loadLearnedVocabulary();
  const now = new Date().toISOString();
  for (const word of wordList) {
    const key = word.target || word.chinese || word.korean || '';
    if (key && !existing[key]) {
      existing[key] = {
        pinyin:    word.romanization || word.pinyin  || '',
        english:   word.translation  || word.english || '',
        langId:    word.langId  || undefined,
        dateAdded: now,
      };
    }
  }
  saveWithFile(KEYS.VOCABULARY, existing, 'vocabulary');
  return existing;
}

export function mergeVocabulary(existing, wordList) {
  const merged = { ...existing };
  const now = new Date().toISOString();
  for (const word of wordList) {
    const key = word.target || word.chinese || word.korean || '';
    if (key && !merged[key]) {
      merged[key] = {
        pinyin:    word.romanization || word.pinyin  || '',
        english:   word.translation  || word.english || '',
        langId:    word.langId  || undefined,
        dateAdded: now,
        interval:    0,
        ease:        2.5,
        nextReview:  null,
        reviewCount: 0,
        lapses:      0,
        ...(word.exampleSentence ? { exampleSentence: word.exampleSentence } : {}),
        ...(word.exampleSentenceTranslation ? { exampleSentenceTranslation: word.exampleSentenceTranslation } : {}),
        ...(word.exampleExtra ? { exampleExtra: word.exampleExtra } : {}),
        ...(word.exampleExtraTranslation ? { exampleExtraTranslation: word.exampleExtraTranslation } : {}),
      };
    }
  }
  return merged;
}

export function saveLearnedVocabulary(vocab) {
  saveWithFile(KEYS.VOCABULARY, vocab, 'vocabulary');
}

export function mergeExportedWords(existing, newWords) {
  const merged = new Set(existing);
  for (const w of newWords) merged.add(w);
  return merged;
}

export function saveExportedWordsFull(wordSet) {
  const arr = [...wordSet];
  saveWithFile(KEYS.EXPORTED, arr, 'exported');
}

export function clearLearnedVocabulary() {
  localStorage.removeItem(KEYS.VOCABULARY);
  const _dirHandle = getDirectoryHandle();
  if (_dirHandle) {
    writeJSON(_dirHandle, FILES.vocabulary, {})
      .catch(e => console.warn('[storage] file write failed: vocabulary', e));
  }
}

export function loadExportedWords() {
  return new Set(load(KEYS.EXPORTED, []));
}

export function addExportedWords(wordSet) {
  const existing = loadExportedWords();
  for (const w of wordSet) existing.add(w);
  const arr = [...existing];
  saveWithFile(KEYS.EXPORTED, arr, 'exported');
  return existing;
}

export function clearExportedWords() {
  localStorage.removeItem(KEYS.EXPORTED);
  const _dirHandle = getDirectoryHandle();
  if (_dirHandle) {
    writeJSON(_dirHandle, FILES.exported, [])
      .catch(e => console.warn('[storage] file write failed: exported', e));
  }
}
