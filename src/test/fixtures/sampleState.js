// Minimal state objects for reducer tests

export function createMinimalState(overrides = {}) {
  return {
    apiKey: '',
    providerKeys: { anthropic: '', openai: '', gemini: '', openai_compatible: '' },
    activeProvider: 'anthropic',
    activeModels: { anthropic: null, openai: null, gemini: null, openai_compatible: null },
    customBaseUrl: '',
    customModelName: '',
    compatPreset: 'deepseek',
    syllabi: [],
    syllabusProgress: {},
    standaloneReaders: [],
    generatedReaders: {},
    learnedVocabulary: {},
    exportedWords: new Set(),
    loading: false,
    loadingMessage: '',
    error: null,
    notification: null,
    quotaWarning: false,
    fsInitialized: true,
    saveFolder: null,
    fsSupported: false,
    maxTokens: 8192,
    defaultLevel: 3,
    defaultTopikLevel: 2,
    defaultYueLevel: 2,
    darkMode: false,
    ttsVoiceURI: null,
    ttsKoVoiceURI: null,
    ttsYueVoiceURI: null,
    ttsSpeechRate: 1,
    romanizationOn: false,
    translateButtons: true,
    verboseVocab: false,
    useStructuredOutput: false,
    evictedReaderKeys: new Set(),
    pendingReaders: {},
    learningActivity: [],
    cloudUser: null,
    cloudSyncing: false,
    cloudLastSynced: null,
    lastModified: 1000000,
    hasMergeSnapshot: false,
    ...overrides,
  };
}

export function createSyllabus(overrides = {}) {
  return {
    id: 'syllabus_test1',
    topic: 'Chinese festivals',
    level: 3,
    langId: 'zh',
    summary: 'A syllabus about Chinese festivals.',
    lessons: [
      { lesson_number: 1, title_zh: '春节', title_en: 'Spring Festival', description: 'About Spring Festival', vocabulary_focus: ['spring', 'festival'] },
      { lesson_number: 2, title_zh: '中秋节', title_en: 'Mid-Autumn Festival', description: 'About Mid-Autumn', vocabulary_focus: ['moon', 'cake'] },
    ],
    createdAt: 1700000000000,
    ...overrides,
  };
}

export function createStandaloneReader(overrides = {}) {
  return {
    key: 'standalone_test1',
    topic: 'A day at the market',
    level: 2,
    langId: 'zh',
    createdAt: 1700000000000,
    ...overrides,
  };
}

export function createReaderData(overrides = {}) {
  return {
    raw: 'test raw',
    titleZh: '测试',
    titleEn: 'Test',
    story: '这是一个测试故事。',
    vocabulary: [
      { target: '测试', romanization: 'cè shì', translation: 'test', chinese: '测试', pinyin: 'cè shì', english: 'test' },
    ],
    questions: [{ text: '这是什么？', translation: '' }],
    ankiJson: [
      { chinese: '测试', pinyin: 'cè shì', english: 'n. test', example_story: '这是一个测试。', usage_note_story: 'Basic usage.', example_extra: '', usage_note_extra: '' },
    ],
    grammarNotes: [],
    parseError: null,
    langId: 'zh',
    ...overrides,
  };
}
