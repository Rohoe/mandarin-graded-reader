/**
 * localStorage helpers for all persisted app state.
 * All functions degrade gracefully if storage is unavailable.
 */

const KEYS = {
  API_KEY:     'gradedReader_apiKey',
  SYLLABUS:    'gradedReader_syllabus',
  LESSON_IDX:  'gradedReader_lessonIndex',
  READERS:     'gradedReader_readers',
  VOCABULARY:  'gradedReader_learnedVocabulary',
  EXPORTED:    'gradedReader_exportedWords',
};

// ── Generic helpers ───────────────────────────────────────────

export function isStorageAvailable() {
  try {
    const key = '__storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[storage] Write failed:', e);
    return false;
  }
}

// ── API Key ───────────────────────────────────────────────────

export function saveApiKey(key) {
  return save(KEYS.API_KEY, key);
}

export function loadApiKey() {
  return load(KEYS.API_KEY, '');
}

export function clearApiKey() {
  localStorage.removeItem(KEYS.API_KEY);
}

// ── Syllabus ──────────────────────────────────────────────────

export function saveSyllabus(syllabus) {
  save(KEYS.SYLLABUS, syllabus);
  save(KEYS.LESSON_IDX, 0);
}

export function loadSyllabus() {
  return load(KEYS.SYLLABUS, null);
}

export function clearSyllabus() {
  localStorage.removeItem(KEYS.SYLLABUS);
  localStorage.removeItem(KEYS.LESSON_IDX);
}

// ── Lesson Index ──────────────────────────────────────────────

export function saveLessonIndex(idx) {
  save(KEYS.LESSON_IDX, idx);
}

export function loadLessonIndex() {
  return load(KEYS.LESSON_IDX, 0);
}

// ── Generated Readers (cache) ─────────────────────────────────

function loadAllReaders() {
  return load(KEYS.READERS, {});
}

export function saveReader(lessonKey, readerData) {
  const readers = loadAllReaders();
  readers[lessonKey] = readerData;
  save(KEYS.READERS, readers);
}

export function loadReader(lessonKey) {
  const readers = loadAllReaders();
  return readers[lessonKey] || null;
}

export function clearReaders() {
  localStorage.removeItem(KEYS.READERS);
}

// ── Learned Vocabulary ────────────────────────────────────────

export function loadLearnedVocabulary() {
  return load(KEYS.VOCABULARY, {});
}

export function addLearnedVocabulary(wordList) {
  const existing = loadLearnedVocabulary();
  const now = new Date().toISOString();
  for (const word of wordList) {
    if (word.chinese && !existing[word.chinese]) {
      existing[word.chinese] = {
        pinyin:    word.pinyin || '',
        english:   word.english || '',
        dateAdded: now,
      };
    }
  }
  save(KEYS.VOCABULARY, existing);
  return existing;
}

export function clearLearnedVocabulary() {
  localStorage.removeItem(KEYS.VOCABULARY);
}

// ── Exported Words (Anki duplicate prevention) ────────────────

export function loadExportedWords() {
  const arr = load(KEYS.EXPORTED, []);
  return new Set(arr);
}

export function addExportedWords(wordSet) {
  const existing = loadExportedWords();
  for (const w of wordSet) existing.add(w);
  save(KEYS.EXPORTED, [...existing]);
  return existing;
}

export function clearExportedWords() {
  localStorage.removeItem(KEYS.EXPORTED);
}

// ── Storage usage estimate ────────────────────────────────────

export function getStorageUsage() {
  try {
    let bytes = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        bytes += (localStorage.getItem(key) || '').length * 2;
      }
    }
    const limit = 5 * 1024 * 1024; // 5 MB
    return { used: bytes, limit, pct: Math.round((bytes / limit) * 100) };
  } catch {
    return { used: 0, limit: 5 * 1024 * 1024, pct: 0 };
  }
}

// ── Clear everything ──────────────────────────────────────────

export function clearAllAppData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
