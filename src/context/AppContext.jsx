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
  saveReader,
  saveReaderSafe,
  deleteReader,
  clearReaders,
  loadLearnedVocabulary,
  addLearnedVocabulary,
  clearLearnedVocabulary,
  loadExportedWords,
  addExportedWords,
  clearExportedWords,
  clearAllAppData,
  setDirectoryHandle,
  loadMaxTokens,
  saveMaxTokens,
  loadDefaultLevel,
  saveDefaultLevel,
  loadDefaultTopikLevel,
  saveDefaultTopikLevel,
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
  loadVerboseVocab,
  saveVerboseVocab,
  loadLastModified,
  saveLastModified,
  loadLearningActivity,
  saveLearningActivity,
} from '../lib/storage';
import {
  loadDirectoryHandle,
  saveDirectoryHandle,
  clearDirectoryHandle,
  verifyPermission,
  readAllFromFolder,
  pickDirectory,
  isSupported,
} from '../lib/fileStorage';
import { pushToCloud, pullFromCloud, pushReaderToCloud, detectConflict } from '../lib/cloudSync';

// ── Initial state ─────────────────────────────────────────────

function buildInitialState() {
  const providerKeys   = loadProviderKeys();
  const activeProvider = loadActiveProvider();
  return {
    apiKey:            providerKeys[activeProvider] || '',
    providerKeys,
    activeProvider,
    activeModels:      loadActiveModels(),
    customBaseUrl:     loadCustomBaseUrl(),
    customModelName:   loadCustomModelName(),
    compatPreset:      loadCompatPreset(),
    syllabi:           normalizeSyllabi(loadSyllabi()),
    syllabusProgress:  loadSyllabusProgress(),
    standaloneReaders: normalizeStandaloneReaders(loadStandaloneReaders()),
    generatedReaders:  {},
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
    darkMode:          loadDarkMode(),
    ttsVoiceURI:       loadTtsVoiceURI(),
    ttsKoVoiceURI:     loadTtsKoVoiceURI(),
    ttsYueVoiceURI:    loadTtsYueVoiceURI(),
    ttsSpeechRate:     loadTtsSpeechRate(),
    romanizationOn:    loadRomanizationOn(),
    verboseVocab:      loadVerboseVocab(),
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
  'ADD_STANDALONE_READER', 'REMOVE_STANDALONE_READER',
  'ARCHIVE_SYLLABUS', 'UNARCHIVE_SYLLABUS',
  'ARCHIVE_STANDALONE_READER', 'UNARCHIVE_STANDALONE_READER',
  'SET_READER', 'CLEAR_READER',
  'ADD_VOCABULARY', 'CLEAR_VOCABULARY',
  'ADD_EXPORTED_WORDS', 'CLEAR_EXPORTED_WORDS',
  'RESTORE_FROM_BACKUP',
]);

// ── Reducer ───────────────────────────────────────────────────

function baseReducer(state, action) {
  switch (action.type) {

    case 'SET_API_KEY': {
      // Backward compat: map to anthropic provider key
      const newKeys = { ...state.providerKeys, anthropic: action.payload };
      saveProviderKeys(newKeys);
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'CLEAR_API_KEY': {
      const newKeys = { ...state.providerKeys, anthropic: '' };
      saveProviderKeys(newKeys);
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'SET_PROVIDER_KEY': {
      const { provider, key } = action.payload;
      const newKeys = { ...state.providerKeys, [provider]: key };
      saveProviderKeys(newKeys);
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'SET_ACTIVE_PROVIDER': {
      saveActiveProvider(action.payload);
      return { ...state, activeProvider: action.payload, apiKey: state.providerKeys[action.payload] || '' };
    }

    case 'SET_ACTIVE_MODEL': {
      const { provider: prov, model } = action.payload;
      const newModels = { ...state.activeModels, [prov]: model };
      saveActiveModels(newModels);
      return { ...state, activeModels: newModels };
    }

    case 'SET_CUSTOM_BASE_URL':
      saveCustomBaseUrl(action.payload);
      return { ...state, customBaseUrl: action.payload };

    case 'SET_CUSTOM_MODEL_NAME':
      saveCustomModelName(action.payload);
      return { ...state, customModelName: action.payload };

    case 'SET_COMPAT_PRESET':
      saveCompatPreset(action.payload);
      return { ...state, compatPreset: action.payload };

    // ── Syllabus actions ──────────────────────────────────────

    case 'ADD_SYLLABUS': {
      const newSyllabi = [action.payload, ...state.syllabi];
      saveSyllabi(newSyllabi);
      const newProgress = {
        ...state.syllabusProgress,
        [action.payload.id]: { lessonIndex: 0, completedLessons: [] },
      };
      saveSyllabusProgress(newProgress);
      return { ...state, syllabi: newSyllabi, syllabusProgress: newProgress };
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
      saveSyllabi(newSyllabi);
      return { ...state, syllabi: newSyllabi };
    }

    case 'REMOVE_SYLLABUS': {
      const id = action.payload;
      const newSyllabi = state.syllabi.filter(s => s.id !== id);
      saveSyllabi(newSyllabi);
      const newProgress = { ...state.syllabusProgress };
      delete newProgress[id];
      saveSyllabusProgress(newProgress);
      // Remove cached readers from localStorage using the index (avoids loading all reader data)
      const readerKeys = loadReaderIndex();
      readerKeys.forEach(k => {
        if (k.startsWith(`lesson_${id}_`)) deleteReader(k);
      });
      const newReaders = { ...state.generatedReaders };
      Object.keys(newReaders).forEach(k => {
        if (k.startsWith(`lesson_${id}_`)) delete newReaders[k];
      });
      return { ...state, syllabi: newSyllabi, syllabusProgress: newProgress, generatedReaders: newReaders };
    }

    case 'SET_LESSON_INDEX': {
      const { syllabusId, lessonIndex } = action.payload;
      const newProgress = {
        ...state.syllabusProgress,
        [syllabusId]: { ...state.syllabusProgress[syllabusId], lessonIndex },
      };
      saveSyllabusProgress(newProgress);
      return { ...state, syllabusProgress: newProgress };
    }

    case 'MARK_LESSON_COMPLETE': {
      const { syllabusId, lessonIndex } = action.payload;
      const entry = state.syllabusProgress[syllabusId] || { lessonIndex: 0, completedLessons: [] };
      if (entry.completedLessons.includes(lessonIndex)) return state;
      const newEntry = { ...entry, completedLessons: [...entry.completedLessons, lessonIndex] };
      const newProgress = { ...state.syllabusProgress, [syllabusId]: newEntry };
      saveSyllabusProgress(newProgress);
      const actEntry = { type: 'lesson_completed', syllabusId, lessonIndex, timestamp: Date.now() };
      const newActivity = [...state.learningActivity, actEntry];
      saveLearningActivity(newActivity);
      return { ...state, syllabusProgress: newProgress, learningActivity: newActivity };
    }

    case 'UNMARK_LESSON_COMPLETE': {
      const { syllabusId, lessonIndex } = action.payload;
      const entry = state.syllabusProgress[syllabusId] || { lessonIndex: 0, completedLessons: [] };
      const newEntry = { ...entry, completedLessons: entry.completedLessons.filter(i => i !== lessonIndex) };
      const newProgress = { ...state.syllabusProgress, [syllabusId]: newEntry };
      saveSyllabusProgress(newProgress);
      return { ...state, syllabusProgress: newProgress };
    }

    // ── Standalone reader actions ─────────────────────────────

    case 'ADD_STANDALONE_READER': {
      const newList = [action.payload, ...state.standaloneReaders];
      saveStandaloneReaders(newList);
      return { ...state, standaloneReaders: newList };
    }

    case 'REMOVE_STANDALONE_READER': {
      const key = action.payload;
      const newList = state.standaloneReaders.filter(r => r.key !== key);
      saveStandaloneReaders(newList);
      deleteReader(key);
      const newReaders = { ...state.generatedReaders };
      delete newReaders[key];
      return { ...state, standaloneReaders: newList, generatedReaders: newReaders };
    }

    // ── Reader cache actions ──────────────────────────────────

    case 'SET_READER': {
      const { lessonKey, data } = action.payload;
      const { quotaExceeded } = saveReaderSafe(lessonKey, data);
      let newActivity = state.learningActivity;
      // Log quiz grading when gradingResults are saved for the first time
      const prev = state.generatedReaders[lessonKey];
      if (data.gradingResults && (!prev || !prev.gradingResults)) {
        const score = data.gradingResults.overallScore ?? null;
        const actEntry = { type: 'quiz_graded', lessonKey, score, timestamp: Date.now() };
        newActivity = [...newActivity, actEntry];
        saveLearningActivity(newActivity);
      }
      // Log reader generation when story appears for the first time
      if (data.story && (!prev || !prev.story)) {
        const actEntry = { type: 'reader_generated', lessonKey, timestamp: Date.now() };
        newActivity = [...newActivity, actEntry];
        saveLearningActivity(newActivity);
      }
      return {
        ...state,
        generatedReaders: { ...state.generatedReaders, [lessonKey]: data },
        learningActivity: newActivity,
        ...(quotaExceeded ? { quotaWarning: true } : {}),
      };
    }

    case 'CLEAR_READER': {
      const key = action.payload;
      deleteReader(key);
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

    case 'SET_QUOTA_WARNING':
      return { ...state, quotaWarning: action.payload };

    // ── Archive actions ───────────────────────────────────────

    case 'ARCHIVE_SYLLABUS': {
      const newSyllabi = state.syllabi.map(s =>
        s.id === action.payload ? { ...s, archived: true } : s
      );
      saveSyllabi(newSyllabi);
      return { ...state, syllabi: newSyllabi };
    }

    case 'UNARCHIVE_SYLLABUS': {
      const newSyllabi = state.syllabi.map(s =>
        s.id === action.payload ? { ...s, archived: false } : s
      );
      saveSyllabi(newSyllabi);
      return { ...state, syllabi: newSyllabi };
    }

    case 'ARCHIVE_STANDALONE_READER': {
      const newList = state.standaloneReaders.map(r =>
        r.key === action.payload ? { ...r, archived: true } : r
      );
      saveStandaloneReaders(newList);
      return { ...state, standaloneReaders: newList };
    }

    case 'UNARCHIVE_STANDALONE_READER': {
      const newList = state.standaloneReaders.map(r =>
        r.key === action.payload ? { ...r, archived: false } : r
      );
      saveStandaloneReaders(newList);
      return { ...state, standaloneReaders: newList };
    }

    // ── Backup restore ────────────────────────────────────────

    case 'RESTORE_FROM_BACKUP': {
      const d = action.payload;
      const restoredSyllabi = normalizeSyllabi(d.syllabi || []);
      const restoredProgress = d.syllabusProgress || d.syllabus_progress || {};
      const restoredStandalone = normalizeStandaloneReaders(d.standaloneReaders || d.standalone_readers || []);
      const restoredReaders = d.generatedReaders || d.generated_readers || {};
      const restoredVocab = d.learnedVocabulary || d.learned_vocabulary || {};
      const restoredExported = d.exportedWords || d.exported_words || [];
      saveSyllabi(restoredSyllabi);
      saveSyllabusProgress(restoredProgress);
      saveStandaloneReaders(restoredStandalone);
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

    case 'LOG_ACTIVITY': {
      const entry = { ...action.payload, timestamp: Date.now() };
      const newActivity = [...state.learningActivity, entry];
      saveLearningActivity(newActivity);
      return { ...state, learningActivity: newActivity };
    }

    case 'ADD_VOCABULARY': {
      const updated = addLearnedVocabulary(action.payload);
      const wordCount = Array.isArray(action.payload) ? action.payload.length : Object.keys(action.payload).length;
      const entry = { type: 'vocab_added', count: wordCount, timestamp: Date.now() };
      const newActivity = [...state.learningActivity, entry];
      saveLearningActivity(newActivity);
      return { ...state, learnedVocabulary: updated, learningActivity: newActivity };
    }

    case 'CLEAR_VOCABULARY':
      clearLearnedVocabulary();
      return { ...state, learnedVocabulary: {} };

    case 'ADD_EXPORTED_WORDS': {
      const updated = addExportedWords(action.payload);
      return { ...state, exportedWords: updated };
    }

    case 'CLEAR_EXPORTED_WORDS':
      clearExportedWords();
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
      saveMaxTokens(action.payload);
      return { ...state, maxTokens: action.payload };

    case 'SET_DEFAULT_LEVEL':
      saveDefaultLevel(action.payload);
      return { ...state, defaultLevel: action.payload };

    case 'SET_DEFAULT_TOPIK_LEVEL':
      saveDefaultTopikLevel(action.payload);
      return { ...state, defaultTopikLevel: action.payload };

    case 'SET_DARK_MODE':
      saveDarkMode(action.payload);
      return { ...state, darkMode: action.payload };

    case 'SET_TTS_VOICE':
      saveTtsVoiceURI(action.payload);
      return { ...state, ttsVoiceURI: action.payload };

    case 'SET_TTS_KO_VOICE':
      saveTtsKoVoiceURI(action.payload);
      return { ...state, ttsKoVoiceURI: action.payload };

    case 'SET_TTS_YUE_VOICE':
      saveTtsYueVoiceURI(action.payload);
      return { ...state, ttsYueVoiceURI: action.payload };

    case 'SET_VERBOSE_VOCAB':
      saveVerboseVocab(action.payload);
      return { ...state, verboseVocab: action.payload };

    case 'SET_TTS_SPEECH_RATE':
      saveTtsSpeechRate(action.payload);
      return { ...state, ttsSpeechRate: action.payload };

    case 'SET_ROMANIZATION_ON':
      saveRomanizationOn(action.payload);
      return { ...state, romanizationOn: action.payload };

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
      saveCloudLastSynced(action.payload);
      return { ...state, cloudLastSynced: action.payload };

    case 'HYDRATE_FROM_CLOUD': {
      const d = action.payload;
      const normalizedSyllabi = normalizeSyllabi(d.syllabi);
      const normalizedStandalone = normalizeStandaloneReaders(d.standalone_readers);
      const cloudTs = d.updated_at ? new Date(d.updated_at).getTime() : Date.now();
      // Mirror to localStorage
      saveSyllabi(normalizedSyllabi);
      saveSyllabusProgress(d.syllabus_progress);
      saveStandaloneReaders(normalizedStandalone);
      for (const [k, v] of Object.entries(d.generated_readers || {})) saveReader(k, v);
      saveLastModified(cloudTs);
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
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={ctxValue}>
      {children}
    </AppContext.Provider>
  );
}

export { useApp } from './useApp';
export { useAppSelector, useAppDispatch } from './useAppSelector';
