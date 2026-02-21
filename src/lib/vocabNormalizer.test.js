import { describe, it, expect } from 'vitest';
import { normalizeVocabWord, normalizeSyllabus, normalizeSyllabi, normalizeStandaloneReader, normalizeStandaloneReaders } from './vocabNormalizer';

// ── normalizeVocabWord ──────────────────────────────────────

describe('normalizeVocabWord', () => {
  it('returns null for null input', () => {
    expect(normalizeVocabWord(null)).toBeNull();
  });

  it('normalizes Chinese word with legacy fields', () => {
    const word = { chinese: '猫', pinyin: 'māo', english: 'cat' };
    const result = normalizeVocabWord(word, 'zh');
    expect(result.target).toBe('猫');
    expect(result.romanization).toBe('māo');
    expect(result.translation).toBe('cat');
    expect(result.chinese).toBe('猫');
    expect(result.pinyin).toBe('māo');
    expect(result.english).toBe('cat');
    expect(result.langId).toBe('zh');
  });

  it('normalizes Korean word', () => {
    const word = { korean: '고양이', romanization: 'go-yang-i', english: 'cat' };
    const result = normalizeVocabWord(word, 'ko');
    expect(result.target).toBe('고양이');
    expect(result.romanization).toBe('go-yang-i');
    expect(result.translation).toBe('cat');
    expect(result.korean).toBe('고양이');
  });

  it('normalizes Cantonese word with jyutping', () => {
    const word = { chinese: '貓', jyutping: 'maau1', english: 'cat' };
    const result = normalizeVocabWord(word, 'yue');
    expect(result.target).toBe('貓');
    expect(result.romanization).toBe('maau1');
    expect(result.translation).toBe('cat');
  });

  it('preserves generic fields when already present', () => {
    const word = { target: '猫', romanization: 'māo', translation: 'cat', chinese: '猫', pinyin: 'māo', english: 'cat' };
    const result = normalizeVocabWord(word, 'zh');
    expect(result.target).toBe('猫');
  });

  it('defaults langId to zh', () => {
    const word = { chinese: '猫', pinyin: 'māo', english: 'cat' };
    const result = normalizeVocabWord(word);
    expect(result.langId).toBe('zh');
  });

  it('preserves existing langId', () => {
    const word = { chinese: '猫', langId: 'yue' };
    const result = normalizeVocabWord(word, 'zh');
    expect(result.langId).toBe('yue');
  });

  it('handles empty fields gracefully', () => {
    const word = {};
    const result = normalizeVocabWord(word, 'zh');
    expect(result.target).toBe('');
    expect(result.romanization).toBe('');
    expect(result.translation).toBe('');
  });
});

// ── normalizeSyllabus ───────────────────────────────────────

describe('normalizeSyllabus', () => {
  it('returns null for null input', () => {
    expect(normalizeSyllabus(null)).toBeNull();
  });

  it('adds langId to syllabus without one', () => {
    const syllabus = { id: 's1', lessons: [] };
    const result = normalizeSyllabus(syllabus);
    expect(result.langId).toBe('zh');
  });

  it('preserves existing langId', () => {
    const syllabus = { id: 's1', langId: 'ko', lessons: [] };
    const result = normalizeSyllabus(syllabus);
    expect(result.langId).toBe('ko');
  });

  it('adds title_target from title_zh', () => {
    const syllabus = {
      id: 's1',
      lessons: [{ lesson_number: 1, title_zh: '春节', title_en: 'Spring Festival' }],
    };
    const result = normalizeSyllabus(syllabus);
    expect(result.lessons[0].title_target).toBe('春节');
    expect(result.lessons[0].title_zh).toBe('春节');
  });

  it('adds title_target from title_ko for Korean', () => {
    const syllabus = {
      id: 's1',
      langId: 'ko',
      lessons: [{ lesson_number: 1, title_ko: '한국 음식', title_en: 'Korean Food' }],
    };
    const result = normalizeSyllabus(syllabus);
    expect(result.lessons[0].title_target).toBe('한국 음식');
  });

  it('handles empty lessons array', () => {
    const syllabus = { id: 's1', lessons: [] };
    const result = normalizeSyllabus(syllabus);
    expect(result.lessons).toEqual([]);
  });
});

// ── normalizeSyllabi ────────────────────────────────────────

describe('normalizeSyllabi', () => {
  it('returns non-array input as-is', () => {
    expect(normalizeSyllabi(null)).toBeNull();
    expect(normalizeSyllabi(undefined)).toBeUndefined();
  });

  it('normalizes each syllabus in the array', () => {
    const syllabi = [
      { id: 's1', lessons: [{ title_zh: '测试' }] },
      { id: 's2', langId: 'ko', lessons: [{ title_ko: '테스트' }] },
    ];
    const result = normalizeSyllabi(syllabi);
    expect(result.length).toBe(2);
    expect(result[0].langId).toBe('zh');
    expect(result[1].langId).toBe('ko');
  });
});

// ── normalizeStandaloneReader ────────────────────────────────

describe('normalizeStandaloneReader', () => {
  it('returns null for null input', () => {
    expect(normalizeStandaloneReader(null)).toBeNull();
  });

  it('adds default langId', () => {
    const reader = { key: 'sr1', topic: 'test' };
    expect(normalizeStandaloneReader(reader).langId).toBe('zh');
  });

  it('preserves existing langId', () => {
    const reader = { key: 'sr1', langId: 'ko' };
    expect(normalizeStandaloneReader(reader).langId).toBe('ko');
  });
});

// ── normalizeStandaloneReaders ──────────────────────────────

describe('normalizeStandaloneReaders', () => {
  it('returns non-array input as-is', () => {
    expect(normalizeStandaloneReaders(null)).toBeNull();
  });

  it('normalizes each reader', () => {
    const readers = [{ key: 'sr1' }, { key: 'sr2', langId: 'ko' }];
    const result = normalizeStandaloneReaders(readers);
    expect(result[0].langId).toBe('zh');
    expect(result[1].langId).toBe('ko');
  });
});
