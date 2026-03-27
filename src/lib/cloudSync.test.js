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
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learnedVocabulary: {},
      learnedGrammar: {},
      exportedWords: new Set(),
      lastModified: 1000,
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      learned_vocabulary: {},
      learned_grammar: {},
      exported_words: [],
      updated_at: new Date(1000).toISOString(),
    };
    const result = detectConflict(localState, cloudData);
    expect(result).toBeNull();
  });

  it('returns null when exportedWords Set matches cloud Array (regression)', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learnedVocabulary: {},
      learnedGrammar: {},
      exportedWords: new Set(['猫', '狗']),
      lastModified: 1000,
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      learned_vocabulary: {},
      learned_grammar: {},
      exported_words: ['猫', '狗'],
      updated_at: new Date(1000).toISOString(),
    };
    const result = detectConflict(localState, cloudData);
    expect(result).toBeNull();
  });

  it('ignores demo readers when comparing hashes', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [
        { key: 'standalone_demo', topic: 'Demo', isDemo: true },
        { key: 'standalone_demo_en', topic: 'Demo EN', isDemo: true },
      ],
      learnedVocabulary: {},
      learnedGrammar: {},
      exportedWords: new Set(),
      lastModified: 1000,
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      learned_vocabulary: {},
      learned_grammar: {},
      exported_words: [],
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

  it('handles identical local and cloud data (no duplicates)', () => {
    const localState = {
      syllabi: [{ id: 's1', topic: 'shared' }],
      syllabusProgress: { s1: { lessonIndex: 2, completedLessons: [0, 1] } },
      standaloneReaders: [{ key: 'sr1', topic: 'reader' }],
      generatedReaders: { key1: { story: 'same-story' } },
      learnedVocabulary: { '猫': { pinyin: 'māo', dateAdded: 1000 } },
      exportedWords: new Set(['猫']),
    };
    const cloudData = {
      syllabi: [{ id: 's1', topic: 'shared' }],
      syllabus_progress: { s1: { lessonIndex: 2, completedLessons: [0, 1] } },
      standalone_readers: [{ key: 'sr1', topic: 'reader' }],
      generated_readers: { key1: { story: 'same-story' } },
      learned_vocabulary: { '猫': { pinyin: 'māo', dateAdded: 1000 } },
      exported_words: ['猫'],
    };
    const result = mergeData(localState, cloudData);
    expect(result.syllabi.length).toBe(1);
    expect(result.standalone_readers.length).toBe(1);
    expect(Object.keys(result.learned_vocabulary).length).toBe(1);
    expect(result.exported_words.length).toBe(1);
  });

  it('merges overlapping syllabi — version with more lessons always wins', () => {
    const localState = {
      syllabi: [
        { id: 's1', topic: 'topic-a', lessons: [{ title: 'L1' }] },
        { id: 's2', topic: 'local-only' },
      ],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [
        { id: 's1', topic: 'topic-a-cloud', lessons: [{ title: 'L1' }, { title: 'L2' }] },
        { id: 's3', topic: 'cloud-only' },
      ],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    expect(result.syllabi.length).toBe(3);
    // Cloud has more lessons for s1, so cloud version wins even with prefer:local
    const s1 = result.syllabi.find(s => s.id === 's1');
    expect(s1.lessons.length).toBe(2);
    expect(result.syllabi.find(s => s.id === 's2')).toBeTruthy();
    expect(result.syllabi.find(s => s.id === 's3')).toBeTruthy();
  });

  it('handles vocabulary conflict with same word different translations', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {
        '猫': { pinyin: 'māo', english: 'cat (local)', dateAdded: 2000 },
      },
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {
        '猫': { pinyin: 'māo', english: 'cat (cloud)', dateAdded: 3000 },
      },
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    // Cloud is newer, so cloud wins
    expect(result.learned_vocabulary['猫'].english).toBe('cat (cloud)');
    expect(result.learned_vocabulary['猫'].dateAdded).toBe(3000);
  });

  it('excludes demo readers from merged standalone_readers and generated_readers', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [
        { key: 'sr1', topic: 'real reader' },
        { key: 'standalone_demo', topic: 'Sample', isDemo: true },
      ],
      generatedReaders: {
        sr1: { story: 'real' },
        standalone_demo: { story: 'demo' },
        standalone_demo_en: { story: 'demo en' },
      },
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [
        { key: 'sr2', topic: 'cloud reader' },
        { key: 'standalone_demo_en', topic: 'Sample EN', isDemo: true },
      ],
      generated_readers: {
        sr2: { story: 'cloud' },
        standalone_demo: { story: 'demo cloud' },
      },
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    expect(result.standalone_readers.length).toBe(2);
    expect(result.standalone_readers.map(r => r.key).sort()).toEqual(['sr1', 'sr2']);
    expect(result.generated_readers).toHaveProperty('sr1');
    expect(result.generated_readers).toHaveProperty('sr2');
    expect(result.generated_readers).not.toHaveProperty('standalone_demo');
    expect(result.generated_readers).not.toHaveProperty('standalone_demo_en');
  });

  it('cloud wins on conflict when prefer: cloud', () => {
    const localState = {
      syllabi: [{ id: 's1', topic: 'local-topic' }],
      syllabusProgress: {},
      standaloneReaders: [{ key: 'sr1', topic: 'local-reader' }],
      generatedReaders: { key1: { story: 'local-story' } },
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [{ id: 's1', topic: 'cloud-topic' }, { id: 's2', topic: 'cloud-only' }],
      syllabus_progress: {},
      standalone_readers: [{ key: 'sr1', topic: 'cloud-reader' }],
      generated_readers: { key1: { story: 'cloud-story' }, key2: { story: 'cloud-only' } },
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData, { prefer: 'cloud' });
    // Cloud wins for overlapping items
    expect(result.syllabi.find(s => s.id === 's1').topic).toBe('cloud-topic');
    expect(result.standalone_readers.find(r => r.key === 'sr1').topic).toBe('cloud-reader');
    expect(result.generated_readers.key1.story).toBe('cloud-story');
    // Union still includes cloud-only items
    expect(result.syllabi.find(s => s.id === 's2')).toBeTruthy();
    expect(result.generated_readers.key2.story).toBe('cloud-only');
  });

  it('cloud wins picks up extended syllabus lessons', () => {
    // Desktop extends syllabus from 3 to 5 lessons, pushes to cloud.
    // Mobile still has 3 lessons. Pull should get the 5-lesson version.
    const localState = {
      syllabi: [{
        id: 's1', topic: 'Chinese Food',
        lessons: [{ title: 'L1' }, { title: 'L2' }, { title: 'L3' }],
      }],
      syllabusProgress: { s1: { lessonIndex: 2, completedLessons: [0, 1] } },
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [{
        id: 's1', topic: 'Chinese Food',
        lessons: [{ title: 'L1' }, { title: 'L2' }, { title: 'L3' }, { title: 'L4' }, { title: 'L5' }],
      }],
      syllabus_progress: { s1: { lessonIndex: 4, completedLessons: [0, 1, 2, 3] } },
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData, { prefer: 'cloud' });
    expect(result.syllabi[0].lessons.length).toBe(5);
    // Progress merges: max lessonIndex, union completedLessons
    expect(result.syllabus_progress.s1.lessonIndex).toBe(4);
    expect(result.syllabus_progress.s1.completedLessons.sort()).toEqual([0, 1, 2, 3]);
  });

  it('cloud wins still preserves local-only items', () => {
    // Mobile has a local-only reader not yet pushed. Cloud wins merge
    // should still keep it (union), not discard it.
    const localState = {
      syllabi: [
        { id: 's1', topic: 'shared' },
        { id: 's2', topic: 'local-only-syllabus' },
      ],
      syllabusProgress: {},
      standaloneReaders: [{ key: 'sr_local', topic: 'just created' }],
      generatedReaders: { sr_local: { story: 'local story' } },
      learnedVocabulary: { '猫': { dateAdded: 5000 } },
      exportedWords: new Set(['猫']),
    };
    const cloudData = {
      syllabi: [{ id: 's1', topic: 'shared-updated' }],
      syllabus_progress: {},
      standalone_readers: [{ key: 'sr_cloud', topic: 'from desktop' }],
      generated_readers: { sr_cloud: { story: 'cloud story' } },
      learned_vocabulary: {},
      exported_words: ['狗'],
    };
    const result = mergeData(localState, cloudData, { prefer: 'cloud' });
    // Cloud wins for shared syllabus
    expect(result.syllabi.find(s => s.id === 's1').topic).toBe('shared-updated');
    // Local-only items preserved
    expect(result.syllabi.find(s => s.id === 's2')).toBeTruthy();
    expect(result.standalone_readers.find(r => r.key === 'sr_local')).toBeTruthy();
    expect(result.generated_readers.sr_local).toBeTruthy();
    // Cloud-only items also present
    expect(result.standalone_readers.find(r => r.key === 'sr_cloud')).toBeTruthy();
    expect(result.generated_readers.sr_cloud).toBeTruthy();
    // Exported words: union from both sides
    expect(result.exported_words).toContain('猫');
    expect(result.exported_words).toContain('狗');
  });

  it('simulates cross-device sync: desktop extends, mobile pulls', () => {
    // Full scenario: desktop added lessons + completed more + learned new vocab.
    // Mobile has older state + its own local vocab. Cloud preference merge
    // should pick up desktop changes while keeping mobile-only data.
    const mobileState = {
      syllabi: [{ id: 's1', topic: 'Travel', lessons: [{ title: 'Airport' }, { title: 'Hotel' }] }],
      syllabusProgress: { s1: { lessonIndex: 1, completedLessons: [0] } },
      standaloneReaders: [{ key: 'sr1', topic: 'Food' }],
      generatedReaders: {
        lesson_s1_0: { story: 'airport story' },
        sr1: { story: 'food story' },
      },
      learnedVocabulary: {
        '机场': { dateAdded: 1000 },
        '美食': { dateAdded: 3000 }, // mobile-only, newer
      },
      learnedGrammar: {
        '了': { dateAdded: 1000 },
      },
      exportedWords: new Set(['机场']),
    };
    const cloudFromDesktop = {
      syllabi: [{ id: 's1', topic: 'Travel', lessons: [{ title: 'Airport' }, { title: 'Hotel' }, { title: 'Restaurant' }] }],
      syllabus_progress: { s1: { lessonIndex: 2, completedLessons: [0, 1] } },
      standalone_readers: [{ key: 'sr1', topic: 'Food' }, { key: 'sr2', topic: 'Weather' }],
      generated_readers: {
        lesson_s1_0: { story: 'airport story v2', grading: 'A' },
        lesson_s1_1: { story: 'hotel story' },
        sr1: { story: 'food story' },
        sr2: { story: 'weather story' },
      },
      learned_vocabulary: {
        '机场': { dateAdded: 2000 },
        '酒店': { dateAdded: 2000 },
      },
      learned_grammar: {
        '了': { dateAdded: 500 },
        '过': { dateAdded: 2000 },
      },
      exported_words: ['机场', '酒店'],
    };
    const result = mergeData(mobileState, cloudFromDesktop, { prefer: 'cloud' });

    // Cloud syllabus wins — has 3 lessons (extended)
    expect(result.syllabi[0].lessons.length).toBe(3);
    // Progress: max lessonIndex, union completedLessons
    expect(result.syllabus_progress.s1.lessonIndex).toBe(2);
    expect(result.syllabus_progress.s1.completedLessons.sort()).toEqual([0, 1]);
    // Standalone readers: union (cloud sr2 added)
    expect(result.standalone_readers.length).toBe(2);
    // Generated readers: cloud wins on overlap (graded version), union adds rest
    expect(result.generated_readers.lesson_s1_0.grading).toBe('A');
    expect(result.generated_readers.lesson_s1_1).toBeTruthy();
    expect(result.generated_readers.sr2).toBeTruthy();
    // Vocab: newer dateAdded wins per word
    expect(result.learned_vocabulary['机场'].dateAdded).toBe(2000); // cloud newer
    expect(result.learned_vocabulary['美食'].dateAdded).toBe(3000); // mobile-only preserved
    expect(result.learned_vocabulary['酒店']).toBeTruthy();         // cloud-only added
    // Grammar: newer dateAdded wins per pattern
    expect(result.learned_grammar['了'].dateAdded).toBe(1000);  // mobile newer
    expect(result.learned_grammar['过'].dateAdded).toBe(2000);  // cloud-only added
    // Exported words: union
    expect(result.exported_words.sort()).toEqual(['机场', '酒店']);
  });

  it('version with more lessons wins regardless of prefer setting', () => {
    const localState = {
      syllabi: [{ id: 's1', lessons: [{ title: 'L1' }] }],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [{ id: 's1', lessons: [{ title: 'L1' }, { title: 'L2' }] }],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    // Both prefer:local and prefer:cloud keep the 2-lesson version
    // because extensions only append — the longer array is always newer
    const resultLocal = mergeData(localState, cloudData);
    expect(resultLocal.syllabi[0].lessons.length).toBe(2);
    const resultCloud = mergeData(localState, cloudData, { prefer: 'cloud' });
    expect(resultCloud.syllabi[0].lessons.length).toBe(2);
  });

  it('extended syllabus is preserved when cloud has stale shorter version (bug fix)', () => {
    // Scenario: user extended syllabus from 9 to 15 lessons locally.
    // Cloud still has the old 9-lesson version (push failed or hasn't fired).
    // On startup, cloud-preferred merge must NOT revert to 9 lessons.
    const localState = {
      syllabi: [{
        id: 's1', topic: 'Chinese Food',
        lessons: Array.from({ length: 15 }, (_, i) => ({ title: `L${i + 1}` })),
      }],
      syllabusProgress: {
        s1: { lessonIndex: 9, completedLessons: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
      },
      standaloneReaders: [],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [{
        id: 's1', topic: 'Chinese Food',
        lessons: Array.from({ length: 9 }, (_, i) => ({ title: `L${i + 1}` })),
      }],
      syllabus_progress: {
        s1: { lessonIndex: 8, completedLessons: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
      },
      standalone_readers: [],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData, { prefer: 'cloud' });
    // Local's 15-lesson version must be preserved (not reverted to cloud's 9)
    expect(result.syllabi[0].lessons.length).toBe(15);
    // Progress: union of completed + max lessonIndex
    expect(result.syllabus_progress.s1.lessonIndex).toBe(9);
    expect(result.syllabus_progress.s1.completedLessons.length).toBe(9);
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

  // ── Standalone reader completedAt preservation ──────────────

  it('standalone reader merge preserves completedAt when preferred side lacks it', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [{ key: 'sr1', topic: 'Food', completedAt: 1700000000 }],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [{ key: 'sr1', topic: 'Food' }],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    // Cloud wins but local has completedAt — local version should be kept
    const result = mergeData(localState, cloudData, { prefer: 'cloud' });
    expect(result.standalone_readers[0].completedAt).toBe(1700000000);
  });

  it('standalone reader merge prefers completedAt regardless of prefer setting', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [{ key: 'sr1', topic: 'Food' }],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [{ key: 'sr1', topic: 'Food', completedAt: 1700000000 }],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    // prefer:local but cloud has completedAt — cloud version should be kept
    const result = mergeData(localState, cloudData);
    expect(result.standalone_readers[0].completedAt).toBe(1700000000);
  });

  it('standalone reader merge uses preferred side when both have completedAt', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [{ key: 'sr1', topic: 'local-topic', completedAt: 1700000000 }],
      generatedReaders: {},
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [{ key: 'sr1', topic: 'cloud-topic', completedAt: 1800000000 }],
      generated_readers: {},
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData);
    // Both have completedAt — local wins (default prefer:local)
    expect(result.standalone_readers[0].topic).toBe('local-topic');
  });

  // ── Generated reader user data preservation ─────────────────

  it('generated reader merge preserves gradingResults when preferred side lacks them', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {
        key1: { story: 'local-story', gradingResults: { score: 80 }, userAnswers: ['a', 'b'] },
      },
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {
        key1: { story: 'cloud-story' },
      },
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData, { prefer: 'cloud' });
    // Local has gradingResults + userAnswers (score 2), cloud has none (score 0)
    expect(result.generated_readers.key1.gradingResults).toBeTruthy();
    expect(result.generated_readers.key1.userAnswers).toBeTruthy();
  });

  it('generated reader merge preserves chatHistory when preferred side lacks it', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {
        key1: { story: 'story', chatHistory: [{ role: 'user', content: 'hi' }], chatSummary: 'summary' },
      },
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {
        key1: { story: 'story' },
      },
      learned_vocabulary: {},
      exported_words: [],
    };
    const result = mergeData(localState, cloudData, { prefer: 'cloud' });
    expect(result.generated_readers.key1.chatHistory).toBeTruthy();
    expect(result.generated_readers.key1.chatSummary).toBe('summary');
  });

  it('generated reader merge uses preferred side when it has more user data', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {
        key1: { story: 'local', gradingResults: { score: 50 } },
      },
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {
        key1: { story: 'cloud', gradingResults: { score: 80 }, userAnswers: ['a'], chatHistory: [{}] },
      },
      learned_vocabulary: {},
      exported_words: [],
    };
    // Cloud has more user data (score 3) vs local (score 1) — cloud wins with prefer:cloud
    const result = mergeData(localState, cloudData, { prefer: 'cloud' });
    expect(result.generated_readers.key1.story).toBe('cloud');
    expect(result.generated_readers.key1.gradingResults.score).toBe(80);
  });

  it('generated reader merge uses preferred side when scores are equal', () => {
    const localState = {
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      generatedReaders: {
        key1: { story: 'local', gradingResults: { score: 50 } },
      },
      learnedVocabulary: {},
      exportedWords: new Set(),
    };
    const cloudData = {
      syllabi: [],
      syllabus_progress: {},
      standalone_readers: [],
      generated_readers: {
        key1: { story: 'cloud', gradingResults: { score: 80 } },
      },
      learned_vocabulary: {},
      exported_words: [],
    };
    // Both have score 1 — preferred side (local, default) wins
    const result = mergeData(localState, cloudData);
    expect(result.generated_readers.key1.story).toBe('local');
  });
});
