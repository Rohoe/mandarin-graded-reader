import { describe, it, expect, vi } from 'vitest';
import { actions } from './actions';

function createActions() {
  const dispatch = vi.fn();
  return { dispatch, a: actions(dispatch) };
}

// ── No-arg actions (dispatch { type } only) ──────────────────

describe('no-arg actions', () => {
  it.each([
    ['clearApiKey',        'CLEAR_API_KEY'],
    ['clearVocabulary',    'CLEAR_VOCABULARY'],
    ['clearError',         'CLEAR_ERROR'],
    ['clearAll',           'CLEAR_ALL_DATA'],
    ['clearExportedWords', 'CLEAR_EXPORTED_WORDS'],
    ['clearMergeSnapshot', 'CLEAR_MERGE_SNAPSHOT'],
  ])('%s dispatches { type: %s }', (name, type) => {
    const { dispatch, a } = createActions();
    a[name]();
    expect(dispatch).toHaveBeenCalledWith({ type });
  });
});

// ── Single-arg passthrough actions ───────────────────────────

describe('single-arg passthrough actions', () => {
  it.each([
    ['setApiKey',                'SET_API_KEY',                'test-key'],
    ['setActiveProvider',        'SET_ACTIVE_PROVIDER',        'openai'],
    ['setCustomBaseUrl',         'SET_CUSTOM_BASE_URL',        'https://example.com'],
    ['setCustomModelName',       'SET_CUSTOM_MODEL_NAME',      'my-model'],
    ['setCompatPreset',          'SET_COMPAT_PRESET',          'deepseek'],
    ['addSyllabus',              'ADD_SYLLABUS',               { id: 's1' }],
    ['removeSyllabus',           'REMOVE_SYLLABUS',            's1'],
    ['addStandaloneReader',      'ADD_STANDALONE_READER',      { key: 'k1' }],
    ['removeStandaloneReader',   'REMOVE_STANDALONE_READER',   'k1'],
    ['updateStandaloneReaderMeta', 'UPDATE_STANDALONE_READER_META', { key: 'k1', title: 'x' }],
    ['archiveSyllabus',          'ARCHIVE_SYLLABUS',           's1'],
    ['unarchiveSyllabus',        'UNARCHIVE_SYLLABUS',         's1'],
    ['archiveStandaloneReader',  'ARCHIVE_STANDALONE_READER',  'k1'],
    ['unarchiveStandaloneReader','UNARCHIVE_STANDALONE_READER','k1'],
    ['clearReader',              'CLEAR_READER',               'lesson_1'],
    ['addVocabulary',            'ADD_VOCABULARY',              [{ target: '猫' }]],
    ['addExportedWords',         'ADD_EXPORTED_WORDS',          ['猫']],
    ['setError',                 'SET_ERROR',                   'Something went wrong'],
    ['setTtsVoice',              'SET_TTS_VOICE',               'voice-uri'],
    ['setTtsKoVoice',            'SET_TTS_KO_VOICE',            'ko-uri'],
    ['setTtsYueVoice',           'SET_TTS_YUE_VOICE',           'yue-uri'],
    ['startPendingReader',       'START_PENDING_READER',        'key1'],
    ['clearPendingReader',       'CLEAR_PENDING_READER',        'key1'],
    ['restoreFromBackup',        'RESTORE_FROM_BACKUP',         { syllabi: [] }],
    ['setCloudUser',             'SET_CLOUD_USER',              { id: 'u1' }],
    ['setCloudSyncing',          'SET_CLOUD_SYNCING',           true],
    ['setCloudLastSynced',       'SET_CLOUD_LAST_SYNCED',       '2024-01-01'],
    ['mergeWithCloud',           'MERGE_WITH_CLOUD',            { syllabi: [] }],
  ])('%s dispatches { type: %s, payload }', (name, type, arg) => {
    const { dispatch, a } = createActions();
    a[name](arg);
    expect(dispatch).toHaveBeenCalledWith({ type, payload: arg });
  });
});

// ── Two-arg compound payload actions ─────────────────────────

describe('two-arg compound payload actions', () => {
  it('setProviderKey dispatches { provider, key }', () => {
    const { dispatch, a } = createActions();
    a.setProviderKey('openai', 'sk-123');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PROVIDER_KEY', payload: { provider: 'openai', key: 'sk-123' } });
  });

  it('setActiveModel dispatches { provider, model }', () => {
    const { dispatch, a } = createActions();
    a.setActiveModel('anthropic', 'claude-sonnet-4');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACTIVE_MODEL', payload: { provider: 'anthropic', model: 'claude-sonnet-4' } });
  });

  it('setGradingModel dispatches { provider, model }', () => {
    const { dispatch, a } = createActions();
    a.setGradingModel('openai', 'gpt-4o-mini');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_GRADING_MODEL', payload: { provider: 'openai', model: 'gpt-4o-mini' } });
  });

  it('extendSyllabusLessons dispatches { id, newLessons }', () => {
    const { dispatch, a } = createActions();
    a.extendSyllabusLessons('s1', [{ title: 'L1' }]);
    expect(dispatch).toHaveBeenCalledWith({ type: 'EXTEND_SYLLABUS_LESSONS', payload: { id: 's1', newLessons: [{ title: 'L1' }] } });
  });

  it('setLessonIndex dispatches { syllabusId, lessonIndex }', () => {
    const { dispatch, a } = createActions();
    a.setLessonIndex('s1', 3);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LESSON_INDEX', payload: { syllabusId: 's1', lessonIndex: 3 } });
  });

  it('markLessonComplete dispatches { syllabusId, lessonIndex }', () => {
    const { dispatch, a } = createActions();
    a.markLessonComplete('s1', 2);
    expect(dispatch).toHaveBeenCalledWith({ type: 'MARK_LESSON_COMPLETE', payload: { syllabusId: 's1', lessonIndex: 2 } });
  });

  it('unmarkLessonComplete dispatches { syllabusId, lessonIndex }', () => {
    const { dispatch, a } = createActions();
    a.unmarkLessonComplete('s1', 2);
    expect(dispatch).toHaveBeenCalledWith({ type: 'UNMARK_LESSON_COMPLETE', payload: { syllabusId: 's1', lessonIndex: 2 } });
  });

  it('setReader dispatches { lessonKey, data }', () => {
    const { dispatch, a } = createActions();
    a.setReader('lesson_s1_0', { story: 'text' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_READER', payload: { lessonKey: 'lesson_s1_0', data: { story: 'text' } } });
  });

  it('updateVocabSRS dispatches { word, ...srsData }', () => {
    const { dispatch, a } = createActions();
    a.updateVocabSRS('猫', { interval: 1, ease: 2.6 });
    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_VOCAB_SRS', payload: { word: '猫', interval: 1, ease: 2.6 } });
  });

  it('setFetchedModels dispatches { provider, models }', () => {
    const { dispatch, a } = createActions();
    const models = [{ id: 'gpt-4o', label: 'GPT-4o' }];
    a.setFetchedModels('openai', models);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_FETCHED_MODELS', payload: { provider: 'openai', models } });
  });

  it('logActivity dispatches { type, ...extra }', () => {
    const { dispatch, a } = createActions();
    a.logActivity('reader_generated', { langId: 'zh', level: 3 });
    expect(dispatch).toHaveBeenCalledWith({ type: 'LOG_ACTIVITY', payload: { type: 'reader_generated', langId: 'zh', level: 3 } });
  });
});

// ── Type-coercing actions ────────────────────────────────────

describe('type-coercing actions', () => {
  it('setMaxTokens coerces to Number', () => {
    const { dispatch, a } = createActions();
    a.setMaxTokens('4096');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_MAX_TOKENS', payload: 4096 });
  });

  it('setDefaultLevel coerces to Number', () => {
    const { dispatch, a } = createActions();
    a.setDefaultLevel('3');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DEFAULT_LEVEL', payload: 3 });
  });

  it('setDefaultTopikLevel coerces to Number', () => {
    const { dispatch, a } = createActions();
    a.setDefaultTopikLevel('2');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DEFAULT_TOPIK_LEVEL', payload: 2 });
  });

  it('setDefaultYueLevel coerces to Number', () => {
    const { dispatch, a } = createActions();
    a.setDefaultYueLevel('2');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DEFAULT_YUE_LEVEL', payload: 2 });
  });

  it('setDarkMode coerces to Boolean', () => {
    const { dispatch, a } = createActions();
    a.setDarkMode(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DARK_MODE', payload: true });
    a.setDarkMode(0);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DARK_MODE', payload: false });
  });

  it('setExportSentenceRom dispatches per-language payload', () => {
    const { dispatch, a } = createActions();
    a.setExportSentenceRom('zh', 'yes');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EXPORT_SENTENCE_ROM', payload: { langId: 'zh', value: true } });
    a.setExportSentenceRom('ko', false);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EXPORT_SENTENCE_ROM', payload: { langId: 'ko', value: false } });
  });

  it('setExportSentenceTrans dispatches per-language payload', () => {
    const { dispatch, a } = createActions();
    a.setExportSentenceTrans('zh', true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EXPORT_SENTENCE_TRANS', payload: { langId: 'zh', value: true } });
    a.setExportSentenceTrans('yue', 0);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EXPORT_SENTENCE_TRANS', payload: { langId: 'yue', value: false } });
  });

  it('setTtsSpeechRate coerces to Number', () => {
    const { dispatch, a } = createActions();
    a.setTtsSpeechRate('0.85');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TTS_SPEECH_RATE', payload: 0.85 });
  });

  it('setRomanizationOn coerces to Boolean', () => {
    const { dispatch, a } = createActions();
    a.setRomanizationOn(0);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ROMANIZATION_ON', payload: false });
  });

  it('setTranslateButtons coerces to Boolean', () => {
    const { dispatch, a } = createActions();
    a.setTranslateButtons(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TRANSLATE_BUTTONS', payload: true });
  });

  it('setStructuredOutput coerces to Boolean', () => {
    const { dispatch, a } = createActions();
    a.setStructuredOutput(0);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_STRUCTURED_OUTPUT', payload: false });
  });

  it('setNewCardsPerDay coerces to Number', () => {
    const { dispatch, a } = createActions();
    a.setNewCardsPerDay('15');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_NEW_CARDS_PER_DAY', payload: 15 });
  });
});

// ── Special actions ──────────────────────────────────────────

describe('special actions', () => {
  it('setLoading dispatches { loading, message }', () => {
    const { dispatch, a } = createActions();
    a.setLoading(true, 'Generating...');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LOADING', payload: { loading: true, message: 'Generating...' } });
  });

  it('touchReader dispatches { lessonKey }', () => {
    const { dispatch, a } = createActions();
    a.touchReader('lesson_s1_0');
    expect(dispatch).toHaveBeenCalledWith({ type: 'TOUCH_READER', payload: { lessonKey: 'lesson_s1_0' } });
  });

  it('notify dispatches without action when not provided', () => {
    const { dispatch, a } = createActions();
    a.notify('success', 'Done!');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Done!' } });
  });

  it('notify dispatches with action when provided', () => {
    const { dispatch, a } = createActions();
    const undoAction = { label: 'Undo', fn: () => {} };
    a.notify('info', 'Deleted', undoAction);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_NOTIFICATION',
      payload: { type: 'info', message: 'Deleted', action: undoAction },
    });
  });
});
