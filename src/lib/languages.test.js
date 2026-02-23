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
  it('returns all 3 language configs', () => {
    const langs = getAllLanguages();
    expect(langs).toHaveLength(3);
    const ids = langs.map(l => l.id);
    expect(ids).toContain('zh');
    expect(ids).toContain('ko');
    expect(ids).toContain('yue');
  });
});

describe('getLanguageIds', () => {
  it('returns correct IDs', () => {
    const ids = getLanguageIds();
    expect(ids).toEqual(['zh', 'ko', 'yue']);
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
  const langIds = ['zh', 'ko', 'yue'];

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
    expect(lang.fields.romanization).toBeTruthy();
    expect(lang.fields.translation).toBe('english');
    expect(lang.scriptRegex).toBeInstanceOf(RegExp);
    expect(lang.fonts).toBeDefined();
    expect(lang.tts).toBeDefined();
    expect(lang.prompts).toBeDefined();
    expect(typeof lang.getRomanizer).toBe('function');
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
});
