/* eslint-disable react-refresh/only-export-components */
import { createContext, useReducer, useEffect } from 'react';
import {
  loadApiKey,
  saveApiKey,
  clearApiKey,
  loadSyllabus,
  saveSyllabus,
  clearSyllabus,
  loadLessonIndex,
  saveLessonIndex,
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
    currentSyllabus:   loadSyllabus(),
    lessonIndex:       loadLessonIndex(),
    generatedReaders:  {},
    learnedVocabulary: loadLearnedVocabulary(),
    exportedWords:     loadExportedWords(),
    loading:           false,
    loadingMessage:    '',
    error:             null,
    notification:      null,
    // File storage
    fsInitialized:     false,   // true once the async FS init is done
    saveFolder:        null,    // { name: string } when a folder is active
    fsSupported:       isSupported(),
    // API preferences
    maxTokens:         loadMaxTokens(),
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

    case 'SET_SYLLABUS':
      saveSyllabus(action.payload);
      saveLessonIndex(0);
      return {
        ...state,
        currentSyllabus:  action.payload,
        lessonIndex:      0,
        generatedReaders: {},
      };

    case 'CLEAR_SYLLABUS':
      clearSyllabus();
      clearReaders();
      return {
        ...state,
        currentSyllabus:  null,
        lessonIndex:      0,
        generatedReaders: {},
      };

    case 'SET_LESSON_INDEX':
      saveLessonIndex(action.payload);
      return { ...state, lessonIndex: action.payload };

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
      };

    // ── File storage actions ──────────────────────────────────

    case 'FS_INITIALIZED':
      return { ...state, fsInitialized: true };

    case 'SET_SAVE_FOLDER':
      return { ...state, saveFolder: action.payload }; // { name } or null

    case 'SET_MAX_TOKENS':
      saveMaxTokens(action.payload);
      return { ...state, maxTokens: action.payload };

    // Hydrate all state from files (called after reading save folder on startup)
    case 'HYDRATE_FROM_FILES': {
      const d = action.payload;
      return {
        ...state,
        currentSyllabus:   d.currentSyllabus,
        lessonIndex:       d.lessonIndex,
        generatedReaders:  d.generatedReaders,
        learnedVocabulary: d.learnedVocabulary,
        exportedWords:     d.exportedWords,
      };
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
          // Permission denied — clear the stale handle
          await clearDirectoryHandle();
          dispatch({ type: 'FS_INITIALIZED' });
          return;
        }

        // Register handle so storage.js fans writes to files
        setDirectoryHandle(handle);
        dispatch({ type: 'SET_SAVE_FOLDER', payload: { name: handle.name } });

        // Read files and hydrate state
        const data = await readAllFromFolder(handle);
        dispatch({ type: 'HYDRATE_FROM_FILES', payload: data });

        // Mirror hydrated data back to localStorage so future sync reads are fast
        if (data.currentSyllabus !== null) saveSyllabus(data.currentSyllabus);
        saveLessonIndex(data.lessonIndex);
        addLearnedVocabulary([]); // no-op — already written inside readAllFromFolder merge
      } catch (err) {
        console.warn('[AppContext] File storage init failed:', err);
      } finally {
        dispatch({ type: 'FS_INITIALIZED' });
      }
    }

    initFileStorage();
  }, []);

  // ── Async pick-folder action (called from Settings) ──────────
  // Exposed via context so Settings can trigger it without prop-drilling.
  async function pickSaveFolder() {
    if (!isSupported()) return;
    try {
      const handle = await pickDirectory();
      if (!handle) return; // user cancelled

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

// useApp hook is in ./useApp.js to satisfy fast-refresh rules
export { useApp } from './useApp';
