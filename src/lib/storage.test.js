import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fileStorage
vi.mock('./fileStorage', () => ({
  writeJSON: vi.fn(() => Promise.resolve()),
  FILES: { syllabi: 'graded-reader-syllabi.json', readers: 'graded-reader-readers.json', vocabulary: 'graded-reader-vocabulary.json', exported: 'graded-reader-exported.json' },
}));

import {
  isStorageAvailable,
  loadProviderKeys,
  saveProviderKeys,
  loadActiveProvider,
  saveActiveProvider,
  loadSyllabi,
  saveSyllabi,
  loadLearnedVocabulary,
  saveLearnedVocabulary,
  mergeVocabulary,
  loadExportedWords,
  mergeExportedWords,
  loadMaxTokens,
  loadDefaultLevel,
  loadDarkMode,
  loadRomanizationOn,
  loadTtsSpeechRate,
  getStorageUsage,
  exportAllData,
} from './storage';

// ── Basic localStorage operations ────────────────────────────

describe('isStorageAvailable', () => {
  it('returns true when localStorage works', () => {
    expect(isStorageAvailable()).toBe(true);
  });
});

// ── Provider keys ────────────────────────────────────────────

describe('loadProviderKeys', () => {
  it('returns default keys when nothing stored', () => {
    const keys = loadProviderKeys();
    expect(keys).toEqual({ anthropic: '', openai: '', gemini: '', openai_compatible: '' });
  });

  it('migrates from old single apiKey', () => {
    localStorage.setItem('gradedReader_apiKey', JSON.stringify('sk-old-key'));
    const keys = loadProviderKeys();
    expect(keys.anthropic).toBe('sk-old-key');
    // Old key should be removed
    expect(localStorage.getItem('gradedReader_apiKey')).toBeNull();
  });
});

describe('saveProviderKeys', () => {
  it('round-trips correctly', () => {
    const keys = { anthropic: 'sk-test', openai: '', gemini: '', openai_compatible: '' };
    saveProviderKeys(keys);
    const loaded = JSON.parse(localStorage.getItem('gradedReader_providerKeys'));
    expect(loaded.anthropic).toBe('sk-test');
  });
});

// ── Active provider ──────────────────────────────────────────

describe('loadActiveProvider', () => {
  it('defaults to anthropic', () => {
    expect(loadActiveProvider()).toBe('anthropic');
  });

  it('returns stored value', () => {
    localStorage.setItem('gradedReader_activeProvider', JSON.stringify('openai'));
    expect(loadActiveProvider()).toBe('openai');
  });
});

// ── Syllabi ──────────────────────────────────────────────────

describe('loadSyllabi', () => {
  it('returns empty array by default', () => {
    expect(loadSyllabi()).toEqual([]);
  });

  it('returns stored syllabi', () => {
    const syllabi = [{ id: 's1', topic: 'test' }];
    localStorage.setItem('gradedReader_syllabi', JSON.stringify(syllabi));
    expect(loadSyllabi()).toEqual(syllabi);
  });
});

// ── Vocabulary ──────────────────────────────────────────────

describe('mergeVocabulary', () => {
  it('merges new words into existing', () => {
    const existing = { '猫': { pinyin: 'māo', english: 'cat' } };
    const newWords = [{ target: '狗', pinyin: 'gǒu', english: 'dog' }];
    const merged = mergeVocabulary(existing, newWords);
    expect(merged['猫']).toBeTruthy();
    expect(merged['狗']).toBeTruthy();
  });

  it('does not overwrite existing words', () => {
    const existing = { '猫': { pinyin: 'māo', english: 'cat', dateAdded: '2024-01-01' } };
    const newWords = [{ target: '猫', pinyin: 'māo-new', english: 'cat-new' }];
    const merged = mergeVocabulary(existing, newWords);
    expect(merged['猫'].english).toBe('cat'); // original preserved
  });

  it('adds SRS defaults to new words', () => {
    const merged = mergeVocabulary({}, [{ target: '猫', pinyin: 'māo', english: 'cat' }]);
    expect(merged['猫'].interval).toBe(0);
    expect(merged['猫'].ease).toBe(2.5);
    expect(merged['猫'].nextReview).toBeNull();
  });
});

describe('mergeExportedWords', () => {
  it('merges new words into existing set', () => {
    const existing = new Set(['猫']);
    const merged = mergeExportedWords(existing, ['狗', '鱼']);
    expect(merged.size).toBe(3);
    expect(merged.has('猫')).toBe(true);
    expect(merged.has('狗')).toBe(true);
  });
});

// ── Default values ──────────────────────────────────────────

describe('default loading functions', () => {
  it('loadMaxTokens defaults to 8192', () => {
    expect(loadMaxTokens()).toBe(8192);
  });

  it('loadDefaultLevel defaults to 3', () => {
    expect(loadDefaultLevel()).toBe(3);
  });

  it('loadDarkMode defaults to false', () => {
    expect(loadDarkMode()).toBe(false);
  });

  it('loadRomanizationOn defaults to false', () => {
    expect(loadRomanizationOn()).toBe(false);
  });

  it('loadTtsSpeechRate defaults to 1', () => {
    expect(loadTtsSpeechRate()).toBe(1);
  });
});

// ── Exported words ──────────────────────────────────────────

describe('loadExportedWords', () => {
  it('returns empty Set by default', () => {
    const words = loadExportedWords();
    expect(words).toBeInstanceOf(Set);
    expect(words.size).toBe(0);
  });

  it('loads stored words as Set', () => {
    localStorage.setItem('gradedReader_exportedWords', JSON.stringify(['猫', '狗']));
    const words = loadExportedWords();
    expect(words.has('猫')).toBe(true);
    expect(words.has('狗')).toBe(true);
  });
});

// ── Storage usage ────────────────────────────────────────────

describe('getStorageUsage', () => {
  it('returns usage stats object with correct shape', () => {
    const usage = getStorageUsage();
    expect(typeof usage.used).toBe('number');
    expect(usage.limit).toBe(5 * 1024 * 1024);
    expect(typeof usage.pct).toBe('number');
    expect(usage.used).toBeGreaterThanOrEqual(0);
  });
});

// ── Export ────────────────────────────────────────────────────

describe('exportAllData', () => {
  it('returns structured export object', () => {
    const data = exportAllData();
    expect(data.version).toBe(1);
    expect(data.exportedAt).toBeTruthy();
    expect(Array.isArray(data.syllabi)).toBe(true);
    expect(typeof data.syllabusProgress).toBe('object');
    expect(typeof data.generatedReaders).toBe('object');
    expect(typeof data.learnedVocabulary).toBe('object');
  });
});
