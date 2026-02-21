import { describe, it, expect, vi } from 'vitest';

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { detectConflict, mergeData } from './cloudSync';

// ── detectConflict ──────────────────────────────────────────

describe('detectConflict', () => {
  it('returns null when cloudData is null', () => {
    const result = detectConflict({ syllabi: [] }, null);
    expect(result).toBeNull();
  });

  it('returns null when data hashes match', () => {
    // hashData uses local field names (syllabusProgress, standaloneReaders, etc.)
    // for local, and cloud field names (syllabus_progress, standalone_readers) for cloud
    // Both sides must produce same JSON to hash equal
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learnedVocabulary: {},
      exportedWords: new Set(),
      lastModified: 1000,
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      learned_vocabulary: {},
      exported_words: new Set(),
      updated_at: new Date(1000).toISOString(),
    };
    const result = detectConflict(localState, cloudData);
    expect(result).toBeNull();
  });

  it('returns conflict info when data differs', () => {
    const localState = {
      syllabi: [{ id: 's1', topic: 'local' }],
      syllabusProgress: {},
      standaloneReaders: [],
      learnedVocabulary: { '猫': { pinyin: 'māo' } },
      exportedWords: new Set(),
      lastModified: 2000,
    };
    const cloudData = {
      syllabi: [{ id: 's2', topic: 'cloud' }],
      syllabus_progress: {},
      standalone_readers: [],
      learned_vocabulary: {},
      exported_words: [],
      updated_at: new Date(1000).toISOString(),
    };
    const result = detectConflict(localState, cloudData);
    expect(result).not.toBeNull();
    expect(result.localSyllabusCount).toBe(1);
    expect(result.cloudSyllabusCount).toBe(1);
    expect(result.localVocabCount).toBe(1);
    expect(result.cloudVocabCount).toBe(0);
  });

  it('includes cloudNewer flag', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learnedVocabulary: { '猫': {} },
      exportedWords: new Set(),
      lastModified: 1000,
    };
    const cloudData = {
      syllabi: [{ id: 's1' }],
      syllabus_progress: {},
      standalone_readers: [],
      learned_vocabulary: {},
      exported_words: [],
      updated_at: new Date(2000).toISOString(),
    };
    const result = detectConflict(localState, cloudData);
    expect(result.cloudNewer).toBe(true);
  });

  it('includes date strings', () => {
    const localState = {
      syllabi: [{ id: 'a' }],
      syllabusProgress: {},
      standaloneReaders: [],
      learnedVocabulary: {},
      exportedWords: new Set(),
      lastModified: 1000,
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      learned_vocabulary: {},
      exported_words: [],
      updated_at: new Date(2000).toISOString(),
    };
    const result = detectConflict(localState, cloudData);
    expect(typeof result.cloudDate).toBe('string');
    expect(typeof result.localDate).toBe('string');
  });
});

// ── mergeData ───────────────────────────────────────────────

describe('mergeData', () => {
  it('unions syllabi by id (local wins on conflict)', () => {
    const localState = {
      syllabi: [{ id: 's1', topic: 'local-topic' }],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [{ id: 's1', topic: 'cloud-topic' }, { id: 's2', topic: 'cloud-only' }],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    expect(result.syllabi.length).toBe(2);
    const s1 = result.syllabi.find(s => s.id === 's1');
    expect(s1.topic).toBe('local-topic'); // local wins
    expect(result.syllabi.find(s => s.id === 's2')).toBeTruthy();
  });

  it('unions standalone readers by key', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [{ key: 'sr1', topic: 'local' }],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [{ key: 'sr2', topic: 'cloud' }],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    expect(result.standalone_readers.length).toBe(2);
  });

  it('merges vocabulary preferring newer dateAdded', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {
        '猫': { pinyin: 'māo', dateAdded: 2000 },
        '狗': { pinyin: 'gǒu', dateAdded: 1000 },
      },
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {
        '猫': { pinyin: 'māo-cloud', dateAdded: 1000 },
        '鱼': { pinyin: 'yú', dateAdded: 3000 },
      },
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    expect(result.learned_vocabulary['猫'].dateAdded).toBe(2000); // local newer
    expect(result.learned_vocabulary['狗']).toBeTruthy(); // local only
    expect(result.learned_vocabulary['鱼']).toBeTruthy(); // cloud only
  });

  it('merges exported words as set union', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(['猫', '狗']),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: ['狗', '鱼'],
    };
    const result = mergeData(localState, cloudData);
    expect(result.exported_words).toContain('猫');
    expect(result.exported_words).toContain('狗');
    expect(result.exported_words).toContain('鱼');
    expect(result.exported_words.length).toBe(3);
  });

  it('merges generated readers with local winning', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: { key1: { story: 'local-story' } },
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: { key1: { story: 'cloud-story' }, key2: { story: 'cloud-only' } },
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    expect(result.generated_readers.key1.story).toBe('local-story');
    expect(result.generated_readers.key2.story).toBe('cloud-only');
  });

  it('merges syllabus progress with max lessonIndex and union completedLessons', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: { s1: { lessonIndex: 3, completedLessons: [0, 1] } },
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: { s1: { lessonIndex: 1, completedLessons: [0, 2] } },
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    expect(result.syllabus_progress.s1.lessonIndex).toBe(3);
    expect(result.syllabus_progress.s1.completedLessons.sort()).toEqual([0, 1, 2]);
  });
});
