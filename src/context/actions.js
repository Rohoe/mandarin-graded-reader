/**
 * Action creator helpers — separate file so fast-refresh only affects components.
 */
export function actions(dispatch) {
  return {
    setApiKey:         key    => dispatch({ type: 'SET_API_KEY', payload: key }),
    clearApiKey:       ()     => dispatch({ type: 'CLEAR_API_KEY' }),
    setSyllabus:       s      => dispatch({ type: 'SET_SYLLABUS', payload: s }),
    clearSyllabus:     ()     => dispatch({ type: 'CLEAR_SYLLABUS' }),
    setLessonIndex:    i      => dispatch({ type: 'SET_LESSON_INDEX', payload: i }),
    setReader:         (k, d) => dispatch({ type: 'SET_READER', payload: { lessonKey: k, data: d } }),
    addVocabulary:     words  => dispatch({ type: 'ADD_VOCABULARY', payload: words }),
    clearVocabulary:   ()     => dispatch({ type: 'CLEAR_VOCABULARY' }),
    addExportedWords:  words  => dispatch({ type: 'ADD_EXPORTED_WORDS', payload: words }),
    clearExportedWords:()     => dispatch({ type: 'CLEAR_EXPORTED_WORDS' }),
    setLoading:        (loading, message) => dispatch({ type: 'SET_LOADING', payload: { loading, message } }),
    setError:          msg    => dispatch({ type: 'SET_ERROR', payload: msg }),
    clearError:        ()     => dispatch({ type: 'CLEAR_ERROR' }),
    notify:            (type, message) => dispatch({ type: 'SET_NOTIFICATION', payload: { type, message } }),
    clearAll:          ()     => dispatch({ type: 'CLEAR_ALL_DATA' }),
    setMaxTokens:      n      => dispatch({ type: 'SET_MAX_TOKENS', payload: Number(n) }),
  };
}
