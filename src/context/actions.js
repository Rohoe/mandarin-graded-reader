/**
 * Action creator helpers — separate file so fast-refresh only affects components.
 */
export function actions(dispatch) {
  return {
    setApiKey:             key    => dispatch({ type: 'SET_API_KEY', payload: key }),
    clearApiKey:           ()     => dispatch({ type: 'CLEAR_API_KEY' }),
    // Syllabi
    addSyllabus:           s      => dispatch({ type: 'ADD_SYLLABUS', payload: s }),
    removeSyllabus:        id     => dispatch({ type: 'REMOVE_SYLLABUS', payload: id }),
    extendSyllabusLessons: (id, newLessons) => dispatch({ type: 'EXTEND_SYLLABUS_LESSONS', payload: { id, newLessons } }),
    setLessonIndex:        (syllabusId, lessonIndex) => dispatch({ type: 'SET_LESSON_INDEX', payload: { syllabusId, lessonIndex } }),
    markLessonComplete:    (syllabusId, lessonIndex) => dispatch({ type: 'MARK_LESSON_COMPLETE', payload: { syllabusId, lessonIndex } }),
    unmarkLessonComplete:  (syllabusId, lessonIndex) => dispatch({ type: 'UNMARK_LESSON_COMPLETE', payload: { syllabusId, lessonIndex } }),
    // Standalone readers
    addStandaloneReader:   meta   => dispatch({ type: 'ADD_STANDALONE_READER', payload: meta }),
    removeStandaloneReader:key    => dispatch({ type: 'REMOVE_STANDALONE_READER', payload: key }),
    // Reader cache
    setReader:             (k, d) => dispatch({ type: 'SET_READER', payload: { lessonKey: k, data: d } }),
    clearReader:           k      => dispatch({ type: 'CLEAR_READER', payload: k }),
    // Vocabulary
    addVocabulary:         words  => dispatch({ type: 'ADD_VOCABULARY', payload: words }),
    clearVocabulary:       ()     => dispatch({ type: 'CLEAR_VOCABULARY' }),
    addExportedWords:      words  => dispatch({ type: 'ADD_EXPORTED_WORDS', payload: words }),
    clearExportedWords:    ()     => dispatch({ type: 'CLEAR_EXPORTED_WORDS' }),
    // UI
    setLoading:            (loading, message) => dispatch({ type: 'SET_LOADING', payload: { loading, message } }),
    setError:              msg    => dispatch({ type: 'SET_ERROR', payload: msg }),
    clearError:            ()     => dispatch({ type: 'CLEAR_ERROR' }),
    notify:                (type, message) => dispatch({ type: 'SET_NOTIFICATION', payload: { type, message } }),
    clearAll:              ()     => dispatch({ type: 'CLEAR_ALL_DATA' }),
    setMaxTokens:          n      => dispatch({ type: 'SET_MAX_TOKENS', payload: Number(n) }),
    setDefaultLevel:       n      => dispatch({ type: 'SET_DEFAULT_LEVEL', payload: Number(n) }),
    setDarkMode:           val    => dispatch({ type: 'SET_DARK_MODE', payload: Boolean(val) }),
    setTtsVoice:           uri    => dispatch({ type: 'SET_TTS_VOICE', payload: uri }),
    // Background generation tracking
    startPendingReader:    key    => dispatch({ type: 'START_PENDING_READER', payload: key }),
    clearPendingReader:    key    => dispatch({ type: 'CLEAR_PENDING_READER', payload: key }),
  };
}
