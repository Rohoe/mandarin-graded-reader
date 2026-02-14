/**
 * Storage layer for all persisted app state.
 *
 * Strategy:
 *  - localStorage is always written (fast, synchronous, works everywhere)
 *  - When a FileSystemDirectoryHandle is registered via setDirectoryHandle(),
 *    every write also fans out to the corresponding JSON file (async, fire-and-forget)
 *  - On startup, AppContext reads from localStorage immediately, then
 *    optionally hydrates from files if a saved handle is found in IndexedDB
 */

import { writeJSON, FILES } from './fileStorage';

// ── Module-level directory handle ─────────────────────────────
// Set by AppContext after permission is verified on startup.

let _dirHandle = null;

export function setDirectoryHandle(handle) {
  _dirHandle = handle;
}

export function getDirectoryHandle() {
  return _dirHandle;
}

// ── localStorage key constants ────────────────────────────────

const KEYS = {
  API_KEY:    'gradedReader_apiKey',
  SYLLABUS:   'gradedReader_syllabus',
  LESSON_IDX: 'gradedReader_lessonIndex',
  READERS:    'gradedReader_readers',
  VOCABULARY: 'gradedReader_learnedVocabulary',
  EXPORTED:   'gradedReader_exportedWords',
};

// ── Generic localStorage helpers ──────────────────────────────

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
  } catch (e) {
    console.warn('[storage] localStorage write failed:', e);
  }
}

// Fan out to file if a directory handle is registered.
// Returns the data so callers can chain easily.
function saveWithFile(lsKey, value, fileKey) {
  save(lsKey, value);
  if (_dirHandle && fileKey) {
    writeJSON(_dirHandle, FILES[fileKey], buildFilePayload(fileKey, value))
      .catch(e => console.warn('[storage] file write failed:', fileKey, e));
  }
  return value;
}

// Build the file payload for a given file key, merging with current state
// so each file stays self-contained (syllabus file holds both syllabus + index).
function buildFilePayload(fileKey, newValue) {
  if (fileKey === 'syllabus') {
    return {
      syllabus:    newValue ?? load(KEYS.SYLLABUS, null),
      lessonIndex: load(KEYS.LESSON_IDX, 0),
    };
  }
  return newValue;
}

// Helper specifically for syllabus + index (they share one file)
function saveSyllabusFile(syllabus, lessonIndex) {
  if (_dirHandle) {
    writeJSON(_dirHandle, FILES.syllabus, { syllabus, lessonIndex })
      .catch(e => console.warn('[storage] file write failed: syllabus', e));
  }
}

// ── API Key ───────────────────────────────────────────────────
// Deliberately NOT synced to file — key stays local only.

export function saveApiKey(key) {
  save(KEYS.API_KEY, key);
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
  saveSyllabusFile(syllabus, 0);
}

export function loadSyllabus() {
  return load(KEYS.SYLLABUS, null);
}

export function clearSyllabus() {
  localStorage.removeItem(KEYS.SYLLABUS);
  localStorage.removeItem(KEYS.LESSON_IDX);
  saveSyllabusFile(null, 0);
}

// ── Lesson Index ──────────────────────────────────────────────

export function saveLessonIndex(idx) {
  save(KEYS.LESSON_IDX, idx);
  // Update syllabus file to keep lessonIndex in sync
  const syllabus = load(KEYS.SYLLABUS, null);
  saveSyllabusFile(syllabus, idx);
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
  saveWithFile(KEYS.READERS, readers, 'readers');
}

export function loadReader(lessonKey) {
  return loadAllReaders()[lessonKey] ?? null;
}

export function clearReaders() {
  localStorage.removeItem(KEYS.READERS);
  if (_dirHandle) {
    writeJSON(_dirHandle, FILES.readers, {})
      .catch(e => console.warn('[storage] file write failed: readers', e));
  }
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
        pinyin:    word.pinyin  || '',
        english:   word.english || '',
        dateAdded: now,
      };
    }
  }
  saveWithFile(KEYS.VOCABULARY, existing, 'vocabulary');
  return existing;
}

export function clearLearnedVocabulary() {
  localStorage.removeItem(KEYS.VOCABULARY);
  if (_dirHandle) {
    writeJSON(_dirHandle, FILES.vocabulary, {})
      .catch(e => console.warn('[storage] file write failed: vocabulary', e));
  }
}

// ── Exported Words ────────────────────────────────────────────

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
  if (_dirHandle) {
    writeJSON(_dirHandle, FILES.exported, [])
      .catch(e => console.warn('[storage] file write failed: exported', e));
  }
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
    const limit = 5 * 1024 * 1024;
    return { used: bytes, limit, pct: Math.round((bytes / limit) * 100) };
  } catch {
    return { used: 0, limit: 5 * 1024 * 1024, pct: 0 };
  }
}

// ── Clear everything ──────────────────────────────────────────

export function clearAllAppData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  // Files are left on disk intentionally — user can delete the folder manually
}
