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
  addLearnedVocabulary,
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
  saveReader,
  loadReader,
  deleteReader,
  loadAllReaders,
  loadReaderIndex,
  saveReaderSafe,
  evictStaleReaders,
  stashOldActivity,
  loadActivityStash,
  saveLearningActivity,
  clearAllAppData,
  loadLastSession,
  saveLastSession,
  loadFlashcardSession,
  saveFlashcardSession,
  loadGradingModels,
  saveGradingModels,
  loadEvictedReaderKeys,
  saveEvictedReaderKeys,
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

  it('includes all expected data sections', () => {
    // Populate some data first
    localStorage.setItem('gradedReader_syllabi', JSON.stringify([{ id: 's1' }]));
    localStorage.setItem('gradedReader_learnedVocabulary', JSON.stringify({ '猫': { english: 'cat' } }));
    localStorage.setItem('gradedReader_exportedWords', JSON.stringify(['猫']));
    const data = exportAllData();
    expect(data.syllabi).toHaveLength(1);
    expect(data.learnedVocabulary['猫']).toBeDefined();
    expect(data.exportedWords).toContain('猫');
  });

  it('handles missing keys gracefully', () => {
    const data = exportAllData();
    expect(data.syllabi).toEqual([]);
    expect(data.learnedVocabulary).toEqual({});
    expect(data.exportedWords).toEqual([]);
  });
});

// ── Reader CRUD ──────────────────────────────────────────────

describe('reader CRUD', () => {
  it('saveReader and loadReader round-trip', () => {
    const data = { story: 'Once upon a time', vocabulary: [] };
    saveReader('lesson_s1_0', data);
    const loaded = loadReader('lesson_s1_0');
    expect(loaded).toEqual(data);
  });

  it('loadReader returns null for missing key', () => {
    expect(loadReader('nonexistent_key')).toBeNull();
  });

  it('saveReader updates the reader index', () => {
    saveReader('lesson_s1_0', { story: 'text' });
    saveReader('lesson_s1_1', { story: 'text2' });
    const index = loadReaderIndex();
    expect(index).toContain('lesson_s1_0');
    expect(index).toContain('lesson_s1_1');
  });

  it('saveReader does not duplicate index entries', () => {
    saveReader('lesson_s1_0', { story: 'v1' });
    saveReader('lesson_s1_0', { story: 'v2' });
    const index = loadReaderIndex();
    const count = index.filter(k => k === 'lesson_s1_0').length;
    expect(count).toBe(1);
  });

  it('deleteReader removes data and updates index', () => {
    saveReader('lesson_s1_0', { story: 'text' });
    saveReader('lesson_s1_1', { story: 'text2' });
    deleteReader('lesson_s1_0');
    expect(loadReader('lesson_s1_0')).toBeNull();
    const index = loadReaderIndex();
    expect(index).not.toContain('lesson_s1_0');
    expect(index).toContain('lesson_s1_1');
  });

  it('loadAllReaders returns all saved readers', () => {
    saveReader('lesson_s1_0', { story: 'A' });
    saveReader('lesson_s1_1', { story: 'B' });
    const all = loadAllReaders();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['lesson_s1_0'].story).toBe('A');
    expect(all['lesson_s1_1'].story).toBe('B');
  });

  it('loadReaderIndex returns empty array by default', () => {
    expect(loadReaderIndex()).toEqual([]);
  });
});

// ── saveReaderSafe ───────────────────────────────────────────

describe('saveReaderSafe', () => {
  it('returns ok:true on success', () => {
    const result = saveReaderSafe('key1', { story: 'text' });
    expect(result.ok).toBe(true);
    expect(result.quotaExceeded).toBe(false);
  });

  it('returns quotaExceeded:true on QuotaExceededError', () => {
    const origSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      const err = new DOMException('Quota exceeded', 'QuotaExceededError');
      throw err;
    });
    const result = saveReaderSafe('key1', { story: 'text' });
    expect(result.ok).toBe(false);
    expect(result.quotaExceeded).toBe(true);
    localStorage.setItem = origSetItem;
  });

  it('returns quotaExceeded:false on other DOMException', () => {
    const origSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new DOMException('Some other error', 'SecurityError');
    });
    const result = saveReaderSafe('key1', { story: 'text' });
    expect(result.ok).toBe(false);
    expect(result.quotaExceeded).toBe(false);
    localStorage.setItem = origSetItem;
  });
});

// ── evictStaleReaders ────────────────────────────────────────

describe('evictStaleReaders', () => {
  it('does nothing when under max limit', () => {
    // Save fewer than 30 readers
    for (let i = 0; i < 5; i++) {
      saveReader(`lesson_s1_${i}`, { story: `Story ${i}` });
    }
    const evicted = evictStaleReaders();
    expect(evicted).toEqual([]);
  });

  it('evicts oldest stale readers when over limit', () => {
    // Save 35 readers with stale timestamps
    for (let i = 0; i < 35; i++) {
      saveReader(`lesson_s1_${i}`, { story: `Story ${i}`, lastOpenedAt: 0 });
    }
    const evicted = evictStaleReaders({ backupKeys: new Set(Array.from({ length: 35 }, (_, i) => `lesson_s1_${i}`)) });
    expect(evicted.length).toBeGreaterThan(0);
    // After eviction, should be at or below 30
    expect(loadReaderIndex().length).toBeLessThanOrEqual(30);
  });

  it('never evicts the active key', () => {
    for (let i = 0; i < 35; i++) {
      saveReader(`lesson_s1_${i}`, { story: `Story ${i}`, lastOpenedAt: 0 });
    }
    const allKeys = new Set(Array.from({ length: 35 }, (_, i) => `lesson_s1_${i}`));
    evictStaleReaders({ activeKey: 'lesson_s1_0', backupKeys: allKeys });
    expect(loadReader('lesson_s1_0')).not.toBeNull();
  });

  it('only evicts backed-up readers when backupKeys provided', () => {
    for (let i = 0; i < 35; i++) {
      saveReader(`lesson_s1_${i}`, { story: `Story ${i}`, lastOpenedAt: 0 });
    }
    // Only provide a few backup keys
    const backupKeys = new Set(['lesson_s1_0', 'lesson_s1_1', 'lesson_s1_2', 'lesson_s1_3', 'lesson_s1_4']);
    const evicted = evictStaleReaders({ backupKeys });
    // Should only have evicted from the backup set
    for (const key of evicted) {
      expect(backupKeys.has(key)).toBe(true);
    }
  });

  it('tracks evicted keys', () => {
    for (let i = 0; i < 35; i++) {
      saveReader(`lesson_s1_${i}`, { story: `Story ${i}`, lastOpenedAt: 0 });
    }
    const allKeys = new Set(Array.from({ length: 35 }, (_, i) => `lesson_s1_${i}`));
    const evicted = evictStaleReaders({ backupKeys: allKeys });
    const evictedKeys = loadEvictedReaderKeys();
    for (const key of evicted) {
      expect(evictedKeys.has(key)).toBe(true);
    }
  });
});

// ── stashOldActivity ─────────────────────────────────────────

describe('stashOldActivity', () => {
  it('returns activity unchanged when under threshold', () => {
    const activity = [{ type: 'test', timestamp: Date.now() }];
    const result = stashOldActivity(activity);
    expect(result).toEqual(activity);
  });

  it('moves old entries to stash when over threshold', () => {
    const now = Date.now();
    const oldTs = now - 100 * 24 * 60 * 60 * 1000; // 100 days ago
    // Create 501 entries: 250 old + 251 recent
    const activity = [];
    for (let i = 0; i < 250; i++) {
      activity.push({ type: 'old', timestamp: oldTs - i });
    }
    for (let i = 0; i < 251; i++) {
      activity.push({ type: 'recent', timestamp: now - i });
    }
    const result = stashOldActivity(activity);
    expect(result.length).toBeLessThan(activity.length);
    expect(result.every(e => e.type === 'recent')).toBe(true);
  });

  it('merges with existing stash', () => {
    // Pre-populate stash
    localStorage.setItem('gradedReader_learningActivity_stash', JSON.stringify([{ type: 'existing', timestamp: 1 }]));
    const now = Date.now();
    const oldTs = now - 100 * 24 * 60 * 60 * 1000;
    const activity = [];
    for (let i = 0; i < 300; i++) activity.push({ type: 'old', timestamp: oldTs - i });
    for (let i = 0; i < 250; i++) activity.push({ type: 'recent', timestamp: now - i });
    stashOldActivity(activity);
    const stash = loadActivityStash();
    expect(stash.length).toBeGreaterThan(1);
    expect(stash[0].type).toBe('existing');
  });

  it('returns unchanged when all entries are recent despite exceeding threshold', () => {
    const now = Date.now();
    const activity = [];
    for (let i = 0; i < 600; i++) {
      activity.push({ type: 'recent', timestamp: now - i * 1000 });
    }
    const result = stashOldActivity(activity);
    // All entries are recent, so no old entries to stash — returns original
    expect(result).toEqual(activity);
  });
});

// ── Migration: single syllabus → array ───────────────────────

describe('syllabi migration', () => {
  it('migrates old single-syllabus format', () => {
    localStorage.setItem('gradedReader_syllabus', JSON.stringify({
      topic: 'Food',
      level: 3,
      lessons: [{ title_zh: 'L1' }],
    }));
    localStorage.setItem('gradedReader_lessonIndex', JSON.stringify(2));
    const syllabi = loadSyllabi();
    expect(syllabi).toHaveLength(1);
    expect(syllabi[0].topic).toBe('Food');
    expect(syllabi[0].lessons).toHaveLength(1);
    // Old keys removed
    expect(localStorage.getItem('gradedReader_syllabus')).toBeNull();
    expect(localStorage.getItem('gradedReader_lessonIndex')).toBeNull();
  });
});

// ── Grading models round-trip ────────────────────────────────

describe('grading models', () => {
  it('defaults to null for all providers', () => {
    const models = loadGradingModels();
    expect(models.anthropic).toBeNull();
    expect(models.openai).toBeNull();
  });

  it('round-trips correctly', () => {
    const models = { anthropic: 'claude-haiku', openai: 'gpt-4o-mini', gemini: null, openai_compatible: null };
    saveGradingModels(models);
    expect(loadGradingModels()).toEqual(models);
  });
});

// ── Last session round-trip ──────────────────────────────────

describe('last session', () => {
  it('defaults to null', () => {
    expect(loadLastSession()).toBeNull();
  });

  it('round-trips correctly', () => {
    const session = { syllabusId: 's1', syllabusView: 'lessons', standaloneKey: null };
    saveLastSession(session);
    expect(loadLastSession()).toEqual(session);
  });
});

// ── Flashcard session round-trip ─────────────────────────────

describe('flashcard session', () => {
  it('defaults to null', () => {
    expect(loadFlashcardSession()).toBeNull();
  });

  it('round-trips with langId', () => {
    const session = { cards: [1, 2, 3], index: 0 };
    saveFlashcardSession(session, 'zh');
    expect(loadFlashcardSession('zh')).toEqual(session);
    expect(loadFlashcardSession('ko')).toBeNull();
  });
});

// ── Evicted reader keys round-trip ───────────────────────────

describe('evicted reader keys', () => {
  it('defaults to empty Set', () => {
    const keys = loadEvictedReaderKeys();
    expect(keys).toBeInstanceOf(Set);
    expect(keys.size).toBe(0);
  });

  it('round-trips correctly', () => {
    saveEvictedReaderKeys(new Set(['key1', 'key2']));
    const loaded = loadEvictedReaderKeys();
    expect(loaded.has('key1')).toBe(true);
    expect(loaded.has('key2')).toBe(true);
    expect(loaded.size).toBe(2);
  });
});

// ── clearAllAppData ──────────────────────────────────────────

describe('clearAllAppData', () => {
  it('removes all app keys', () => {
    saveProviderKeys({ anthropic: 'key', openai: '', gemini: '', openai_compatible: '' });
    saveSyllabi([{ id: 's1' }]);
    saveReader('lesson_s1_0', { story: 'text' });
    clearAllAppData();
    expect(loadProviderKeys()).toEqual({ anthropic: '', openai: '', gemini: '', openai_compatible: '' });
    expect(loadSyllabi()).toEqual([]);
  });

  it('removes per-reader keys', () => {
    saveReader('lesson_s1_0', { story: 'text' });
    saveReader('lesson_s1_1', { story: 'text2' });
    clearAllAppData();
    expect(loadReader('lesson_s1_0')).toBeNull();
    expect(loadReader('lesson_s1_1')).toBeNull();
  });
});

// ── addLearnedVocabulary ─────────────────────────────────────

describe('addLearnedVocabulary', () => {
  it('adds new words using target field', () => {
    const result = addLearnedVocabulary([{ target: '猫', romanization: 'māo', translation: 'cat' }]);
    expect(result['猫']).toBeDefined();
    expect(result['猫'].english).toBe('cat');
    expect(result['猫'].pinyin).toBe('māo');
  });

  it('does not overwrite existing words', () => {
    addLearnedVocabulary([{ target: '猫', romanization: 'māo', translation: 'cat' }]);
    const result = addLearnedVocabulary([{ target: '猫', romanization: 'māo-new', translation: 'cat-new' }]);
    expect(result['猫'].english).toBe('cat');
  });

  it('uses chinese field as fallback key', () => {
    const result = addLearnedVocabulary([{ chinese: '狗', pinyin: 'gǒu', english: 'dog' }]);
    expect(result['狗']).toBeDefined();
  });

  it('uses korean field as fallback key', () => {
    const result = addLearnedVocabulary([{ korean: '강아지', romanization: 'gangaji', english: 'puppy' }]);
    expect(result['강아지']).toBeDefined();
  });
});
