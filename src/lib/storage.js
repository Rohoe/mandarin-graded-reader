/**
 * Storage barrel — re-exports from domain-specific modules.
 *
 * All existing `import { ... } from './storage'` continue to work.
 * For new code, prefer importing directly from the domain module
 * (e.g., `import { loadSyllabi } from './storageSyllabus'`).
 */

// ── Helpers & handle management ─────────────────────────────
export { isStorageAvailable, setDirectoryHandle, getDirectoryHandle } from './storageHelpers';

// ── Reader operations (from readerStorage.js, already extracted) ─
export { loadReaderIndex, loadAllReaders, saveReader, deleteReader, saveReaderSafe, loadReader, clearReaders, loadEvictedReaderKeys, saveEvictedReaderKeys, unmarkEvicted, evictStaleReaders } from './readerStorage';

// ── Provider / API keys ─────────────────────────────────────
export { saveApiKey, loadApiKey, clearApiKey, loadProviderKeys, saveProviderKeys, loadActiveProvider, saveActiveProvider, loadActiveModels, saveActiveModels, loadCustomBaseUrl, saveCustomBaseUrl, loadCustomModelName, saveCustomModelName, loadGradingModels, saveGradingModels, loadCompatPreset, saveCompatPreset } from './storageProvider';

// ── Syllabi, progress, standalone, paths ─────────────────────
export { loadSyllabi, saveSyllabi, loadLearningPaths, saveLearningPaths, loadSyllabusProgress, saveSyllabusProgress, loadStandaloneReaders, saveStandaloneReaders } from './storageSyllabus';

// ── Vocabulary ──────────────────────────────────────────────
export { loadLearnedVocabulary, addLearnedVocabulary, mergeVocabulary, saveLearnedVocabulary, mergeExportedWords, saveExportedWordsFull, clearLearnedVocabulary, loadExportedWords, addExportedWords, clearExportedWords } from './storageVocabulary';

// ── Grammar ─────────────────────────────────────────────────
export { loadLearnedGrammar, mergeGrammar, saveLearnedGrammar, loadGrammarSession, saveGrammarSession } from './storageGrammar';

// ── Preferences ─────────────────────────────────────────────
export { loadMaxTokens, saveMaxTokens, loadDefaultLevel, saveDefaultLevel, loadDefaultTopikLevel, saveDefaultTopikLevel, loadDefaultYueLevel, saveDefaultYueLevel, loadDefaultLevels, saveDefaultLevels, loadDarkMode, saveDarkMode, loadTtsVoiceURI, saveTtsVoiceURI, loadTtsKoVoiceURI, saveTtsKoVoiceURI, loadTtsYueVoiceURI, saveTtsYueVoiceURI, loadTtsVoiceURIs, saveTtsVoiceURIs, loadTtsSpeechRate, saveTtsSpeechRate, loadRomanizationOn, saveRomanizationOn, loadTranslateButtons, saveTranslateButtons, loadTranslateQuestions, saveTranslateQuestions, loadExportSentenceRom, saveExportSentenceRom, loadExportSentenceTrans, saveExportSentenceTrans, loadStructuredOutput, saveStructuredOutput, loadNewCardsPerDay, saveNewCardsPerDay, loadShowArchived, saveShowArchived, loadImmersionMode, saveImmersionMode } from './storagePreferences';

// ── Session / ephemeral ─────────────────────────────────────
export { loadFlashcardSession, saveFlashcardSession, loadNativeLang, saveNativeLang, loadLastSession, saveLastSession } from './storageSession';

// ── Cloud sync ──────────────────────────────────────────────
export { loadCloudLastSynced, saveCloudLastSynced, loadLastModified, saveLastModified } from './storageCloud';

// ── Activity / reading time / goals ─────────────────────────
export { loadLearningActivity, saveLearningActivity, stashOldActivity, loadActivityStash, loadReadingTime, saveReadingTime, loadReadingTimeLog, saveReadingTimeLog, loadWeeklyGoals, saveWeeklyGoals, loadDifficultyFeedback, saveDifficultyFeedback, loadShownMilestones, saveShownMilestones } from './storageActivity';

// ── Cross-cutting utilities ─────────────────────────────────

import { loadAllReaders } from './readerStorage';
import { load } from './storageHelpers';

const READER_KEY_PREFIX = 'gradedReader_reader_';

const KEYS = {
  SYLLABI:            'gradedReader_syllabi',
  SYLLABUS_PROGRESS:  'gradedReader_syllabusProgress',
  STANDALONE_READERS: 'gradedReader_standaloneReaders',
  READERS:            'gradedReader_readers',
  READER_INDEX:       'gradedReader_readerIndex',
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
  TTS_VOICE_URIS:     'gradedReader_ttsVoiceURIs',
  CLOUD_LAST_SYNCED:  'gradedReader_cloudLastSynced',
  VERBOSE_VOCAB:      'gradedReader_verboseVocab',
  EXPORT_SENTENCE_ROM:   'gradedReader_exportSentenceRom',
  EXPORT_SENTENCE_TRANS: 'gradedReader_exportSentenceTrans',
  STRUCTURED_OUTPUT:  'gradedReader_structuredOutput',
  LEARNING_ACTIVITY:  'gradedReader_learningActivity',
  PROVIDER_KEYS:      'gradedReader_providerKeys',
  ACTIVE_PROVIDER:    'gradedReader_activeProvider',
  ACTIVE_MODEL:       'gradedReader_activeModel',
  CUSTOM_BASE_URL:    'gradedReader_customBaseUrl',
  CUSTOM_MODEL_NAME:  'gradedReader_customModelName',
  GRADING_MODELS:     'gradedReader_gradingModels',
  COMPAT_PRESET:      'gradedReader_compatPreset',
  TTS_SPEECH_RATE:    'gradedReader_ttsSpeechRate',
  ROMANIZATION_ON:    'gradedReader_romanizationOn',
  TRANSLATE_BUTTONS:  'gradedReader_translateButtons',
  TRANSLATE_QUESTIONS: 'gradedReader_translateQuestions',
  EVICTED_READER_KEYS: 'gradedReader_evictedReaderKeys',
  NEW_CARDS_PER_DAY:   'gradedReader_newCardsPerDay',
  GRAMMAR:             'gradedReader_learnedGrammar',
  FLASHCARD_SESSION:   'gradedReader_flashcardSession',
  READING_TIME:        'gradedReader_readingTime',
  NATIVE_LANG:         'gradedReader_nativeLang',
  READING_TIME_LOG:    'gradedReader_readingTimeLog',
  WEEKLY_GOALS:        'gradedReader_weeklyGoals',
  SHOW_ARCHIVED:       'gradedReader_showArchived',
  IMMERSION_MODE:      'gradedReader_immersionMode',
  LEARNING_PATHS:      'gradedReader_learningPaths',
  DIFFICULTY_FEEDBACK: 'gradedReader_difficultyFeedback',
  SHOWN_MILESTONES:    'gradedReader_shownMilestones',
};

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

export function clearAllAppData() {
  const index = load(KEYS.READER_INDEX, []);
  for (const key of index) {
    localStorage.removeItem(READER_KEY_PREFIX + key);
  }
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem(KEYS.READERS);
  localStorage.removeItem(KEYS.EVICTED_READER_KEYS);
  localStorage.removeItem('gradedReader_nativeLangTipDismissed');
}

export function exportAllData() {
  return {
    version:          1,
    exportedAt:       new Date().toISOString(),
    syllabi:          load(KEYS.SYLLABI, []),
    syllabusProgress: load(KEYS.SYLLABUS_PROGRESS, {}),
    standaloneReaders:load(KEYS.STANDALONE_READERS, []),
    learningPaths:    load(KEYS.LEARNING_PATHS, []),
    generatedReaders: loadAllReaders(),
    learnedVocabulary:load(KEYS.VOCABULARY, {}),
    exportedWords:    load(KEYS.EXPORTED, []),
  };
}
