import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fileStorage
vi.mock('./fileStorage', () => ({
  writeJSON: vi.fn(() => Promise.resolve()),
  FILES: { readers: 'graded-reader-readers.json' },
}));

import {
  loadReaderIndex,
  loadAllReaders,
  loadReader,
  saveReader,
  saveReaderSafe,
  deleteReader,
  clearReaders,
  loadEvictedReaderKeys,
  saveEvictedReaderKeys,
  unmarkEvicted,
  evictStaleReaders,
} from './readerStorage';

// ── Constants (mirrored from source) ────────────────────────────

const READER_KEY_PREFIX = 'gradedReader_reader_';
const READER_INDEX_KEY = 'gradedReader_readerIndex';
const READERS_KEY = 'gradedReader_readers';
const EVICTED_KEY = 'gradedReader_evictedReaderKeys';

beforeEach(() => {
  localStorage.clear();
});

// ── loadReaderIndex ─────────────────────────────────────────────

describe('loadReaderIndex', () => {
  it('returns parsed index from localStorage', () => {
    localStorage.setItem(READER_INDEX_KEY, JSON.stringify(['lesson_s1_0', 'lesson_s1_1']));
    expect(loadReaderIndex()).toEqual(['lesson_s1_0', 'lesson_s1_1']);
  });

  it('returns [] when key is missing', () => {
    expect(loadReaderIndex()).toEqual([]);
  });

  it('returns [] when stored value is corrupt JSON', () => {
    localStorage.setItem(READER_INDEX_KEY, '{not valid json');
    expect(loadReaderIndex()).toEqual([]);
  });
});

// ── loadAllReaders ──────────────────────────────────────────────

describe('loadAllReaders', () => {
  it('reconstructs readers from index + per-key storage', () => {
    localStorage.setItem(READER_INDEX_KEY, JSON.stringify(['k1', 'k2']));
    localStorage.setItem(READER_KEY_PREFIX + 'k1', JSON.stringify({ story: 'A' }));
    localStorage.setItem(READER_KEY_PREFIX + 'k2', JSON.stringify({ story: 'B' }));
    const all = loadAllReaders();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all.k1.story).toBe('A');
    expect(all.k2.story).toBe('B');
  });

  it('skips keys whose per-reader data is missing', () => {
    localStorage.setItem(READER_INDEX_KEY, JSON.stringify(['k1', 'k2']));
    localStorage.setItem(READER_KEY_PREFIX + 'k1', JSON.stringify({ story: 'A' }));
    // k2 not stored
    const all = loadAllReaders();
    expect(Object.keys(all)).toEqual(['k1']);
  });
});

// ── loadReader ──────────────────────────────────────────────────

describe('loadReader', () => {
  it('returns parsed reader data', () => {
    localStorage.setItem(READER_KEY_PREFIX + 'lesson_s1_0', JSON.stringify({ story: 'Hello' }));
    expect(loadReader('lesson_s1_0')).toEqual({ story: 'Hello' });
  });

  it('returns null for missing key', () => {
    expect(loadReader('nonexistent')).toBeNull();
  });
});

// ── saveReader ──────────────────────────────────────────────────

describe('saveReader', () => {
  it('writes data to localStorage and adds key to index', () => {
    saveReader('lesson_s1_0', { story: 'Once upon a time' });
    const raw = localStorage.getItem(READER_KEY_PREFIX + 'lesson_s1_0');
    expect(JSON.parse(raw)).toEqual({ story: 'Once upon a time' });
    expect(loadReaderIndex()).toContain('lesson_s1_0');
  });

  it('does not duplicate key in index on repeated saves', () => {
    saveReader('lesson_s1_0', { story: 'v1' });
    saveReader('lesson_s1_0', { story: 'v2' });
    const index = loadReaderIndex();
    const count = index.filter(k => k === 'lesson_s1_0').length;
    expect(count).toBe(1);
  });
});

// ── saveReaderSafe ──────────────────────────────────────────────

describe('saveReaderSafe', () => {
  it('returns { ok: true, quotaExceeded: false } on success', () => {
    const result = saveReaderSafe('key1', { story: 'text' });
    expect(result).toEqual({ ok: true, quotaExceeded: false });
    expect(loadReader('key1')).toEqual({ story: 'text' });
  });

  it('returns { ok: false, quotaExceeded: true } on QuotaExceededError', () => {
    const origSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    const result = saveReaderSafe('key1', { story: 'text' });
    expect(result).toEqual({ ok: false, quotaExceeded: true });
    localStorage.setItem = origSetItem;
  });
});

// ── deleteReader ────────────────────────────────────────────────

describe('deleteReader', () => {
  it('removes reader data and updates index', () => {
    saveReader('lesson_s1_0', { story: 'A' });
    saveReader('lesson_s1_1', { story: 'B' });
    deleteReader('lesson_s1_0');
    expect(loadReader('lesson_s1_0')).toBeNull();
    const index = loadReaderIndex();
    expect(index).not.toContain('lesson_s1_0');
    expect(index).toContain('lesson_s1_1');
  });
});

// ── clearReaders ────────────────────────────────────────────────

describe('clearReaders', () => {
  it('removes all reader keys and clears index', () => {
    saveReader('lesson_s1_0', { story: 'A' });
    saveReader('lesson_s1_1', { story: 'B' });
    clearReaders();
    expect(loadReader('lesson_s1_0')).toBeNull();
    expect(loadReader('lesson_s1_1')).toBeNull();
    expect(loadReaderIndex()).toEqual([]);
  });
});

// ── Evicted reader keys ─────────────────────────────────────────

describe('loadEvictedReaderKeys', () => {
  it('returns a Set from stored array', () => {
    localStorage.setItem(EVICTED_KEY, JSON.stringify(['k1', 'k2']));
    const evicted = loadEvictedReaderKeys();
    expect(evicted).toBeInstanceOf(Set);
    expect(evicted.size).toBe(2);
    expect(evicted.has('k1')).toBe(true);
    expect(evicted.has('k2')).toBe(true);
  });

  it('returns empty Set when key is missing', () => {
    const evicted = loadEvictedReaderKeys();
    expect(evicted).toBeInstanceOf(Set);
    expect(evicted.size).toBe(0);
  });
});

// ── unmarkEvicted ───────────────────────────────────────────────

describe('unmarkEvicted', () => {
  it('removes key from evicted set', () => {
    saveEvictedReaderKeys(new Set(['k1', 'k2', 'k3']));
    unmarkEvicted('k2');
    const evicted = loadEvictedReaderKeys();
    expect(evicted.has('k2')).toBe(false);
    expect(evicted.has('k1')).toBe(true);
    expect(evicted.has('k3')).toBe(true);
  });

  it('is a no-op when key is not in evicted set', () => {
    saveEvictedReaderKeys(new Set(['k1']));
    unmarkEvicted('k99');
    expect(loadEvictedReaderKeys().size).toBe(1);
  });
});

// ── evictStaleReaders ───────────────────────────────────────────

describe('evictStaleReaders', () => {
  it('does nothing when reader count is <= 30', () => {
    for (let i = 0; i < 5; i++) {
      saveReader(`lesson_s1_${i}`, { story: `Story ${i}` });
    }
    const evicted = evictStaleReaders();
    expect(evicted).toEqual([]);
    expect(loadReaderIndex()).toHaveLength(5);
  });

  it('evicts stale readers when count > 30 and backupKeys match', () => {
    for (let i = 0; i < 35; i++) {
      saveReader(`lesson_s1_${i}`, { story: `Story ${i}`, lastOpenedAt: 0 });
    }
    const allKeys = new Set(Array.from({ length: 35 }, (_, i) => `lesson_s1_${i}`));
    const evicted = evictStaleReaders({ backupKeys: allKeys });
    expect(evicted.length).toBeGreaterThan(0);
    expect(loadReaderIndex().length).toBeLessThanOrEqual(30);
    // Evicted keys should be tracked
    const evictedSet = loadEvictedReaderKeys();
    for (const key of evicted) {
      expect(evictedSet.has(key)).toBe(true);
    }
  });

  it('never evicts the active key', () => {
    for (let i = 0; i < 35; i++) {
      saveReader(`lesson_s1_${i}`, { story: `Story ${i}`, lastOpenedAt: 0 });
    }
    const allKeys = new Set(Array.from({ length: 35 }, (_, i) => `lesson_s1_${i}`));
    evictStaleReaders({ activeKey: 'lesson_s1_0', backupKeys: allKeys });
    expect(loadReader('lesson_s1_0')).not.toBeNull();
  });
});

// ── Legacy migration ────────────────────────────────────────────

describe('legacy migration', () => {
  // NOTE: _migrationDone is module-level state, so migration only runs once.
  // We use dynamic import to get a fresh module for this test.
  it('migrates monolithic gradedReader_readers to per-key storage', async () => {
    // Reset modules so _migrationDone is fresh
    vi.resetModules();

    const monolithic = {
      lesson_s1_0: { story: 'A' },
      lesson_s1_1: { story: 'B' },
    };
    localStorage.setItem(READERS_KEY, JSON.stringify(monolithic));

    const mod = await import('./readerStorage');
    const index = mod.loadReaderIndex();

    expect(index).toContain('lesson_s1_0');
    expect(index).toContain('lesson_s1_1');
    expect(mod.loadReader('lesson_s1_0')).toEqual({ story: 'A' });
    expect(mod.loadReader('lesson_s1_1')).toEqual({ story: 'B' });
    // Legacy key should be removed
    expect(localStorage.getItem(READERS_KEY)).toBeNull();
  });
});
