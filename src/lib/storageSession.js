import { load, save } from './storageHelpers';

const KEYS = {
  FLASHCARD_SESSION: 'gradedReader_flashcardSession',
  NATIVE_LANG: 'gradedReader_nativeLang',
};

export function loadFlashcardSession(langId) {
  if (langId) return load(`${KEYS.FLASHCARD_SESSION}_${langId}`, null);
  return load(KEYS.FLASHCARD_SESSION, null);
}

export function saveFlashcardSession(session, langId) {
  if (langId) save(`${KEYS.FLASHCARD_SESSION}_${langId}`, session);
  else save(KEYS.FLASHCARD_SESSION, session);
}

export function loadNativeLang() {
  return load(KEYS.NATIVE_LANG, 'en');
}

export function saveNativeLang(langId) {
  save(KEYS.NATIVE_LANG, langId);
}

// Last session (restore on reload)
const SESSION_KEY = 'gradedReader_lastSession';

export function loadLastSession() {
  return load(SESSION_KEY, null);
}

export function saveLastSession(session) {
  save(SESSION_KEY, session);
}
