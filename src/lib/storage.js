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
  READERS:            'gradedReader_readers',           // legacy monolithic key
  READER_INDEX:       'gradedReader_readerIndex',       // per-reader index
  VOCABULARY:         'gradedReader_learnedVocabulary',
  EXPORTED:           'gradedReader_exportedWords',
  MAX_TOKENS:         'gradedReader_maxTokens',
  DEFAULT_LEVEL:      'gradedReader_defaultLevel',
  DEFAULT_TOPIK_LEVEL: 'gradedReader_defaultTopikLevel',
  DEFAULT_YUE_LEVEL:   'gradedReader_defaultYueLevel',
  DARK_MODE:          'gradedReader_darkMode',
  TTS_VOICE_URI:      'gradedReader_ttsVoiceURI',
  TTS_KO_VOICE_URI:   'gradedReader_ttsKoVoiceURI',
  TTS_YUE_VOICE_URI:  'gradedReader_ttsYueVoiceURI',
  CLOUD_LAST_SYNCED:  'gradedReader_cloudLastSynced',
  VERBOSE_VOCAB:      'gradedReader_verboseVocab',
  STRUCTURED_OUTPUT:  'gradedReader_structuredOutput',
  LEARNING_ACTIVITY:  'gradedReader_learningActivity',
  PROVIDER_KEYS:      'gradedReader_providerKeys',
  ACTIVE_PROVIDER:    'gradedReader_activeProvider',
  ACTIVE_MODEL:       'gradedReader_activeModel',
  CUSTOM_BASE_URL:    'gradedReader_customBaseUrl',
  CUSTOM_MODEL_NAME:  'gradedReader_customModelName',
  COMPAT_PRESET:      'gradedReader_compatPreset',
  TTS_SPEECH_RATE:    'gradedReader_ttsSpeechRate',
  ROMANIZATION_ON:    'gradedReader_romanizationOn',
  TRANSLATE_BUTTONS:  'gradedReader_translateButtons',
  EVICTED_READER_KEYS: 'gradedReader_evictedReaderKeys',
};

const READER_KEY_PREFIX = 'gradedReader_reader_';

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

// ── Provider Keys (multi-LLM) ─────────────────────────────────
// Deliberately NOT synced to file or cloud — keys stay local only.

export function loadProviderKeys() {
  let keys = load(KEYS.PROVIDER_KEYS, null);
  if (!keys) {
    // Migrate from old single apiKey if it exists
    const oldKey = load(KEYS.API_KEY, '');
    keys = { anthropic: oldKey || '', openai: '', gemini: '', openai_compatible: '' };
    if (oldKey) {
      save(KEYS.PROVIDER_KEYS, keys);
      localStorage.removeItem(KEYS.API_KEY);
    }
  }
  return keys;
}

export function saveProviderKeys(keys) {
  save(KEYS.PROVIDER_KEYS, keys);
}

export function loadActiveProvider() {
  return load(KEYS.ACTIVE_PROVIDER, 'anthropic');
}

export function saveActiveProvider(id) {
  save(KEYS.ACTIVE_PROVIDER, id);
}

export function loadActiveModels() {
  const map = load(KEYS.ACTIVE_MODEL, null);
  if (map && typeof map === 'object' && !Array.isArray(map)) return map;
  // Migrate from old single-string activeModel
  const legacy = typeof map === 'string' ? map : null;
  const fresh = { anthropic: null, openai: null, gemini: null, openai_compatible: null };
  if (legacy) {
    // Assign legacy model to current active provider (best guess)
    const provider = loadActiveProvider();
    fresh[provider] = legacy;
    save(KEYS.ACTIVE_MODEL, fresh);
  }
  return fresh;
}

export function saveActiveModels(map) {
  save(KEYS.ACTIVE_MODEL, map);
}

export function loadCustomBaseUrl() {
  return load(KEYS.CUSTOM_BASE_URL, '');
}

export function saveCustomBaseUrl(url) {
  save(KEYS.CUSTOM_BASE_URL, url);
}

export function loadCustomModelName() {
  return load(KEYS.CUSTOM_MODEL_NAME, '');
}

export function saveCustomModelName(name) {
  save(KEYS.CUSTOM_MODEL_NAME, name);
}

export function loadCompatPreset() {
  return load(KEYS.COMPAT_PRESET, 'deepseek');
}

export function saveCompatPreset(preset) {
  save(KEYS.COMPAT_PRESET, preset);
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

// ── Generated Readers (cache) — per-reader lazy storage ───────

// Migrate from monolithic key to per-reader keys on first access
let _migrationDone = false;

function migrateReadersIfNeeded() {
  if (_migrationDone) return;
  _migrationDone = true;

  const raw = localStorage.getItem(KEYS.READERS);
  if (!raw) return;

  try {
    const allReaders = JSON.parse(raw);
    const keys = Object.keys(allReaders);
    if (keys.length === 0) {
      localStorage.removeItem(KEYS.READERS);
      return;
    }

    // Write each reader to its own key
    for (const key of keys) {
      try {
        localStorage.setItem(READER_KEY_PREFIX + key, JSON.stringify(allReaders[key]));
      } catch (e) {
        console.warn('[storage] migration: failed to write reader', key, e);
      }
    }

    // Write the index
    save(KEYS.READER_INDEX, keys);

    // Remove the old monolithic key
    localStorage.removeItem(KEYS.READERS);
  } catch {
    // If parsing fails, just remove the corrupt key
    localStorage.removeItem(KEYS.READERS);
  }
}

export function loadReaderIndex() {
  migrateReadersIfNeeded();
  return load(KEYS.READER_INDEX, []);
}

function saveReaderIndex(index) {
  save(KEYS.READER_INDEX, index);
}

export function loadAllReaders() {
  migrateReadersIfNeeded();
  const index = load(KEYS.READER_INDEX, []);
  const readers = {};
  for (const key of index) {
    const data = load(READER_KEY_PREFIX + key, null);
    if (data) readers[key] = data;
  }
  return readers;
}

export function saveReader(lessonKey, readerData) {
  migrateReadersIfNeeded();
  save(READER_KEY_PREFIX + lessonKey, readerData);
  // Update index
  const index = loadReaderIndex();
  if (!index.includes(lessonKey)) {
    index.push(lessonKey);
    saveReaderIndex(index);
  }
  // Fan out to file (file still uses monolithic format for compatibility)
  if (_dirHandle) {
    const allReaders = loadAllReaders();
    writeJSON(_dirHandle, FILES.readers, allReaders)
      .catch(e => console.warn('[storage] file write failed: readers', e));
  }
}

export function deleteReader(lessonKey) {
  migrateReadersIfNeeded();
  localStorage.removeItem(READER_KEY_PREFIX + lessonKey);
  const index = loadReaderIndex().filter(k => k !== lessonKey);
  saveReaderIndex(index);
  // Fan out to file
  if (_dirHandle) {
    const allReaders = loadAllReaders();
    writeJSON(_dirHandle, FILES.readers, allReaders)
      .catch(e => console.warn('[storage] file write failed: readers', e));
  }
}

/**
 * Like saveReader but catches QuotaExceededError and returns { ok, quotaExceeded }.
 */
export function saveReaderSafe(lessonKey, readerData) {
  try {
    migrateReadersIfNeeded();
    localStorage.setItem(READER_KEY_PREFIX + lessonKey, JSON.stringify(readerData));
    // Update index
    const index = loadReaderIndex();
    if (!index.includes(lessonKey)) {
      index.push(lessonKey);
      saveReaderIndex(index);
    }
    // Fan out to file (fire-and-forget, no quota concern)
    if (_dirHandle) {
      const allReaders = loadAllReaders();
      writeJSON(_dirHandle, FILES.readers, allReaders)
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
  migrateReadersIfNeeded();
  return load(READER_KEY_PREFIX + lessonKey, null);
}

export function clearReaders() {
  migrateReadersIfNeeded();
  const index = loadReaderIndex();
  for (const key of index) {
    localStorage.removeItem(READER_KEY_PREFIX + key);
  }
  saveReaderIndex([]);
  localStorage.removeItem(KEYS.READERS); // clean up legacy key if still present
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

/**
 * Merge vocabulary in-memory without saving (for pure reducer).
 */
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
      };
    }
  }
  return merged;
}

export function saveLearnedVocabulary(vocab) {
  saveWithFile(KEYS.VOCABULARY, vocab, 'vocabulary');
}

/**
 * Merge exported words in-memory without saving (for pure reducer).
 */
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

// ── Default YUE level preference ─────────────────────────────

export function loadDefaultYueLevel() {
  return load(KEYS.DEFAULT_YUE_LEVEL, 2);
}

export function saveDefaultYueLevel(n) {
  save(KEYS.DEFAULT_YUE_LEVEL, n);
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

// ── TTS speech rate preference ────────────────────────────────

export function loadTtsSpeechRate() {
  return load(KEYS.TTS_SPEECH_RATE, 1);
}

export function saveTtsSpeechRate(rate) {
  save(KEYS.TTS_SPEECH_RATE, rate);
}

// ── Romanization toggle preference ───────────────────────────

export function loadRomanizationOn() {
  return load(KEYS.ROMANIZATION_ON, false);
}

export function saveRomanizationOn(val) {
  save(KEYS.ROMANIZATION_ON, val);
}

// ── Translate buttons preference ─────────────────────────────

export function loadTranslateButtons() {
  return load(KEYS.TRANSLATE_BUTTONS, true);
}

export function saveTranslateButtons(val) {
  save(KEYS.TRANSLATE_BUTTONS, val);
}

// ── Verbose vocabulary preference ────────────────────────────

export function loadVerboseVocab() {
  return load(KEYS.VERBOSE_VOCAB, false);
}

export function saveVerboseVocab(val) {
  save(KEYS.VERBOSE_VOCAB, val);
}

export function loadStructuredOutput() {
  return load(KEYS.STRUCTURED_OUTPUT, false);
}

export function saveStructuredOutput(val) {
  save(KEYS.STRUCTURED_OUTPUT, val);
}

// ── Cloud last-synced timestamp ───────────────────────────────

export function loadCloudLastSynced() {
  return load(KEYS.CLOUD_LAST_SYNCED, null);
}

export function saveCloudLastSynced(ts) {
  save(KEYS.CLOUD_LAST_SYNCED, ts);
}

// ── Last-modified timestamp ───────────────────────────────────

export function loadLastModified() {
  return load('gradedReader_lastModified', null);
}

export function saveLastModified(ts) {
  save('gradedReader_lastModified', ts);
}

// ── Last session (restore on reload) ─────────────────────────

const SESSION_KEY = 'gradedReader_lastSession';

export function loadLastSession() {
  return load(SESSION_KEY, null);
}

export function saveLastSession(session) {
  // session: { syllabusId, syllabusView, standaloneKey }
  save(SESSION_KEY, session);
}

// ── Learning Activity ─────────────────────────────────────────

export function loadLearningActivity() {
  return load(KEYS.LEARNING_ACTIVITY, []);
}

export function saveLearningActivity(activity) {
  save(KEYS.LEARNING_ACTIVITY, activity);
}

const ACTIVITY_STASH_KEY = 'gradedReader_learningActivity_stash';
const STASH_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const STASH_THRESHOLD = 500;

/**
 * Move activity entries older than 90 days to a separate stash key.
 * Called when the main array exceeds STASH_THRESHOLD entries.
 * Returns the pruned (recent) activity array.
 */
export function stashOldActivity(activity) {
  if (activity.length <= STASH_THRESHOLD) return activity;
  const cutoff = Date.now() - STASH_AGE_MS;
  const recent = [];
  const old = [];
  for (const entry of activity) {
    if ((entry.timestamp || 0) < cutoff) old.push(entry);
    else recent.push(entry);
  }
  if (old.length === 0) return activity;
  // Merge with existing stash
  const existingStash = load(ACTIVITY_STASH_KEY, []);
  save(ACTIVITY_STASH_KEY, [...existingStash, ...old]);
  save(KEYS.LEARNING_ACTIVITY, recent);
  return recent;
}

export function loadActivityStash() {
  return load(ACTIVITY_STASH_KEY, []);
}

// ── Reader eviction (LRU) ─────────────────────────────────────

const EVICT_MAX_READERS = 30;        // keep at most this many in localStorage
const EVICT_STALE_DAYS = 30;         // readers not opened in this many days are candidates
const EVICT_STALE_MS = EVICT_STALE_DAYS * 24 * 60 * 60 * 1000;

// ── Evicted reader keys tracking ──────────────────────────────

export function loadEvictedReaderKeys() {
  return new Set(load(KEYS.EVICTED_READER_KEYS, []));
}

export function saveEvictedReaderKeys(set) {
  save(KEYS.EVICTED_READER_KEYS, [...set]);
}

export function unmarkEvicted(lessonKey) {
  const evicted = loadEvictedReaderKeys();
  if (evicted.has(lessonKey)) {
    evicted.delete(lessonKey);
    saveEvictedReaderKeys(evicted);
  }
}

/**
 * Evict old readers from localStorage to free space.
 * Only evicts readers that have a confirmed backup (present in backupKeys).
 * Returns the list of evicted lesson keys.
 *
 * @param {{ activeKey?: string, backupKeys?: Set<string> }} options
 */
export function evictStaleReaders({ activeKey, backupKeys } = {}) {
  migrateReadersIfNeeded();
  const index = loadReaderIndex();
  if (index.length <= EVICT_MAX_READERS) return [];

  // Build metadata for each reader
  const entries = [];
  for (const key of index) {
    if (key === activeKey) continue; // never evict active reader
    const raw = localStorage.getItem(READER_KEY_PREFIX + key);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      entries.push({
        key,
        lastOpenedAt: data.lastOpenedAt || 0,
        size: raw.length * 2, // approximate bytes
      });
    } catch {
      entries.push({ key, lastOpenedAt: 0, size: raw.length * 2 });
    }
  }

  // Sort by lastOpenedAt ascending (oldest first)
  entries.sort((a, b) => a.lastOpenedAt - b.lastOpenedAt);

  const now = Date.now();
  const evicted = [];
  let remaining = index.length;

  for (const entry of entries) {
    // Stop once we're within budget
    if (remaining <= EVICT_MAX_READERS) break;
    // Only evict if stale (never opened, or opened > EVICT_STALE_DAYS ago)
    const isStale = !entry.lastOpenedAt || (now - entry.lastOpenedAt > EVICT_STALE_MS);
    if (!isStale) continue;
    // Only evict if backed up (when backupKeys provided)
    if (backupKeys && !backupKeys.has(entry.key)) continue;

    localStorage.removeItem(READER_KEY_PREFIX + entry.key);
    evicted.push(entry.key);
    remaining--;
  }

  if (evicted.length > 0) {
    // Update index to remove evicted keys
    const evictedSet = new Set(evicted);
    const newIndex = index.filter(k => !evictedSet.has(k));
    saveReaderIndex(newIndex);

    // Track evicted keys
    const existing = loadEvictedReaderKeys();
    for (const k of evicted) existing.add(k);
    saveEvictedReaderKeys(existing);

    console.info(`[storage] Evicted ${evicted.length} stale reader(s) from localStorage`);
  }

  return evicted;
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
  // Clear per-reader keys
  const index = load(KEYS.READER_INDEX, []);
  for (const key of index) {
    localStorage.removeItem(READER_KEY_PREFIX + key);
  }
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(KEYS.READERS); // legacy monolithic key
  // Clear evicted reader keys
  localStorage.removeItem(KEYS.EVICTED_READER_KEYS);
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
    generatedReaders: loadAllReaders(),
    learnedVocabulary:load(KEYS.VOCABULARY, {}),
    exportedWords:    load(KEYS.EXPORTED, []),
  };
}
