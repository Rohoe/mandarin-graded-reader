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
} from '../lib/storage';

// ── Initial state ─────────────────────────────────────────────

function buildInitialState() {
  return {
    apiKey:           loadApiKey(),
    currentSyllabus:  loadSyllabus(),
    lessonIndex:      loadLessonIndex(),
    generatedReaders: {},   // { [lessonKey]: parsedReaderData } — loaded on demand
    learnedVocabulary: loadLearnedVocabulary(),
    exportedWords:    loadExportedWords(),
    loading:          false,
    loadingMessage:   '',
    error:            null,
    notification:     null, // { type: 'success'|'error', message }
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
        apiKey: state.apiKey, // keep api key
      };

    default:
      return state;
  }
}

// ── Context + Provider ────────────────────────────────────────

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState);

  // Auto-clear notifications after 4 s
  useEffect(() => {
    if (!state.notification) return;
    const id = setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 4000);
    return () => clearTimeout(id);
  }, [state.notification]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// useApp hook is in ./useApp.js to satisfy fast-refresh rules
export { useApp } from './useApp';

