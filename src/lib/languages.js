/**
 * Language configuration registry.
 * Each language is a static config object defining proficiency levels,
 * script detection, typography, TTS, prompt fragments, and UI strings.
 */

const zhConfig = {
  id: 'zh',
  name: 'Mandarin Chinese',
  nameNative: '中文',

  // Proficiency system
  proficiency: {
    name: 'HSK',
    levels: [
      { value: 1, label: 'HSK 1', desc: 'Absolute beginner (~150 words)' },
      { value: 2, label: 'HSK 2', desc: 'Elementary (~300 words)' },
      { value: 3, label: 'HSK 3', desc: 'Pre-intermediate (~600 words)' },
      { value: 4, label: 'HSK 4', desc: 'Intermediate (~1,200 words)' },
      { value: 5, label: 'HSK 5', desc: 'Upper-intermediate (~2,500 words)' },
      { value: 6, label: 'HSK 6', desc: 'Advanced (~5,000 words)' },
    ],
  },

  // Data field mapping (what Claude returns)
  fields: { target: 'chinese', romanization: 'pinyin', translation: 'english' },

  // Character detection
  scriptRegex: /[\u4e00-\u9fff]/,
  punctuation: '\uff0c\u3002\uff01\uff1f\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09\u3010\u3011',
  charUnit: 'Chinese characters (字)',
  charUnitShort: '字',

  // Typography
  fonts: {
    target: "'Noto Serif SC', 'Songti SC', 'SimSun', 'STSong', Georgia, serif",
    googleImport: 'Noto+Serif+SC:wght@400;600;700',
  },
  lineHeight: 1.9,

  // TTS
  tts: {
    langFilter: /zh/i,
    defaultLang: 'zh-CN',
    defaultRate: 0.85,
    priorityVoices: [
      v => v.name === 'Google 普通话（中国大陆）',
      v => v.name === 'Google 国语（台灣）',
      v => /^Tingting$/i.test(v.name),
      v => /^Meijia$/i.test(v.name),
      v => v.lang === 'zh-CN',
      v => v.lang.startsWith('zh'),
    ],
  },

  // Romanization (lazy-loaded)
  getRomanizer: () => import('pinyin-pro').then(m => ({
    romanize: (text) => m.pinyin(text, { type: 'array', toneType: 'symbol' }),
  })),

  // UI
  decorativeChars: ['读', '写', '学', '文', '语', '书'],
  romanizationLabel: '拼',
  romanizationName: 'pinyin',

  // Prompt fragments
  prompts: {
    curriculumDesigner: 'Mandarin Chinese curriculum designer',
    targetLanguage: 'Mandarin Chinese',
    titleInstruction: 'Chinese lesson title (8-15 characters)',
    titleFieldKey: 'title_zh',
    storyRequirements: `- Calibrate language complexity to the HSK level:
  - HSK 1-2: Simple sentences (5-10 characters), basic 是/有/在 structures, high-frequency verbs, concrete nouns, present/past with 了
  - HSK 3-4: Compound sentences, 把/被 constructions, common complements (得、到、完), conjunctions (虽然...但是, 因为...所以), some idiomatic expressions
  - HSK 5-6: Complex syntax, literary expressions where appropriate (之、而、则), abstract vocabulary, formal and informal register as suits the content, classical allusions or chengyu if relevant to the topic
- Dialogue and discourse markers should reflect natural speech patterns appropriate to the context
- Avoid vocabulary or structures above the target HSK level unless explicitly introduced as new words`,
    vocabFormat: `- **Word** (pinyin) - English definition`,
    ankiFields: `{
    "chinese": "词",
    "pinyin": "cí",
    "english": "n. word/term",
    "example_story": "Story sentence using the word.",
    "usage_note_story": "Usage note explaining what this example demonstrates.",
    "example_extra": "Additional example sentence.",
    "usage_note_extra": "Usage note explaining what this example demonstrates."
  }`,
    grammarContext: 'Mandarin grammar patterns',
    gradingContext: 'Chinese language teacher',
    gradingLanguage: 'Mandarin',
  },
};

const koConfig = {
  id: 'ko',
  name: 'Korean',
  nameNative: '한국어',

  proficiency: {
    name: 'TOPIK',
    levels: [
      { value: 1, label: 'TOPIK 1', desc: 'Absolute beginner (~800 words)' },
      { value: 2, label: 'TOPIK 2', desc: 'Elementary (~1,500 words)' },
      { value: 3, label: 'TOPIK 3', desc: 'Pre-intermediate (~3,000 words)' },
      { value: 4, label: 'TOPIK 4', desc: 'Intermediate (~5,000 words)' },
      { value: 5, label: 'TOPIK 5', desc: 'Upper-intermediate (~8,000 words)' },
      { value: 6, label: 'TOPIK 6', desc: 'Advanced (~12,000 words)' },
    ],
  },

  fields: { target: 'korean', romanization: 'romanization', translation: 'english' },

  scriptRegex: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,
  punctuation: '\uff0c\u3002\uff01\uff1f\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09\u3010\u3011',
  charUnit: 'Korean syllables',
  charUnitShort: '자',

  fonts: {
    target: "'Noto Serif KR', 'Batang', 'Gungsuh', Georgia, serif",
    googleImport: 'Noto+Serif+KR:wght@400;600;700',
  },
  lineHeight: 1.8,

  tts: {
    langFilter: /ko/i,
    defaultLang: 'ko-KR',
    defaultRate: 0.9,
    priorityVoices: [
      v => v.name === 'Google 한국의',
      v => /^Yuna$/i.test(v.name),
      v => v.lang === 'ko-KR',
      v => v.lang.startsWith('ko'),
    ],
  },

  getRomanizer: () => import('hangul-romanization').then(m => ({
    romanize: (text) => {
      const fn = m.romanize || m.default?.romanize || m.default;
      if (typeof fn === 'function') {
        // Return array of romanizations per character for ruby display
        const result = [];
        for (const char of text) {
          if (/[\uAC00-\uD7AF]/.test(char)) {
            result.push(fn(char));
          } else {
            result.push(char);
          }
        }
        return result;
      }
      return [...text];
    },
  })),

  decorativeChars: ['읽', '쓰', '배', '글', '어', '책'],
  romanizationLabel: 'Aa',
  romanizationName: 'romanization',

  prompts: {
    curriculumDesigner: 'Korean language curriculum designer',
    targetLanguage: 'Korean',
    titleInstruction: 'Korean lesson title (5-15 syllables)',
    titleFieldKey: 'title_ko',
    storyRequirements: `- Calibrate language complexity to the TOPIK level:
  - TOPIK 1-2: Simple sentences, basic 이다/있다/없다 structures, high-frequency verbs, concrete nouns, present/past with -았/었-, polite speech level (-아요/-어요)
  - TOPIK 3-4: Compound sentences, passive/causative constructions, common grammar patterns (-는 것, -기 때문에, -으면), connecting endings (-고, -지만, -아서), some idiomatic expressions
  - TOPIK 5-6: Complex syntax, formal register (-습니다), literary expressions, advanced grammar (-는 바, -에 의하면), hanja-derived vocabulary, proverbs if relevant
- Dialogue should use appropriate speech levels (존댓말/반말) for the context
- Avoid vocabulary or structures above the target TOPIK level unless explicitly introduced as new words`,
    vocabFormat: `- **Word** (romanization) - English definition`,
    ankiFields: `{
    "korean": "단어",
    "romanization": "dan-eo",
    "english": "n. word/term",
    "example_story": "Story sentence using the word.",
    "usage_note_story": "Usage note explaining what this example demonstrates.",
    "example_extra": "Additional example sentence.",
    "usage_note_extra": "Usage note explaining what this example demonstrates."
  }`,
    grammarContext: 'Korean grammar patterns',
    gradingContext: 'Korean language teacher',
    gradingLanguage: 'Korean',
  },
};

// ── Registry ─────────────────────────────────────────────────

const LANGUAGES = { zh: zhConfig, ko: koConfig };

export function getLang(id) {
  return LANGUAGES[id] || LANGUAGES.zh;
}

export function getAllLanguages() {
  return Object.values(LANGUAGES);
}

export function getLanguageIds() {
  return Object.keys(LANGUAGES);
}

export const DEFAULT_LANG_ID = 'zh';
