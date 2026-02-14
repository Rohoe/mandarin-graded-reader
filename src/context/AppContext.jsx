/* eslint-disable react-refresh/only-export-components */
import { createContext, useReducer, useEffect } from 'react';
import {
  loadApiKey,
  saveApiKey,
  clearApiKey,
  loadSyllabi,
  saveSyllabi,
  loadSyllabusProgress,
  saveSyllabusProgress,
  loadStandaloneReaders,
  saveStandaloneReaders,
  loadReader,
  saveReader,
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

// ── Initial state ─────────────────────────────────────────────

function buildInitialState() {
  return {
    apiKey:            loadApiKey(),
    syllabi:           loadSyllabi(),
    syllabusProgress:  loadSyllabusProgress(),
    standaloneReaders: loadStandaloneReaders(),
    generatedReaders:  {},
    learnedVocabulary: loadLearnedVocabulary(),
    exportedWords:     loadExportedWords(),
    loading:           false,
    loadingMessage:    '',
    error:             null,
    notification:      null,
    // File storage
    fsInitialized:     false,
    saveFolder:        null,
    fsSupported:       isSupported(),
    // API preferences (persisted, survive CLEAR_ALL_DATA)
    maxTokens:         loadMaxTokens(),
    defaultLevel:      loadDefaultLevel(),
    // Background generation tracking (ephemeral, not persisted)
    pendingReaders:    {},
  };
}

// ── Reducer ───────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    case 'SET_API_KEY':
      saveApiKey(action.payload);
      return { ...state, apiKey: action.payload };

    case 'CLEAR_API_KEY':
      clearApiKey();
      return { ...state, apiKey: '' };

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

    case 'REMOVE_SYLLABUS': {
      const id = action.payload;
      const newSyllabi = state.syllabi.filter(s => s.id !== id);
      saveSyllabi(newSyllabi);
      const newProgress = { ...state.syllabusProgress };
      delete newProgress[id];
      saveSyllabusProgress(newProgress);
      // Remove cached readers for this syllabus
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
      const newReaders = { ...state.generatedReaders };
      delete newReaders[key];
      return { ...state, standaloneReaders: newList, generatedReaders: newReaders };
    }

    // ── Reader cache actions ──────────────────────────────────

    case 'SET_READER': {
      const { lessonKey, data } = action.payload;
      saveReader(lessonKey, data);
      return {
        ...state,
        generatedReaders: { ...state.generatedReaders, [lessonKey]: data },
      };
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

    // ── Vocabulary actions ────────────────────────────────────

    case 'ADD_VOCABULARY': {
      const updated = addLearnedVocabulary(action.payload);
      return { ...state, learnedVocabulary: updated };
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
        apiKey:        state.apiKey,
        saveFolder:    state.saveFolder,
        fsInitialized: state.fsInitialized,
        fsSupported:   state.fsSupported,
        maxTokens:     state.maxTokens,
        defaultLevel:  state.defaultLevel,
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
        syllabi:           d.syllabi,
        syllabusProgress:  d.syllabusProgress,
        standaloneReaders: d.standaloneReaders,
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

    case 'START_PENDING_READER':
      return { ...state, pendingReaders: { ...state.pendingReaders, [action.payload]: true } };

    case 'CLEAR_PENDING_READER': {
      const next = { ...state.pendingReaders };
      delete next[action.payload];
      return { ...state, pendingReaders: next };
    }

    default:
      return state;
  }
}

// ── Context + Provider ────────────────────────────────────────

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState);

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

  // Auto-clear notifications after 5 s
  useEffect(() => {
    if (!state.notification) return;
    const id = setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 5000);
    return () => clearTimeout(id);
  }, [state.notification]);

  return (
    <AppContext.Provider value={{ state, dispatch, pickSaveFolder, removeSaveFolder }}>
      {children}
    </AppContext.Provider>
  );
}

export { useApp } from './useApp';
