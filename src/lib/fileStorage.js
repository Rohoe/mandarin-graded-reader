/**
 * File System Access API layer.
 *
 * Persists app data as JSON files in a user-chosen folder.
 * The FileSystemDirectoryHandle is stored in IndexedDB so it survives
 * page reloads (browser re-asks for permission on next visit, which is
 * one user gesture away).
 *
 * File layout inside the chosen folder:
 *   graded-reader-syllabus.json      — currentSyllabus + lessonIndex
 *   graded-reader-readers.json       — generatedReaders cache
 *   graded-reader-vocabulary.json    — learnedVocabulary ledger
 *   graded-reader-exported.json      — exportedWords array
 */

// ── IndexedDB helpers (to persist the directory handle) ───────

const IDB_NAME    = 'gradedReaderFS';
const IDB_STORE   = 'handles';
const IDB_KEY     = 'saveDirectory';
const IDB_VERSION = 1;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveDirectoryHandle(handle) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

export async function loadDirectoryHandle() {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearDirectoryHandle() {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

// ── Permission helpers ────────────────────────────────────────

export async function verifyPermission(handle) {
  if (!handle) return false;
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return true;
    const req = await handle.requestPermission({ mode: 'readwrite' });
    return req === 'granted';
  } catch {
    return false;
  }
}

// ── Directory picker ──────────────────────────────────────────

export async function pickDirectory() {
  try {
    return await window.showDirectoryPicker({
      id:      'gradedReaderSave',
      mode:    'readwrite',
      startIn: 'documents',
    });
  } catch (err) {
    if (err.name === 'AbortError') return null; // user cancelled
    throw err;
  }
}

// ── JSON file I/O ─────────────────────────────────────────────

const FILES = {
  syllabus:    'graded-reader-syllabus.json',
  readers:     'graded-reader-readers.json',
  vocabulary:  'graded-reader-vocabulary.json',
  exported:    'graded-reader-exported.json',
};

export { FILES };

export async function writeJSON(dirHandle, filename, data) {
  try {
    const fh       = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fh.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (err) {
    console.warn('[fileStorage] writeJSON failed:', filename, err);
  }
}

export async function readJSON(dirHandle, filename) {
  try {
    const fh   = await dirHandle.getFileHandle(filename);
    const file = await fh.getFile();
    return JSON.parse(await file.text());
  } catch {
    return null; // file doesn't exist yet
  }
}

// ── Read all app data from folder ─────────────────────────────

export async function readAllFromFolder(dirHandle) {
  const [syllabusData, readers, vocabulary, exportedArr] = await Promise.all([
    readJSON(dirHandle, FILES.syllabus),
    readJSON(dirHandle, FILES.readers),
    readJSON(dirHandle, FILES.vocabulary),
    readJSON(dirHandle, FILES.exported),
  ]);

  return {
    currentSyllabus:   syllabusData?.syllabus   ?? null,
    lessonIndex:       syllabusData?.lessonIndex ?? 0,
    generatedReaders:  readers      ?? {},
    learnedVocabulary: vocabulary   ?? {},
    exportedWords:     new Set(exportedArr ?? []),
  };
}

// ── Write all app data to folder ──────────────────────────────

export async function writeAllToFolder(dirHandle, state) {
  await Promise.all([
    writeJSON(dirHandle, FILES.syllabus, {
      syllabus:    state.currentSyllabus,
      lessonIndex: state.lessonIndex,
    }),
    writeJSON(dirHandle, FILES.readers,    state.generatedReaders),
    writeJSON(dirHandle, FILES.vocabulary, state.learnedVocabulary),
    writeJSON(dirHandle, FILES.exported,   [...state.exportedWords]),
  ]);
}

// ── Feature detection ─────────────────────────────────────────

export function isSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}
