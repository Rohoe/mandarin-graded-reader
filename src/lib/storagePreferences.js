import { load, save } from './storageHelpers';

const KEYS = {
  MAX_TOKENS:         'gradedReader_maxTokens',
  DEFAULT_LEVEL:      'gradedReader_defaultLevel',
  DEFAULT_TOPIK_LEVEL: 'gradedReader_defaultTopikLevel',
  DEFAULT_YUE_LEVEL:   'gradedReader_defaultYueLevel',
  DARK_MODE:          'gradedReader_darkMode',
  TTS_VOICE_URI:      'gradedReader_ttsVoiceURI',
  TTS_KO_VOICE_URI:   'gradedReader_ttsKoVoiceURI',
  TTS_YUE_VOICE_URI:  'gradedReader_ttsYueVoiceURI',
  TTS_VOICE_URIS:     'gradedReader_ttsVoiceURIs',
  TTS_SPEECH_RATE:    'gradedReader_ttsSpeechRate',
  ROMANIZATION_ON:    'gradedReader_romanizationOn',
  TRANSLATE_BUTTONS:  'gradedReader_translateButtons',
  TRANSLATE_QUESTIONS: 'gradedReader_translateQuestions',
  VERBOSE_VOCAB:      'gradedReader_verboseVocab',  // legacy, migrated to new keys
  EXPORT_SENTENCE_ROM:   'gradedReader_exportSentenceRom',
  EXPORT_SENTENCE_TRANS: 'gradedReader_exportSentenceTrans',
  STRUCTURED_OUTPUT:  'gradedReader_structuredOutput',
  NEW_CARDS_PER_DAY:   'gradedReader_newCardsPerDay',
  SHOW_ARCHIVED:       'gradedReader_showArchived',
  IMMERSION_MODE:      'gradedReader_immersionMode',
};

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

// ── Default levels map (per-language) ─────────────────────────

const DEFAULT_LEVELS_KEY = 'gradedReader_defaultLevels';
const DEFAULT_LEVELS_DEFAULTS = { zh: 3, ko: 2, yue: 2, fr: 2, es: 2, en: 2 };

export function loadDefaultLevels() {
  // Migrate from old per-language keys if map doesn't exist yet
  let map = load(DEFAULT_LEVELS_KEY, null);
  if (!map) {
    map = {
      zh: load(KEYS.DEFAULT_LEVEL, 3),
      ko: load(KEYS.DEFAULT_TOPIK_LEVEL, 2),
      yue: load(KEYS.DEFAULT_YUE_LEVEL, 2),
      fr: 2,
      es: 2,
      en: 2,
    };
    save(DEFAULT_LEVELS_KEY, map);
  }
  // Ensure new languages have defaults
  let updated = false;
  for (const [k, v] of Object.entries(DEFAULT_LEVELS_DEFAULTS)) {
    if (map[k] === undefined) { map[k] = v; updated = true; }
  }
  if (updated) save(DEFAULT_LEVELS_KEY, map);
  return map;
}

export function saveDefaultLevels(map) {
  save(DEFAULT_LEVELS_KEY, map);
}

// ── Dark mode preference ──────────────────────────────────────

export function loadDarkMode() {
  const stored = load(KEYS.DARK_MODE, null);
  if (stored !== null) return stored;
  // Auto-detect OS preference on first load
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
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

// ── TTS voice URIs map (per-language) ─────────────────────────

const TTS_VOICE_URIS_DEFAULTS = { zh: null, ko: null, yue: null, fr: null, es: null, en: null };

export function loadTtsVoiceURIs() {
  let map = load(KEYS.TTS_VOICE_URIS, null);
  if (!map) {
    // Migrate from legacy per-language keys
    map = {
      zh:  load(KEYS.TTS_VOICE_URI, null),
      ko:  load(KEYS.TTS_KO_VOICE_URI, null),
      yue: load(KEYS.TTS_YUE_VOICE_URI, null),
      fr: null, es: null, en: null,
    };
    save(KEYS.TTS_VOICE_URIS, map);
  }
  // Ensure new languages have defaults
  let updated = false;
  for (const [k, v] of Object.entries(TTS_VOICE_URIS_DEFAULTS)) {
    if (map[k] === undefined) { map[k] = v; updated = true; }
  }
  if (updated) save(KEYS.TTS_VOICE_URIS, map);
  return map;
}

export function saveTtsVoiceURIs(map) {
  save(KEYS.TTS_VOICE_URIS, map);
  // Write-through to legacy keys for backward compat
  if (map.zh !== undefined) save(KEYS.TTS_VOICE_URI, map.zh);
  if (map.ko !== undefined) save(KEYS.TTS_KO_VOICE_URI, map.ko);
  if (map.yue !== undefined) save(KEYS.TTS_YUE_VOICE_URI, map.yue);
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

// ── Translate questions preference ──────────────────────────

export function loadTranslateQuestions() {
  return load(KEYS.TRANSLATE_QUESTIONS, false);
}

export function saveTranslateQuestions(val) {
  save(KEYS.TRANSLATE_QUESTIONS, val);
}

// ── Export sentence options (per-language) ────────────────────

const DEFAULT_EXPORT_FLAGS = { zh: false, ko: false, yue: false, fr: false, es: false, en: false };

function migrateVerboseVocab() {
  const old = load(KEYS.VERBOSE_VOCAB, null);
  if (old === null) return;
  // Migrate old verboseVocab (boolean or per-lang object) → both new keys
  let flags;
  if (typeof old === 'boolean') {
    flags = { zh: old, ko: old, yue: old };
  } else if (old && typeof old === 'object') {
    flags = { zh: Boolean(old.zh), ko: Boolean(old.ko), yue: Boolean(old.yue) };
  } else {
    flags = { ...DEFAULT_EXPORT_FLAGS };
  }
  save(KEYS.EXPORT_SENTENCE_ROM, flags);
  save(KEYS.EXPORT_SENTENCE_TRANS, flags);
  localStorage.removeItem(KEYS.VERBOSE_VOCAB);
}

export function loadExportSentenceRom() {
  migrateVerboseVocab();
  const stored = load(KEYS.EXPORT_SENTENCE_ROM, null);
  if (stored && typeof stored === 'object') {
    const result = { ...DEFAULT_EXPORT_FLAGS };
    for (const k of Object.keys(result)) result[k] = Boolean(stored[k]);
    return result;
  }
  return { ...DEFAULT_EXPORT_FLAGS };
}

export function saveExportSentenceRom(val) {
  save(KEYS.EXPORT_SENTENCE_ROM, val);
}

export function loadExportSentenceTrans() {
  migrateVerboseVocab();
  const stored = load(KEYS.EXPORT_SENTENCE_TRANS, null);
  if (stored && typeof stored === 'object') {
    const result = { ...DEFAULT_EXPORT_FLAGS };
    for (const k of Object.keys(result)) result[k] = Boolean(stored[k]);
    return result;
  }
  return { ...DEFAULT_EXPORT_FLAGS };
}

export function saveExportSentenceTrans(val) {
  save(KEYS.EXPORT_SENTENCE_TRANS, val);
}

// ── Structured output preference ────────────────────────────

export function loadStructuredOutput() {
  return load(KEYS.STRUCTURED_OUTPUT, false);
}

export function saveStructuredOutput(val) {
  save(KEYS.STRUCTURED_OUTPUT, val);
}

// ── New cards per day preference ──────────────────────────────

export function loadNewCardsPerDay() {
  return load(KEYS.NEW_CARDS_PER_DAY, 20);
}

export function saveNewCardsPerDay(n) {
  save(KEYS.NEW_CARDS_PER_DAY, n);
}

// ── Show archived preference ─────────────────────────────────

export function loadShowArchived() {
  return load(KEYS.SHOW_ARCHIVED, false);
}

export function saveShowArchived(val) {
  save(KEYS.SHOW_ARCHIVED, val);
}

// ── Immersion mode ──────────────────────────────────────────────

export function loadImmersionMode() {
  return load(KEYS.IMMERSION_MODE, 'auto');
}

export function saveImmersionMode(mode) {
  save(KEYS.IMMERSION_MODE, mode);
}
