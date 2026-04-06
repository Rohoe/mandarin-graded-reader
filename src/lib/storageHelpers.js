/**
 * Shared storage helpers extracted from storage.js.
 *
 * Provides the directory handle management, generic localStorage
 * read/write, and file-system fanout utilities used by multiple
 * domain-specific storage modules.
 */

import { writeJSON, FILES } from './fileStorage';
import { setReaderDirHandle } from './readerStorage';

// ── Module-level directory handle ─────────────────────────────
// Set by AppContext after permission is verified on startup.

let _dirHandle = null;

export function setDirectoryHandle(handle) {
  _dirHandle = handle;
  setReaderDirHandle(handle);
}

export function getDirectoryHandle() {
  return _dirHandle;
}

// ── localStorage key constants (subset used by file helpers) ──

const KEYS = {
  SYLLABI: 'gradedReader_syllabi',
  SYLLABUS_PROGRESS: 'gradedReader_syllabusProgress',
  STANDALONE_READERS: 'gradedReader_standaloneReaders',
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

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storage] localStorage write failed:', e);
  }
}

// ── File-system fanout helpers ────────────────────────────────

// Fan out to file if a directory handle is registered.
export function saveWithFile(lsKey, value, fileKey) {
  save(lsKey, value);
  if (_dirHandle && fileKey) {
    writeJSON(_dirHandle, FILES[fileKey], buildFilePayload(fileKey, value))
      .catch(e => console.warn('[storage] file write failed:', fileKey, e));
  }
  return value;
}

// Build file payload — syllabi file holds syllabi + progress + standaloneReaders together.
export function buildFilePayload(fileKey, newValue) {
  if (fileKey === 'syllabi') {
    return {
      syllabi:           newValue ?? load(KEYS.SYLLABI, []),
      syllabusProgress:  load(KEYS.SYLLABUS_PROGRESS, {}),
      standaloneReaders: load(KEYS.STANDALONE_READERS, []),
    };
  }
  return newValue;
}

export function saveSyllabiFile() {
  if (_dirHandle) {
    writeJSON(_dirHandle, FILES.syllabi, {
      syllabi:           load(KEYS.SYLLABI, []),
      syllabusProgress:  load(KEYS.SYLLABUS_PROGRESS, {}),
      standaloneReaders: load(KEYS.STANDALONE_READERS, []),
    }).catch(e => console.warn('[storage] file write failed: syllabi', e));
  }
}
