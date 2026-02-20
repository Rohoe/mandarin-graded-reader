/* eslint-disable react-refresh/only-export-components */
import { createContext, useReducer, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeSyllabi, normalizeStandaloneReaders } from '../lib/vocabNormalizer';
import {
  loadProviderKeys,
  saveProviderKeys,
  loadActiveProvider,
  saveActiveProvider,
  loadActiveModels,
  saveActiveModels,
  loadCustomBaseUrl,
  saveCustomBaseUrl,
  loadCustomModelName,
  saveCustomModelName,
  loadCompatPreset,
  saveCompatPreset,
  loadSyllabi,
  saveSyllabi,
  loadSyllabusProgress,
  saveSyllabusProgress,
  loadStandaloneReaders,
  saveStandaloneReaders,
  loadReader,
  loadReaderIndex,
  saveReaderSafe,
  deleteReader,
  clearReaders,
  saveReader,
  loadLearnedVocabulary,
  mergeVocabulary,
  saveLearnedVocabulary,
  loadExportedWords,
  mergeExportedWords,
  saveExportedWordsFull,
  clearAllAppData,
  setDirectoryHandle,
  getDirectoryHandle,
  loadMaxTokens,
  saveMaxTokens,
  loadDefaultLevel,
  saveDefaultLevel,
  loadDefaultTopikLevel,
  saveDefaultTopikLevel,
  loadDefaultYueLevel,
  saveDefaultYueLevel,
  loadDarkMode,
  saveDarkMode,
  loadTtsVoiceURI,
  saveTtsVoiceURI,
  loadTtsKoVoiceURI,
  saveTtsKoVoiceURI,
  loadTtsYueVoiceURI,
  saveTtsYueVoiceURI,
  loadCloudLastSynced,
  saveCloudLastSynced,
  loadTtsSpeechRate,
  saveTtsSpeechRate,
  loadRomanizationOn,
  saveRomanizationOn,
  loadTranslateButtons,
  saveTranslateButtons,
  loadVerboseVocab,
  saveVerboseVocab,
  loadStructuredOutput,
  saveStructuredOutput,
  loadLastModified,
  saveLastModified,
  loadLearningActivity,
  saveLearningActivity,
  stashOldActivity,
  evictStaleReaders,
  loadEvictedReaderKeys,
  saveEvictedReaderKeys,
  unmarkEvicted,
} from '../lib/storage';
import {
  loadDirectoryHandle,
  saveDirectoryHandle,
  clearDirectoryHandle,
  verifyPermission,
  readAllFromFolder,
  readReaderFromFile,
  pickDirectory,
  isSupported,
} from '../lib/fileStorage';
import { pushToCloud, pullFromCloud, pushReaderToCloud, detectConflict, fetchCloudReaderKeys, pullReaderFromCloud } from '../lib/cloudSync';
import { DEMO_READER_KEY, DEMO_READER_DATA } from '../lib/demoReader';

// ── Initial state ─────────────────────────────────────────────

function buildInitialState() {
  const providerKeys   = loadProviderKeys();
  const activeProvider = loadActiveProvider();
  const syllabi = normalizeSyllabi(loadSyllabi());
  const standaloneReaders = normalizeStandaloneReaders(loadStandaloneReaders());

  // Inject demo reader for new users (no syllabi, no standalone readers)
  const isEmpty = syllabi.length === 0 && standaloneReaders.length === 0;
  const demoStandalone = isEmpty
    ? [{ key: DEMO_READER_KEY, topic: DEMO_READER_DATA.topic, level: 2, langId: 'zh', createdAt: Date.now(), isDemo: true }]
    : standaloneReaders;
  const demoReaders = isEmpty
    ? { [DEMO_READER_KEY]: DEMO_READER_DATA }
    : {};

  return {
    apiKey:            providerKeys[activeProvider] || '',
    providerKeys,
    activeProvider,
    activeModels:      loadActiveModels(),
    customBaseUrl:     loadCustomBaseUrl(),
    customModelName:   loadCustomModelName(),
    compatPreset:      loadCompatPreset(),
    syllabi,
    syllabusProgress:  loadSyllabusProgress(),
    standaloneReaders: demoStandalone,
    generatedReaders:  demoReaders,
    learnedVocabulary: loadLearnedVocabulary(),
    exportedWords:     loadExportedWords(),
    loading:           false,
    loadingMessage:    '',
    error:             null,
    notification:      null,
    quotaWarning:      false,
    // File storage
    fsInitialized:     false,
    saveFolder:        null,
    fsSupported:       isSupported(),
    // API preferences (persisted, survive CLEAR_ALL_DATA)
    maxTokens:         loadMaxTokens(),
    defaultLevel:      loadDefaultLevel(),
    defaultTopikLevel: loadDefaultTopikLevel(),
    defaultYueLevel:   loadDefaultYueLevel(),
    darkMode:          loadDarkMode(),
    ttsVoiceURI:       loadTtsVoiceURI(),
    ttsKoVoiceURI:     loadTtsKoVoiceURI(),
    ttsYueVoiceURI:    loadTtsYueVoiceURI(),
    ttsSpeechRate:     loadTtsSpeechRate(),
    romanizationOn:    loadRomanizationOn(),
    translateButtons:  loadTranslateButtons(),
    verboseVocab:      loadVerboseVocab(),
    useStructuredOutput: loadStructuredOutput(),
    // Evicted reader keys (persisted)
    evictedReaderKeys: loadEvictedReaderKeys(),
    // Background generation tracking (ephemeral, not persisted)
    pendingReaders:    {},
    // Learning activity log (persisted)
    learningActivity:  loadLearningActivity(),
    // Cloud sync
    cloudUser:         null,
    cloudSyncing:      false,
    cloudLastSynced:   loadCloudLastSynced(),
    lastModified:      loadLastModified() ?? Date.now(),
    syncConflict:      null, // { cloudData, conflictInfo } when conflict detected
  };
}

// Actions that modify syncable data — bumps lastModified timestamp
const DATA_ACTIONS = new Set([
  'ADD_SYLLABUS', 'EXTEND_SYLLABUS_LESSONS', 'REMOVE_SYLLABUS',
  'SET_LESSON_INDEX', 'MARK_LESSON_COMPLETE', 'UNMARK_LESSON_COMPLETE',
  'ADD_STANDALONE_READER', 'REMOVE_STANDALONE_READER', 'UPDATE_STANDALONE_READER_META',
  'ARCHIVE_SYLLABUS', 'UNARCHIVE_SYLLABUS',
  'ARCHIVE_STANDALONE_READER', 'UNARCHIVE_STANDALONE_READER',
  'SET_READER', 'CLEAR_READER',
  'ADD_VOCABULARY', 'CLEAR_VOCABULARY', 'UPDATE_VOCAB_SRS',
  'ADD_EXPORTED_WORDS', 'CLEAR_EXPORTED_WORDS',
  'RESTORE_FROM_BACKUP',
]);

// ── Reducer ───────────────────────────────────────────────────

function baseReducer(state, action) {
  switch (action.type) {

    case 'SET_API_KEY': {
      const newKeys = { ...state.providerKeys, anthropic: action.payload };
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'CLEAR_API_KEY': {
      const newKeys = { ...state.providerKeys, anthropic: '' };
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'SET_PROVIDER_KEY': {
      const { provider, key } = action.payload;
      const newKeys = { ...state.providerKeys, [provider]: key };
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'SET_ACTIVE_PROVIDER':
      return { ...state, activeProvider: action.payload, apiKey: state.providerKeys[action.payload] || '' };

    case 'SET_ACTIVE_MODEL': {
      const { provider: prov, model } = action.payload;
      return { ...state, activeModels: { ...state.activeModels, [prov]: model } };
    }

    case 'SET_CUSTOM_BASE_URL':
      return { ...state, customBaseUrl: action.payload };

    case 'SET_CUSTOM_MODEL_NAME':
      return { ...state, customModelName: action.payload };

    case 'SET_COMPAT_PRESET':
      return { ...state, compatPreset: action.payload };

    // ── Syllabus actions ──────────────────────────────────────

    case 'ADD_SYLLABUS': {
      const newSyllabi = [action.payload, ...state.syllabi];
      const newProgress = {
        ...state.syllabusProgress,
        [action.payload.id]: { lessonIndex: 0, completedLessons: [] },
      };
      // Remove demo reader on first real generation
      const filteredStandalone = state.standaloneReaders.filter(r => !r.isDemo);
      const filteredReaders = { ...state.generatedReaders };
      if (filteredStandalone.length !== state.standaloneReaders.length) delete filteredReaders[DEMO_READER_KEY];
      return { ...state, syllabi: newSyllabi, syllabusProgress: newProgress, standaloneReaders: filteredStandalone, generatedReaders: filteredReaders };
    }

    case 'EXTEND_SYLLABUS_LESSONS': {
      const { id, newLessons } = action.payload;
      const syllabusIdx = state.syllabi.findIndex(s => s.id === id);
      if (syllabusIdx === -1) return state;
      const existing = state.syllabi[syllabusIdx];
      const startNum = existing.lessons.length + 1;
      const renumbered = newLessons.map((l, i) => ({ ...l, lesson_number: startNum + i }));
      const updated = { ...existing, lessons: [...existing.lessons, ...renumbered] };
      const newSyllabi = state.syllabi.map(s => s.id === id ? updated : s);
      return { ...state, syllabi: newSyllabi };
    }

    case 'REMOVE_SYLLABUS': {
      const id = action.payload;
      const newSyllabi = state.syllabi.filter(s => s.id !== id);
      const newProgress = { ...state.syllabusProgress };
      delete newProgress[id];
      const newReaders = { ...state.generatedReaders };
      Object.keys(newReaders).forEach(k => {
        if (k.startsWith(`lesson_${id}_`)) delete newReaders[k];
      });
      // Clean up evicted keys for this syllabus
      const prefix = `lesson_${id}_`;
      const newEvicted = new Set([...state.evictedReaderKeys].filter(k => !k.startsWith(prefix)));
      return { ...state, syllabi: newSyllabi, syllabusProgress: newProgress, generatedReaders: newReaders, evictedReaderKeys: newEvicted };
    }

    case 'SET_LESSON_INDEX': {
      const { syllabusId, lessonIndex } = action.payload;
      const newProgress = {
        ...state.syllabusProgress,
        [syllabusId]: { ...state.syllabusProgress[syllabusId], lessonIndex },
      };
      return { ...state, syllabusProgress: newProgress };
    }

    case 'MARK_LESSON_COMPLETE': {
      const { syllabusId, lessonIndex } = action.payload;
      const entry = state.syllabusProgress[syllabusId] || { lessonIndex: 0, completedLessons: [] };
      if (entry.completedLessons.includes(lessonIndex)) return state;
      const newEntry = { ...entry, completedLessons: [...entry.completedLessons, lessonIndex] };
      const newProgress = { ...state.syllabusProgress, [syllabusId]: newEntry };
      const actEntry = { type: 'lesson_completed', syllabusId, lessonIndex, timestamp: Date.now() };
      const newActivity = [...state.learningActivity, actEntry];
      return { ...state, syllabusProgress: newProgress, learningActivity: newActivity };
    }

    case 'UNMARK_LESSON_COMPLETE': {
      const { syllabusId, lessonIndex } = action.payload;
      const entry = state.syllabusProgress[syllabusId] || { lessonIndex: 0, completedLessons: [] };
      const newEntry = { ...entry, completedLessons: entry.completedLessons.filter(i => i !== lessonIndex) };
      const newProgress = { ...state.syllabusProgress, [syllabusId]: newEntry };
      return { ...state, syllabusProgress: newProgress };
    }

    // ── Standalone reader actions ─────────────────────────────

    case 'ADD_STANDALONE_READER': {
      // Remove demo reader on first real generation
      const withoutDemo = state.standaloneReaders.filter(r => !r.isDemo);
      const filteredReaders = { ...state.generatedReaders };
      if (withoutDemo.length !== state.standaloneReaders.length) delete filteredReaders[DEMO_READER_KEY];
      return { ...state, standaloneReaders: [action.payload, ...withoutDemo], generatedReaders: filteredReaders };
    }

    case 'UPDATE_STANDALONE_READER_META': {
      const { key, ...meta } = action.payload;
      return {
        ...state,
        standaloneReaders: state.standaloneReaders.map(r =>
          r.key === key ? { ...r, ...meta } : r
        ),
      };
    }

    case 'REMOVE_STANDALONE_READER': {
      const key = action.payload;
      const newList = state.standaloneReaders.filter(r => r.key !== key);
      const newReaders = { ...state.generatedReaders };
      delete newReaders[key];
      // Clean up evicted key
      const newEvicted = new Set(state.evictedReaderKeys);
      newEvicted.delete(key);
      return { ...state, standaloneReaders: newList, generatedReaders: newReaders, evictedReaderKeys: newEvicted };
    }

    // ── Reader cache actions ──────────────────────────────────

    case 'SET_READER': {
      const { lessonKey, data } = action.payload;
      let newActivity = state.learningActivity;
      const prev = state.generatedReaders[lessonKey];
      if (data.gradingResults && (!prev || !prev.gradingResults)) {
        const score = data.gradingResults.overallScore ?? null;
        newActivity = [...newActivity, { type: 'quiz_graded', lessonKey, score, timestamp: Date.now() }];
      }
      if (data.story && (!prev || !prev.story)) {
        newActivity = [...newActivity, { type: 'reader_generated', lessonKey, timestamp: Date.now() }];
      }
      // Remove from evicted set if regenerating an evicted reader
      const newEvicted = state.evictedReaderKeys.has(lessonKey)
        ? new Set([...state.evictedReaderKeys].filter(k => k !== lessonKey))
        : state.evictedReaderKeys;
      return {
        ...state,
        generatedReaders: { ...state.generatedReaders, [lessonKey]: data },
        learningActivity: newActivity,
        evictedReaderKeys: newEvicted,
      };
    }

    case 'CLEAR_READER': {
      const key = action.payload;
      const newReaders = { ...state.generatedReaders };
      delete newReaders[key];
      return { ...state, generatedReaders: newReaders };
    }

    case 'LOAD_CACHED_READER': {
      const { lessonKey } = action.payload;
      const cached = loadReader(lessonKey);
      if (!cached) return state;
      return {
        ...state,
        generatedReaders: { ...state.generatedReaders, [lessonKey]: cached },
      };
    }

    case 'TOUCH_READER': {
      const { lessonKey } = action.payload;
      const existing = state.generatedReaders[lessonKey];
      if (!existing) return state;
      return {
        ...state,
        generatedReaders: {
          ...state.generatedReaders,
          [lessonKey]: { ...existing, lastOpenedAt: Date.now() },
        },
      };
    }

    case 'SET_QUOTA_WARNING':
      return { ...state, quotaWarning: action.payload };

    // ── Archive actions ───────────────────────────────────────

    case 'ARCHIVE_SYLLABUS':
      return { ...state, syllabi: state.syllabi.map(s => s.id === action.payload ? { ...s, archived: true } : s) };

    case 'UNARCHIVE_SYLLABUS':
      return { ...state, syllabi: state.syllabi.map(s => s.id === action.payload ? { ...s, archived: false } : s) };

    case 'ARCHIVE_STANDALONE_READER':
      return { ...state, standaloneReaders: state.standaloneReaders.map(r => r.key === action.payload ? { ...r, archived: true } : r) };

    case 'UNARCHIVE_STANDALONE_READER':
      return { ...state, standaloneReaders: state.standaloneReaders.map(r => r.key === action.payload ? { ...r, archived: false } : r) };

    // ── Backup restore ────────────────────────────────────────

    case 'RESTORE_FROM_BACKUP': {
      const d = action.payload;
      const restoredSyllabi = normalizeSyllabi(d.syllabi || []);
      const restoredProgress = d.syllabusProgress || d.syllabus_progress || {};
      const restoredStandalone = normalizeStandaloneReaders(d.standaloneReaders || d.standalone_readers || []);
      const restoredVocab = d.learnedVocabulary || d.learned_vocabulary || {};
      const restoredExported = d.exportedWords || d.exported_words || [];
      // Readers need immediate persistence (cleared + re-saved)
      const restoredReaders = d.generatedReaders || d.generated_readers || {};
      clearReaders();
      for (const [k, v] of Object.entries(restoredReaders)) saveReader(k, v);
      return {
        ...state,
        syllabi:           restoredSyllabi,
        syllabusProgress:  restoredProgress,
        standaloneReaders: restoredStandalone,
        generatedReaders:  {},
        learnedVocabulary: restoredVocab,
        exportedWords:     new Set(Array.isArray(restoredExported) ? restoredExported : Object.keys(restoredExported)),
      };
    }

    // ── Vocabulary actions ────────────────────────────────────

    case 'SET_LEARNING_ACTIVITY':
      return { ...state, learningActivity: action.payload };

    case 'LOG_ACTIVITY': {
      const entry = { ...action.payload, timestamp: Date.now() };
      return { ...state, learningActivity: [...state.learningActivity, entry] };
    }

    case 'ADD_VOCABULARY': {
      const updated = mergeVocabulary(state.learnedVocabulary, action.payload);
      const wordCount = Array.isArray(action.payload) ? action.payload.length : Object.keys(action.payload).length;
      const entry = { type: 'vocab_added', count: wordCount, timestamp: Date.now() };
      return { ...state, learnedVocabulary: updated, learningActivity: [...state.learningActivity, entry] };
    }

    case 'UPDATE_VOCAB_SRS': {
      const { word, ...srsFields } = action.payload;
      const existing = state.learnedVocabulary[word];
      if (!existing) return state;
      return {
        ...state,
        learnedVocabulary: {
          ...state.learnedVocabulary,
          [word]: { ...existing, ...srsFields },
        },
      };
    }

    case 'CLEAR_VOCABULARY':
      return { ...state, learnedVocabulary: {} };

    case 'ADD_EXPORTED_WORDS':
      return { ...state, exportedWords: mergeExportedWords(state.exportedWords, action.payload) };

    case 'CLEAR_EXPORTED_WORDS':
      return { ...state, exportedWords: new Set() };

    // ── UI state ──────────────────────────────────────────────

    case 'SET_LOADING':
      return {
        ...state,
        loading:        action.payload.loading,
        loadingMessage: action.payload.message || '',
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false, loadingMessage: '' };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };

    case 'CLEAR_NOTIFICATION':
      return { ...state, notification: null };

    case 'CLEAR_ALL_DATA':
      clearAllAppData();
      return {
        ...buildInitialState(),
        apiKey:          state.apiKey,
        providerKeys:    state.providerKeys,
        activeProvider:  state.activeProvider,
        activeModels:    state.activeModels,
        customBaseUrl:   state.customBaseUrl,
        customModelName: state.customModelName,
        compatPreset:    state.compatPreset,
        saveFolder:      state.saveFolder,
        fsInitialized:   state.fsInitialized,
        fsSupported:     state.fsSupported,
        maxTokens:       state.maxTokens,
        defaultLevel:    state.defaultLevel,
        defaultTopikLevel: state.defaultTopikLevel,
        ttsYueVoiceURI:  state.ttsYueVoiceURI,
        verboseVocab:    state.verboseVocab,
        evictedReaderKeys: new Set(),
      };

    // ── File storage actions ──────────────────────────────────

    case 'FS_INITIALIZED':
      return { ...state, fsInitialized: true };

    case 'SET_SAVE_FOLDER':
      return { ...state, saveFolder: action.payload };

    case 'HYDRATE_FROM_FILES': {
      const d = action.payload;
      return {
        ...state,
        syllabi:           normalizeSyllabi(d.syllabi),
        syllabusProgress:  d.syllabusProgress,
        standaloneReaders: normalizeStandaloneReaders(d.standaloneReaders),
        generatedReaders:  d.generatedReaders,
        learnedVocabulary: d.learnedVocabulary,
        exportedWords:     d.exportedWords,
      };
    }

    // ── API preferences ───────────────────────────────────────

    case 'SET_MAX_TOKENS':
      return { ...state, maxTokens: action.payload };

    case 'SET_DEFAULT_LEVEL':
      return { ...state, defaultLevel: action.payload };

    case 'SET_DEFAULT_TOPIK_LEVEL':
      return { ...state, defaultTopikLevel: action.payload };

    case 'SET_DEFAULT_YUE_LEVEL':
      return { ...state, defaultYueLevel: action.payload };

    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.payload };

    case 'SET_TTS_VOICE':
      return { ...state, ttsVoiceURI: action.payload };

    case 'SET_TTS_KO_VOICE':
      return { ...state, ttsKoVoiceURI: action.payload };

    case 'SET_TTS_YUE_VOICE':
      return { ...state, ttsYueVoiceURI: action.payload };

    case 'SET_VERBOSE_VOCAB':
      return { ...state, verboseVocab: action.payload };

    case 'SET_TTS_SPEECH_RATE':
      return { ...state, ttsSpeechRate: action.payload };

    case 'SET_ROMANIZATION_ON':
      return { ...state, romanizationOn: action.payload };

    case 'SET_TRANSLATE_BUTTONS':
      return { ...state, translateButtons: action.payload };

    case 'SET_STRUCTURED_OUTPUT':
      return { ...state, useStructuredOutput: action.payload };

    case 'START_PENDING_READER':
      return { ...state, pendingReaders: { ...state.pendingReaders, [action.payload]: true } };

    case 'CLEAR_PENDING_READER': {
      const next = { ...state.pendingReaders };
      delete next[action.payload];
      return { ...state, pendingReaders: next };
    }

    // ── Cloud sync actions ────────────────────────────────────

    case 'SET_CLOUD_USER':
      return { ...state, cloudUser: action.payload };

    case 'SET_CLOUD_SYNCING':
      return { ...state, cloudSyncing: action.payload };

    case 'SET_CLOUD_LAST_SYNCED':
      return { ...state, cloudLastSynced: action.payload };

    case 'HYDRATE_FROM_CLOUD': {
      const d = action.payload;
      const normalizedSyllabi = normalizeSyllabi(d.syllabi);
      const normalizedStandalone = normalizeStandaloneReaders(d.standalone_readers);
      const cloudTs = d.updated_at ? new Date(d.updated_at).getTime() : Date.now();
      return {
        ...state,
        syllabi:           normalizedSyllabi,
        syllabusProgress:  d.syllabus_progress,
        standaloneReaders: normalizedStandalone,
        generatedReaders:  d.generated_readers || {},
        learnedVocabulary: d.learned_vocabulary,
        exportedWords:     new Set(d.exported_words),
        lastModified:      cloudTs,
      };
    }

    case 'SET_EVICTED_READER_KEYS':
      return { ...state, evictedReaderKeys: action.payload };

    case 'RESTORE_EVICTED_READER': {
      const { lessonKey, data } = action.payload;
      const newEvicted = new Set(state.evictedReaderKeys);
      newEvicted.delete(lessonKey);
      return {
        ...state,
        generatedReaders: { ...state.generatedReaders, [lessonKey]: data },
        evictedReaderKeys: newEvicted,
      };
    }

    case 'SHOW_SYNC_CONFLICT':
      return { ...state, syncConflict: action.payload };

    case 'HIDE_SYNC_CONFLICT':
      return { ...state, syncConflict: null };

    default:
      return state;
  }
}

function reducer(state, action) {
  const next = baseReducer(state, action);
  if (next !== state && DATA_ACTIONS.has(action.type)) {
    return { ...next, lastModified: Date.now() };
  }
  return next;
}

// ── Context + Provider ────────────────────────────────────────

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState);
  const stateRef = useRef(state);
  const startupSyncDoneRef = useRef(false);
  const listenersRef = useRef(new Set());
  stateRef.current = state; // synchronous update for useSyncExternalStore

  // Notify subscribers after every state change
  useEffect(() => {
    listenersRef.current.forEach(fn => fn());
  }, [state]);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  // ── Async file storage initialisation (runs once on mount) ──
  useEffect(() => {
    async function initFileStorage() {
      try {
        const handle = await loadDirectoryHandle();
        if (!handle) {
          dispatch({ type: 'FS_INITIALIZED' });
          return;
        }

        const hasPermission = await verifyPermission(handle);
        if (!hasPermission) {
          await clearDirectoryHandle();
          dispatch({ type: 'FS_INITIALIZED' });
          return;
        }

        setDirectoryHandle(handle);
        dispatch({ type: 'SET_SAVE_FOLDER', payload: { name: handle.name } });

        const data = await readAllFromFolder(handle);
        dispatch({ type: 'HYDRATE_FROM_FILES', payload: data });

        // Mirror hydrated data back to localStorage
        if (data.syllabi.length > 0) saveSyllabi(data.syllabi);
        if (Object.keys(data.syllabusProgress).length > 0) saveSyllabusProgress(data.syllabusProgress);
        if (data.standaloneReaders.length > 0) saveStandaloneReaders(data.standaloneReaders);
      } catch (err) {
        console.warn('[AppContext] File storage init failed:', err);
      } finally {
        dispatch({ type: 'FS_INITIALIZED' });
      }
    }

    initFileStorage();

    // Auth listener for cloud sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_CLOUD_USER', payload: session?.user ?? null });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_CLOUD_USER', payload: session?.user ?? null });
    });
    return () => subscription.unsubscribe();
  }, []);

  async function pickSaveFolder() {
    if (!isSupported()) return;
    try {
      const handle = await pickDirectory();
      if (!handle) return;

      await saveDirectoryHandle(handle);
      setDirectoryHandle(handle);
      dispatch({ type: 'SET_SAVE_FOLDER', payload: { name: handle.name } });
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: `Save folder set to "${handle.name}". All changes will now be written to disk.` } });
    } catch (err) {
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: `Could not set folder: ${err.message}` } });
    }
  }

  async function removeSaveFolder() {
    await clearDirectoryHandle();
    setDirectoryHandle(null);
    dispatch({ type: 'SET_SAVE_FOLDER', payload: null });
    dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Save folder removed. Data will only be stored in browser localStorage.' } });
  }

  // Saves a newly-generated reader to local state and immediately pushes it
  // to cloud (bypassing the debounced auto-push to avoid bundling all readers).
  function pushGeneratedReader(lessonKey, readerData) {
    dispatch({ type: 'SET_READER', payload: { lessonKey, data: readerData } });
    if (stateRef.current.cloudUser) {
      pushReaderToCloud(lessonKey, readerData)
        .catch(e => {
          console.warn('[AppContext] Reader push failed:', e.message);
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Reader saved locally but cloud sync failed.' } });
        });
    }
  }

  // Restores an evicted reader from file storage or cloud
  async function restoreEvictedReader(lessonKey) {
    // Try file storage first (faster, no network)
    const dirHandle = getDirectoryHandle();
    if (dirHandle) {
      try {
        const data = await readReaderFromFile(dirHandle, lessonKey);
        if (data) {
          dispatch({ type: 'RESTORE_EVICTED_READER', payload: { lessonKey, data } });
          return true;
        }
      } catch (e) {
        console.warn('[AppContext] File restore failed:', e.message);
      }
    }

    // Try cloud
    if (stateRef.current.cloudUser) {
      try {
        const data = await pullReaderFromCloud(lessonKey);
        if (data) {
          dispatch({ type: 'RESTORE_EVICTED_READER', payload: { lessonKey, data } });
          return true;
        }
      } catch (e) {
        console.warn('[AppContext] Cloud restore failed:', e.message);
      }
    }

    // Neither found — unmark from evicted set so UI falls through to Generate
    unmarkEvicted(lessonKey);
    const newEvicted = new Set(stateRef.current.evictedReaderKeys);
    newEvicted.delete(lessonKey);
    dispatch({ type: 'SET_EVICTED_READER_KEYS', payload: newEvicted });
    return false;
  }

  // Resolves a sync conflict by choosing either 'cloud' or 'local' data
  async function resolveSyncConflict(choice) {
    if (!state.syncConflict) return;

    dispatch({ type: 'SET_CLOUD_SYNCING', payload: true });
    try {
      if (choice === 'cloud') {
        // Pull cloud data, overwrite local
        dispatch({ type: 'HYDRATE_FROM_CLOUD', payload: state.syncConflict.cloudData });
        const cloudTs = new Date(state.syncConflict.cloudData.updated_at).getTime();
        dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: cloudTs });
        dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Synced from cloud.' } });
      } else if (choice === 'local') {
        // Push local data, overwrite cloud
        await pushToCloud(stateRef.current);
        dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: Date.now() });
        dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Pushed to cloud.' } });
      }
    } catch (e) {
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: `Sync failed: ${e.message}` } });
    } finally {
      dispatch({ type: 'HIDE_SYNC_CONFLICT' });
      dispatch({ type: 'SET_CLOUD_SYNCING', payload: false });
      startupSyncDoneRef.current = true;
    }
  }

  // Prune old learning activity entries to stash on startup
  useEffect(() => {
    if (!state.fsInitialized) return;
    const pruned = stashOldActivity(state.learningActivity);
    if (pruned !== state.learningActivity) {
      dispatch({ type: 'SET_LEARNING_ACTIVITY', payload: pruned });
    }
  }, [state.fsInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evict stale readers from localStorage on startup (only when backup exists)
  useEffect(() => {
    if (!state.fsInitialized) return;
    const hasFileBackup = !!state.saveFolder;
    const hasCloudBackup = !!state.cloudUser;
    if (!hasFileBackup && !hasCloudBackup) return;

    async function runEviction() {
      try {
        // Build backupKeys from file + cloud
        let backupKeys = new Set();

        // File storage: readers were hydrated into generatedReaders already
        if (hasFileBackup) {
          for (const k of Object.keys(stateRef.current.generatedReaders)) {
            backupKeys.add(k);
          }
        }

        // Cloud: fetch reader keys
        if (hasCloudBackup) {
          try {
            const cloudKeys = await fetchCloudReaderKeys();
            if (cloudKeys) {
              for (const k of cloudKeys) backupKeys.add(k);
            }
          } catch (e) {
            console.warn('[AppContext] Failed to fetch cloud reader keys for eviction:', e.message);
          }
        }

        if (backupKeys.size === 0) return;

        const evicted = evictStaleReaders({ backupKeys });
        if (evicted.length > 0) {
          dispatch({ type: 'SET_EVICTED_READER_KEYS', payload: loadEvictedReaderKeys() });
        }
      } catch (e) {
        console.warn('[AppContext] Eviction failed:', e.message);
      }
    }

    runEviction();
  }, [state.fsInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persistence effects (pure reducer → side effects here) ──

  // Skip persistence on first render (state came from localStorage already)
  const mountedRef = useRef(false);
  useEffect(() => { mountedRef.current = true; }, []);

  // Data slices
  useEffect(() => { if (mountedRef.current) saveSyllabi(state.syllabi); }, [state.syllabi]);
  useEffect(() => { if (mountedRef.current) saveSyllabusProgress(state.syllabusProgress); }, [state.syllabusProgress]);
  useEffect(() => { if (mountedRef.current) saveStandaloneReaders(state.standaloneReaders); }, [state.standaloneReaders]);
  useEffect(() => { if (mountedRef.current) saveLearnedVocabulary(state.learnedVocabulary); }, [state.learnedVocabulary]);
  useEffect(() => { if (mountedRef.current) saveExportedWordsFull(state.exportedWords); }, [state.exportedWords]);
  useEffect(() => { if (mountedRef.current) saveLearningActivity(state.learningActivity); }, [state.learningActivity]);
  useEffect(() => { if (mountedRef.current) saveEvictedReaderKeys(state.evictedReaderKeys); }, [state.evictedReaderKeys]);

  // Provider/API settings
  useEffect(() => { if (mountedRef.current) saveProviderKeys(state.providerKeys); }, [state.providerKeys]);
  useEffect(() => { if (mountedRef.current) saveActiveProvider(state.activeProvider); }, [state.activeProvider]);
  useEffect(() => { if (mountedRef.current) saveActiveModels(state.activeModels); }, [state.activeModels]);
  useEffect(() => { if (mountedRef.current) saveCustomBaseUrl(state.customBaseUrl); }, [state.customBaseUrl]);
  useEffect(() => { if (mountedRef.current) saveCustomModelName(state.customModelName); }, [state.customModelName]);
  useEffect(() => { if (mountedRef.current) saveCompatPreset(state.compatPreset); }, [state.compatPreset]);

  // User preferences
  useEffect(() => { if (mountedRef.current) saveMaxTokens(state.maxTokens); }, [state.maxTokens]);
  useEffect(() => { if (mountedRef.current) saveDefaultLevel(state.defaultLevel); }, [state.defaultLevel]);
  useEffect(() => { if (mountedRef.current) saveDefaultTopikLevel(state.defaultTopikLevel); }, [state.defaultTopikLevel]);
  useEffect(() => { if (mountedRef.current) saveDefaultYueLevel(state.defaultYueLevel); }, [state.defaultYueLevel]);
  useEffect(() => { if (mountedRef.current) saveDarkMode(state.darkMode); }, [state.darkMode]);
  useEffect(() => { if (mountedRef.current) saveTtsVoiceURI(state.ttsVoiceURI); }, [state.ttsVoiceURI]);
  useEffect(() => { if (mountedRef.current) saveTtsKoVoiceURI(state.ttsKoVoiceURI); }, [state.ttsKoVoiceURI]);
  useEffect(() => { if (mountedRef.current) saveTtsYueVoiceURI(state.ttsYueVoiceURI); }, [state.ttsYueVoiceURI]);
  useEffect(() => { if (mountedRef.current) saveVerboseVocab(state.verboseVocab); }, [state.verboseVocab]);
  useEffect(() => { if (mountedRef.current) saveTtsSpeechRate(state.ttsSpeechRate); }, [state.ttsSpeechRate]);
  useEffect(() => { if (mountedRef.current) saveRomanizationOn(state.romanizationOn); }, [state.romanizationOn]);
  useEffect(() => { if (mountedRef.current) saveTranslateButtons(state.translateButtons); }, [state.translateButtons]);
  useEffect(() => { if (mountedRef.current) saveStructuredOutput(state.useStructuredOutput); }, [state.useStructuredOutput]);
  useEffect(() => { if (mountedRef.current) saveCloudLastSynced(state.cloudLastSynced); }, [state.cloudLastSynced]);

  // Generated readers — diff-based persistence
  const prevReadersRef = useRef(state.generatedReaders);
  useEffect(() => {
    if (!mountedRef.current) return;
    const prev = prevReadersRef.current;
    const curr = state.generatedReaders;
    prevReadersRef.current = curr;
    if (prev === curr) return;
    // Save new/changed readers
    for (const key of Object.keys(curr)) {
      if (curr[key] !== prev[key]) {
        const { quotaExceeded } = saveReaderSafe(key, curr[key]);
        if (quotaExceeded) dispatch({ type: 'SET_QUOTA_WARNING', payload: true });
        // Push updated reader to cloud (handles grading results, user answers, etc.)
        if (stateRef.current.cloudUser) {
          pushReaderToCloud(key, curr[key])
            .catch(e => console.warn('[AppContext] Reader cloud sync failed:', e.message));
        }
      }
    }
    // Delete removed readers
    for (const key of Object.keys(prev)) {
      if (!(key in curr)) deleteReader(key);
    }
  }, [state.generatedReaders]);

  // Apply / remove dark theme attribute on <html>
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [state.darkMode]);

  // Persist lastModified to localStorage whenever it changes
  useEffect(() => {
    saveLastModified(state.lastModified);
  }, [state.lastModified]);

  // Startup sync: runs once when both cloudUser and fsInitialized are ready
  useEffect(() => {
    if (!state.cloudUser || !state.fsInitialized || startupSyncDoneRef.current) return;

    async function doStartupSync() {
      dispatch({ type: 'SET_CLOUD_SYNCING', payload: true });
      try {
        const data = await pullFromCloud();
        if (data) {
          const cloudTs = new Date(data.updated_at).getTime();

          // If cloud is clearly newer, auto-pull
          if (cloudTs > stateRef.current.lastModified) {
            dispatch({ type: 'HYDRATE_FROM_CLOUD', payload: data });
            dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: cloudTs });
            dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Synced from cloud.' } });
          }
          // If local is newer but we have NEVER synced before, show conflict dialog
          else if (!stateRef.current.cloudLastSynced && stateRef.current.lastModified > cloudTs + 1000) {
            const conflict = detectConflict(stateRef.current, data);
            if (conflict) {
              // Show conflict dialog - user will decide
              dispatch({ type: 'SHOW_SYNC_CONFLICT', payload: { cloudData: data, conflictInfo: conflict } });
            } else {
              // Data is identical, just update timestamp
              dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: cloudTs });
            }
          }
          // If local is newer AND we've synced before, auto-push (safe)
          else if (stateRef.current.lastModified > cloudTs + 1000) {
            await pushToCloud(stateRef.current);
            dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: Date.now() });
          }
        } else {
          // No cloud data yet — upload local as initial backup
          await pushToCloud(stateRef.current);
          dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: Date.now() });
        }
      } catch (e) {
        console.warn('[AppContext] Startup sync failed:', e.message);
        dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Cloud sync failed. Your data may be out of date.' } });
      } finally {
        dispatch({ type: 'SET_CLOUD_SYNCING', payload: false });
        startupSyncDoneRef.current = true;
      }
    }

    doStartupSync();
  }, [state.cloudUser, state.fsInitialized]);

  // Debounced auto-push: 3s after any data change, once startup sync is done
  useEffect(() => {
    if (!state.cloudUser || !startupSyncDoneRef.current) return;
    const timer = setTimeout(async () => {
      try {
        await pushToCloud(stateRef.current);
        dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: Date.now() });
      } catch (e) {
        console.warn('[AppContext] Auto-sync failed:', e.message);
        // Only show notification if the last one wasn't also a sync failure (avoid spam from 3s debounce)
        const current = stateRef.current.notification;
        if (!current || !current.message?.includes('cloud sync failed')) {
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Auto-sync to cloud failed. Changes saved locally.' } });
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [state.lastModified, state.cloudUser]);

  // Auto-clear notifications after 5 s
  useEffect(() => {
    if (!state.notification) return;
    const id = setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 5000);
    return () => clearTimeout(id);
  }, [state.notification]);

  // Stabilize context value — reference never changes, so useContext(AppContext)
  // alone won't trigger re-renders. Consumers use useAppSelector for fine-grained
  // subscriptions, or useApp() which reads via getSnapshot() for backward compat.
  const ctxValue = useMemo(() => ({
    dispatch,
    subscribe,
    getSnapshot,
    pickSaveFolder,
    removeSaveFolder,
    pushGeneratedReader,
    resolveSyncConflict,
    restoreEvictedReader,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={ctxValue}>
      {children}
    </AppContext.Provider>
  );
}

export { useApp } from './useApp';
export { useAppSelector, useAppDispatch } from './useAppSelector';
