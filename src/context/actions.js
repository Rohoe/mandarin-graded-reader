/**
 * Action creator helpers — separate file so fast-refresh only affects components.
 */
export function actions(dispatch) {
  return {
    setApiKey:             key    => dispatch({ type: 'SET_API_KEY', payload: key }),
    clearApiKey:           ()     => dispatch({ type: 'CLEAR_API_KEY' }),
    setProviderKey:        (provider, key) => dispatch({ type: 'SET_PROVIDER_KEY', payload: { provider, key } }),
    setActiveProvider:     id     => dispatch({ type: 'SET_ACTIVE_PROVIDER', payload: id }),
    setActiveModel:        (provider, model) => dispatch({ type: 'SET_ACTIVE_MODEL', payload: { provider, model } }),
    setGradingModel:       (provider, model) => dispatch({ type: 'SET_GRADING_MODEL', payload: { provider, model } }),
    setCustomBaseUrl:      url    => dispatch({ type: 'SET_CUSTOM_BASE_URL', payload: url }),
    setCustomModelName:    name   => dispatch({ type: 'SET_CUSTOM_MODEL_NAME', payload: name }),
    setCompatPreset:       preset => dispatch({ type: 'SET_COMPAT_PRESET', payload: preset }),
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
    updateStandaloneReaderMeta: meta => dispatch({ type: 'UPDATE_STANDALONE_READER_META', payload: meta }),
    // Archive
    archiveSyllabus:            id  => dispatch({ type: 'ARCHIVE_SYLLABUS', payload: id }),
    unarchiveSyllabus:          id  => dispatch({ type: 'UNARCHIVE_SYLLABUS', payload: id }),
    archiveStandaloneReader:    key => dispatch({ type: 'ARCHIVE_STANDALONE_READER', payload: key }),
    unarchiveStandaloneReader:  key => dispatch({ type: 'UNARCHIVE_STANDALONE_READER', payload: key }),
    // Reader cache
    setReader:             (k, d) => dispatch({ type: 'SET_READER', payload: { lessonKey: k, data: d } }),
    clearReader:           k      => dispatch({ type: 'CLEAR_READER', payload: k }),
    touchReader:           k      => dispatch({ type: 'TOUCH_READER', payload: { lessonKey: k } }),
    // Vocabulary
    addVocabulary:         words  => dispatch({ type: 'ADD_VOCABULARY', payload: words }),
    clearVocabulary:       ()     => dispatch({ type: 'CLEAR_VOCABULARY' }),
    updateVocabSRS:        (word, srsData) => dispatch({ type: 'UPDATE_VOCAB_SRS', payload: { word, ...srsData } }),
    addExportedWords:      words  => dispatch({ type: 'ADD_EXPORTED_WORDS', payload: words }),
    clearExportedWords:    ()     => dispatch({ type: 'CLEAR_EXPORTED_WORDS' }),
    // UI
    setLoading:            (loading, message) => dispatch({ type: 'SET_LOADING', payload: { loading, message } }),
    setError:              msg    => dispatch({ type: 'SET_ERROR', payload: msg }),
    clearError:            ()     => dispatch({ type: 'CLEAR_ERROR' }),
    notify:                (type, message, action) => dispatch({ type: 'SET_NOTIFICATION', payload: { type, message, ...(action ? { action } : {}) } }),
    clearAll:              ()     => dispatch({ type: 'CLEAR_ALL_DATA' }),
    setMaxTokens:          n      => dispatch({ type: 'SET_MAX_TOKENS', payload: Number(n) }),
    setDefaultLevel:       n      => dispatch({ type: 'SET_DEFAULT_LEVEL', payload: Number(n) }),
    setDefaultTopikLevel:  n      => dispatch({ type: 'SET_DEFAULT_TOPIK_LEVEL', payload: Number(n) }),
    setDefaultYueLevel:    n      => dispatch({ type: 'SET_DEFAULT_YUE_LEVEL', payload: Number(n) }),
    setDarkMode:           val    => dispatch({ type: 'SET_DARK_MODE', payload: Boolean(val) }),
    setTtsVoice:           uri    => dispatch({ type: 'SET_TTS_VOICE', payload: uri }),
    setTtsKoVoice:         uri    => dispatch({ type: 'SET_TTS_KO_VOICE', payload: uri }),
    setTtsYueVoice:        uri    => dispatch({ type: 'SET_TTS_YUE_VOICE', payload: uri }),
    setVerboseVocab:       val    => dispatch({ type: 'SET_VERBOSE_VOCAB', payload: Boolean(val) }),
    setTtsSpeechRate:      rate   => dispatch({ type: 'SET_TTS_SPEECH_RATE', payload: Number(rate) }),
    setRomanizationOn:     val    => dispatch({ type: 'SET_ROMANIZATION_ON', payload: Boolean(val) }),
    setTranslateButtons:   val    => dispatch({ type: 'SET_TRANSLATE_BUTTONS', payload: Boolean(val) }),
    setStructuredOutput:   val    => dispatch({ type: 'SET_STRUCTURED_OUTPUT', payload: Boolean(val) }),
    setNewCardsPerDay:     n      => dispatch({ type: 'SET_NEW_CARDS_PER_DAY', payload: Number(n) }),
    // Background generation tracking
    startPendingReader:    key    => dispatch({ type: 'START_PENDING_READER', payload: key }),
    clearPendingReader:    key    => dispatch({ type: 'CLEAR_PENDING_READER', payload: key }),
    // Backup / restore
    restoreFromBackup:     data   => dispatch({ type: 'RESTORE_FROM_BACKUP', payload: data }),
    // Cloud sync
    setCloudUser:          user   => dispatch({ type: 'SET_CLOUD_USER', payload: user }),
    setCloudSyncing:       val    => dispatch({ type: 'SET_CLOUD_SYNCING', payload: val }),
    setCloudLastSynced:    ts     => dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: ts }),
    mergeWithCloud:        data   => dispatch({ type: 'MERGE_WITH_CLOUD', payload: data }),
    clearMergeSnapshot:    ()     => dispatch({ type: 'CLEAR_MERGE_SNAPSHOT' }),
    // Fetched models
    setFetchedModels:      (provider, models) => dispatch({ type: 'SET_FETCHED_MODELS', payload: { provider, models } }),
    // Learning activity
    logActivity:           (type, extra) => dispatch({ type: 'LOG_ACTIVITY', payload: { type, ...extra } }),
  };
}
