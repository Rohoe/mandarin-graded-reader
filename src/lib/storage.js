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
  API_KEY:            'gradedReader_apiKey',
  SYLLABI:            'gradedReader_syllabi',
  SYLLABUS_PROGRESS:  'gradedReader_syllabusProgress',
  STANDALONE_READERS: 'gradedReader_standaloneReaders',
  READERS:            'gradedReader_readers',
  VOCABULARY:         'gradedReader_learnedVocabulary',
  EXPORTED:           'gradedReader_exportedWords',
  MAX_TOKENS:         'gradedReader_maxTokens',
  DEFAULT_LEVEL:      'gradedReader_defaultLevel',
  DEFAULT_TOPIK_LEVEL: 'gradedReader_defaultTopikLevel',
  DARK_MODE:          'gradedReader_darkMode',
  TTS_VOICE_URI:      'gradedReader_ttsVoiceURI',
  TTS_KO_VOICE_URI:   'gradedReader_ttsKoVoiceURI',
  TTS_YUE_VOICE_URI:  'gradedReader_ttsYueVoiceURI',
  CLOUD_LAST_SYNCED:  'gradedReader_cloudLastSynced',
  VERBOSE_VOCAB:      'gradedReader_verboseVocab',
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
function saveWithFile(lsKey, value, fileKey) {
  save(lsKey, value);
  if (_dirHandle && fileKey) {
    writeJSON(_dirHandle, FILES[fileKey], buildFilePayload(fileKey, value))
      .catch(e => console.warn('[storage] file write failed:', fileKey, e));
  }
  return value;
}

// Build file payload — syllabi file holds syllabi + progress + standaloneReaders together.
function buildFilePayload(fileKey, newValue) {
  if (fileKey === 'syllabi') {
    return {
      syllabi:           newValue ?? load(KEYS.SYLLABI, []),
      syllabusProgress:  load(KEYS.SYLLABUS_PROGRESS, {}),
      standaloneReaders: load(KEYS.STANDALONE_READERS, []),
    };
  }
  return newValue;
}

function saveSyllabiFile() {
  if (_dirHandle) {
    writeJSON(_dirHandle, FILES.syllabi, {
      syllabi:           load(KEYS.SYLLABI, []),
      syllabusProgress:  load(KEYS.SYLLABUS_PROGRESS, {}),
      standaloneReaders: load(KEYS.STANDALONE_READERS, []),
    }).catch(e => console.warn('[storage] file write failed: syllabi', e));
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

// ── Syllabi ───────────────────────────────────────────────────

export function loadSyllabi() {
  // Migration: convert old single-syllabus format if present
  const oldSyllabus = load('gradedReader_syllabus', null);
  if (oldSyllabus) {
    const oldIndex = load('gradedReader_lessonIndex', 0);
    const migrated = [{
      id:        'migrated_' + Date.now().toString(36),
      topic:     oldSyllabus.topic,
      level:     oldSyllabus.level,
      lessons:   oldSyllabus.lessons || [],
      createdAt: Date.now(),
    }];
    save(KEYS.SYLLABI, migrated);
    // Migrate progress
    const progress = load(KEYS.SYLLABUS_PROGRESS, {});
    progress[migrated[0].id] = { lessonIndex: oldIndex, completedLessons: [] };
    save(KEYS.SYLLABUS_PROGRESS, progress);
    // Remove old keys
    localStorage.removeItem('gradedReader_syllabus');
    localStorage.removeItem('gradedReader_lessonIndex');
    return migrated;
  }
  return load(KEYS.SYLLABI, []);
}

export function saveSyllabi(arr) {
  save(KEYS.SYLLABI, arr);
  saveSyllabiFile();
}

// ── Syllabus Progress ─────────────────────────────────────────

export function loadSyllabusProgress() {
  return load(KEYS.SYLLABUS_PROGRESS, {});
}

export function saveSyllabusProgress(map) {
  save(KEYS.SYLLABUS_PROGRESS, map);
  saveSyllabiFile();
}

// ── Standalone Readers ────────────────────────────────────────

export function loadStandaloneReaders() {
  return load(KEYS.STANDALONE_READERS, []);
}

export function saveStandaloneReaders(arr) {
  save(KEYS.STANDALONE_READERS, arr);
  saveSyllabiFile();
}

// ── Generated Readers (cache) ─────────────────────────────────

export function loadAllReaders() {
  return load(KEYS.READERS, {});
}

export function saveReader(lessonKey, readerData) {
  const readers = loadAllReaders();
  readers[lessonKey] = readerData;
  saveWithFile(KEYS.READERS, readers, 'readers');
}

export function deleteReader(lessonKey) {
  const readers = loadAllReaders();
  delete readers[lessonKey];
  saveWithFile(KEYS.READERS, readers, 'readers');
}

/**
 * Like saveReader but catches QuotaExceededError and returns { ok, quotaExceeded }.
 */
export function saveReaderSafe(lessonKey, readerData) {
  try {
    const readers = loadAllReaders();
    readers[lessonKey] = readerData;
    localStorage.setItem(KEYS.READERS, JSON.stringify(readers));
    // Fan out to file (fire-and-forget, no quota concern)
    if (_dirHandle) {
      writeJSON(_dirHandle, FILES.readers, readers)
        .catch(e => console.warn('[storage] file write failed: readers', e));
    }
    return { ok: true, quotaExceeded: false };
  } catch (e) {
    const isQuota = e instanceof DOMException && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
    console.warn('[storage] saveReaderSafe failed:', e);
    return { ok: false, quotaExceeded: isQuota };
  }
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
    const key = word.chinese || word.korean || word.target || '';
    if (key && !existing[key]) {
      existing[key] = {
        pinyin:    word.pinyin  || word.romanization || '',
        english:   word.english || word.translation  || '',
        langId:    word.langId  || undefined,
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

// ── Max tokens preference ─────────────────────────────────────

export function loadMaxTokens() {
  return load(KEYS.MAX_TOKENS, 8192);
}

export function saveMaxTokens(n) {
  save(KEYS.MAX_TOKENS, n);
}

// ── Default HSK level preference ──────────────────────────────

export function loadDefaultLevel() {
  return load(KEYS.DEFAULT_LEVEL, 3);
}

export function saveDefaultLevel(n) {
  save(KEYS.DEFAULT_LEVEL, n);
}

// ── Default TOPIK level preference ───────────────────────────

export function loadDefaultTopikLevel() {
  return load(KEYS.DEFAULT_TOPIK_LEVEL, 2);
}

export function saveDefaultTopikLevel(n) {
  save(KEYS.DEFAULT_TOPIK_LEVEL, n);
}

// ── Dark mode preference ──────────────────────────────────────

export function loadDarkMode() {
  return load(KEYS.DARK_MODE, false);
}

export function saveDarkMode(val) {
  save(KEYS.DARK_MODE, val);
}

// ── TTS voice preference ──────────────────────────────────────

export function loadTtsVoiceURI() {
  return load(KEYS.TTS_VOICE_URI, null);
}

export function saveTtsVoiceURI(uri) {
  save(KEYS.TTS_VOICE_URI, uri);
}

// ── Korean TTS voice preference ──────────────────────────────

export function loadTtsKoVoiceURI() {
  return load(KEYS.TTS_KO_VOICE_URI, null);
}

export function saveTtsKoVoiceURI(uri) {
  save(KEYS.TTS_KO_VOICE_URI, uri);
}

// ── Cantonese TTS voice preference ────────────────────────────

export function loadTtsYueVoiceURI() {
  return load(KEYS.TTS_YUE_VOICE_URI, null);
}

export function saveTtsYueVoiceURI(uri) {
  save(KEYS.TTS_YUE_VOICE_URI, uri);
}

// ── Verbose vocabulary preference ────────────────────────────

export function loadVerboseVocab() {
  return load(KEYS.VERBOSE_VOCAB, false);
}

export function saveVerboseVocab(val) {
  save(KEYS.VERBOSE_VOCAB, val);
}

// ── Cloud last-synced timestamp ───────────────────────────────

export function loadCloudLastSynced() {
  return load(KEYS.CLOUD_LAST_SYNCED, null);
}

export function saveCloudLastSynced(ts) {
  save(KEYS.CLOUD_LAST_SYNCED, ts);
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

// ── Backup export ─────────────────────────────────────────────

/**
 * Returns a snapshot of all app data suitable for JSON export.
 * Reads directly from localStorage so it captures ALL readers,
 * not just the ones currently in React state.
 * API key is deliberately excluded.
 */
export function exportAllData() {
  return {
    version:          1,
    exportedAt:       new Date().toISOString(),
    syllabi:          load(KEYS.SYLLABI, []),
    syllabusProgress: load(KEYS.SYLLABUS_PROGRESS, {}),
    standaloneReaders:load(KEYS.STANDALONE_READERS, []),
    generatedReaders: load(KEYS.READERS, {}),
    learnedVocabulary:load(KEYS.VOCABULARY, {}),
    exportedWords:    load(KEYS.EXPORTED, []),
  };
}
