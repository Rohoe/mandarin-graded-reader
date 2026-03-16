import { describe, it, expect } from 'vitest';
import { getLang, getAllLanguages, getLanguageIds, DEFAULT_LANG_ID, getLessonTitle } from './languages';

// ── getLang ──────────────────────────────────────────────────

describe('getLang', () => {
  it('returns Mandarin config for "zh"', () => {
    const lang = getLang('zh');
    expect(lang.id).toBe('zh');
    expect(lang.name).toBe('Mandarin Chinese');
  });

  it('returns Korean config for "ko"', () => {
    const lang = getLang('ko');
    expect(lang.id).toBe('ko');
    expect(lang.name).toBe('Korean');
  });

  it('returns Cantonese config for "yue"', () => {
    const lang = getLang('yue');
    expect(lang.id).toBe('yue');
    expect(lang.name).toBe('Cantonese');
  });

  it('falls back to Mandarin for unknown id', () => {
    const lang = getLang('xx');
    expect(lang.id).toBe('zh');
  });
});

// ── getAllLanguages / getLanguageIds ──────────────────────────

describe('getAllLanguages', () => {
  it('returns all 6 language configs', () => {
    const langs = getAllLanguages();
    expect(langs).toHaveLength(6);
    const ids = langs.map(l => l.id);
    expect(ids).toContain('zh');
    expect(ids).toContain('ko');
    expect(ids).toContain('yue');
    expect(ids).toContain('fr');
    expect(ids).toContain('es');
    expect(ids).toContain('en');
  });
});

describe('getLanguageIds', () => {
  it('returns correct IDs', () => {
    const ids = getLanguageIds();
    expect(ids).toEqual(['zh', 'ko', 'yue', 'fr', 'es', 'en']);
  });
});

// ── DEFAULT_LANG_ID ──────────────────────────────────────────

describe('DEFAULT_LANG_ID', () => {
  it('is zh', () => {
    expect(DEFAULT_LANG_ID).toBe('zh');
  });
});

// ── getLessonTitle ────────────────────────────────────────────

describe('getLessonTitle', () => {
  it('returns title_zh for Mandarin', () => {
    const lesson = { title_zh: '你好世界', title_ko: '안녕하세요' };
    expect(getLessonTitle(lesson, 'zh')).toBe('你好世界');
  });

  it('returns title_ko for Korean', () => {
    const lesson = { title_zh: '你好', title_ko: '안녕하세요' };
    expect(getLessonTitle(lesson, 'ko')).toBe('안녕하세요');
  });

  it('returns title_yue for Cantonese', () => {
    const lesson = { title_yue: '你好世界', title_zh: '你好' };
    expect(getLessonTitle(lesson, 'yue')).toBe('你好世界');
  });

  it('falls back through title fields when primary is missing', () => {
    const lesson = { title_zh: '你好' };
    // Korean lesson without title_ko should fall back to title_zh
    expect(getLessonTitle(lesson, 'ko')).toBe('你好');
  });

  it('falls back to title_target', () => {
    const lesson = { title_target: 'fallback title' };
    expect(getLessonTitle(lesson, 'zh')).toBe('fallback title');
  });

  it('returns empty string for null lesson', () => {
    expect(getLessonTitle(null, 'zh')).toBe('');
  });

  it('returns empty string when no title fields exist', () => {
    expect(getLessonTitle({}, 'zh')).toBe('');
  });
});

// ── Config structure validation ──────────────────────────────

describe('language config structure', () => {
  const langIds = ['zh', 'ko', 'yue', 'fr', 'es', 'en'];

  it.each(langIds)('%s has all required fields', (id) => {
    const lang = getLang(id);
    expect(lang.id).toBe(id);
    expect(lang.name).toBeTruthy();
    expect(lang.nameNative).toBeTruthy();
    expect(lang.deckLabel).toBeTruthy();
    expect(lang.proficiency).toBeDefined();
    expect(lang.proficiency.levels.length).toBeGreaterThanOrEqual(7);
    expect(lang.fields).toBeDefined();
    expect(lang.fields.target).toBeTruthy();
    // romanization can be null for Latin-script languages
    if (lang.scriptType !== 'latin') {
      expect(lang.fields.romanization).toBeTruthy();
    }
    expect(lang.fields.translation).toBeTruthy();
    // scriptRegex can be null for Latin-script languages
    if (lang.scriptType !== 'latin') {
      expect(lang.scriptRegex).toBeInstanceOf(RegExp);
    } else {
      expect(lang.scriptRegex).toBeNull();
    }
    expect(lang.fonts).toBeDefined();
    expect(lang.tts).toBeDefined();
    expect(lang.prompts).toBeDefined();
    // getRomanizer can be null for Latin-script languages
    if (lang.scriptType !== 'latin') {
      expect(typeof lang.getRomanizer).toBe('function');
    } else {
      expect(lang.getRomanizer).toBeNull();
    }
  });

  it('zh scriptRegex matches Chinese characters', () => {
    expect(getLang('zh').scriptRegex.test('你')).toBe(true);
    expect(getLang('zh').scriptRegex.test('a')).toBe(false);
  });

  it('ko scriptRegex matches Korean characters', () => {
    expect(getLang('ko').scriptRegex.test('한')).toBe(true);
    expect(getLang('ko').scriptRegex.test('a')).toBe(false);
  });

  it('yue scriptRegex matches Chinese characters', () => {
    expect(getLang('yue').scriptRegex.test('廣')).toBe(true);
    expect(getLang('yue').scriptRegex.test('a')).toBe(false);
  });

  it('fr has null scriptRegex', () => {
    expect(getLang('fr').scriptRegex).toBeNull();
  });

  it('es has null scriptRegex', () => {
    expect(getLang('es').scriptRegex).toBeNull();
  });

  it('en has null scriptRegex', () => {
    expect(getLang('en').scriptRegex).toBeNull();
  });

  it.each(['fr', 'es', 'en'])('%s has scriptType latin', (id) => {
    expect(getLang(id).scriptType).toBe('latin');
  });

  it.each(['zh', 'yue'])('%s has scriptType cjk', (id) => {
    expect(getLang(id).scriptType).toBe('cjk');
  });

  it('ko has scriptType syllabic', () => {
    expect(getLang('ko').scriptType).toBe('syllabic');
  });
});

// ── wordThreshold ───────────────────────────────────────────

describe('wordThreshold', () => {
  const langIds = ['zh', 'ko', 'yue', 'fr', 'es', 'en'];

  it.each(langIds)('%s has wordThreshold on every proficiency level', (id) => {
    const lang = getLang(id);
    for (const level of lang.proficiency.levels) {
      expect(level.wordThreshold).toBeDefined();
      expect(typeof level.wordThreshold).toBe('number');
      expect(level.wordThreshold).toBeGreaterThan(0);
    }
  });

  it.each(langIds)('%s thresholds are monotonically increasing', (id) => {
    const lang = getLang(id);
    const thresholds = lang.proficiency.levels.map(l => l.wordThreshold);
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
    }
  });
});

// ── Prompt fragments ─────────────────────────────────────────

describe('getStoryRequirements', () => {
  it('returns level-appropriate content for zh level 0', () => {
    const result = getLang('zh').prompts.getStoryRequirements(0);
    expect(result).toContain('HSK 0');
    expect(result).toContain('total beginner');
  });

  it('returns level-appropriate content for ko level 5', () => {
    const result = getLang('ko').prompts.getStoryRequirements(5);
    expect(result).toContain('TOPIK 5-6');
    expect(result).toContain('Complex syntax');
  });

  it('returns Cantonese-specific content for yue', () => {
    const result = getLang('yue').prompts.getStoryRequirements(3);
    expect(result).toContain('WRITTEN CANTONESE');
    expect(result).toContain('YUE 3');
  });

  it('returns CEFR content for French', () => {
    const result = getLang('fr').prompts.getStoryRequirements(3);
    expect(result).toContain('CEFR B1');
  });

  it('returns CEFR content for Spanish', () => {
    const result = getLang('es').prompts.getStoryRequirements(0);
    expect(result).toContain('A0');
    expect(result).toContain('total beginner');
  });

  it('returns CEFR content for English (ESL)', () => {
    const result = getLang('en').prompts.getStoryRequirements(4);
    expect(result).toContain('CEFR B2');
  });
});
