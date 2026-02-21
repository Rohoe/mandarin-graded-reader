import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeStats, getStreak, getWordsByPeriod } from './stats';

// ── getStreak ─────────────────────────────────────────────────

describe('getStreak', () => {
  it('returns 0 for empty activity', () => {
    expect(getStreak([])).toBe(0);
    expect(getStreak(null)).toBe(0);
    expect(getStreak(undefined)).toBe(0);
  });

  it('returns 1 for activity only today', () => {
    const now = Date.now();
    expect(getStreak([{ type: 'test', timestamp: now }])).toBe(1);
  });

  it('returns 1 for activity only yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getStreak([{ type: 'test', timestamp: yesterday.getTime() }])).toBe(1);
  });

  it('returns 2 for consecutive today + yesterday', () => {
    const now = Date.now();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getStreak([
      { type: 'test', timestamp: now },
      { type: 'test', timestamp: yesterday.getTime() },
    ])).toBe(2);
  });

  it('returns 0 when last activity is 2+ days ago', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(getStreak([{ type: 'test', timestamp: twoDaysAgo.getTime() }])).toBe(0);
  });

  it('counts consecutive days correctly', () => {
    const today = new Date();
    const activity = [];
    // 5 consecutive days ending today
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      activity.push({ type: 'test', timestamp: d.getTime() });
    }
    expect(getStreak(activity)).toBe(5);
  });

  it('stops counting at gap', () => {
    const today = new Date();
    const activity = [
      { type: 'test', timestamp: today.getTime() },
      { type: 'test', timestamp: new Date(today.getTime() - 1 * 86400000).getTime() },
      // gap: day -2 missing
      { type: 'test', timestamp: new Date(today.getTime() - 3 * 86400000).getTime() },
    ];
    expect(getStreak(activity)).toBe(2);
  });

  it('handles multiple activities on same day', () => {
    const now = Date.now();
    const activity = [
      { type: 'test', timestamp: now },
      { type: 'test', timestamp: now - 1000 },
      { type: 'test', timestamp: now - 2000 },
    ];
    expect(getStreak(activity)).toBe(1);
  });

  it('starts from yesterday when no activity today', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(getStreak([
      { type: 'test', timestamp: yesterday.getTime() },
      { type: 'test', timestamp: twoDaysAgo.getTime() },
    ])).toBe(2);
  });
});

// ── getWordsByPeriod ──────────────────────────────────────────

describe('getWordsByPeriod', () => {
  it('returns empty array for null vocab', () => {
    expect(getWordsByPeriod(null)).toEqual([]);
  });

  it('returns 8 weekly buckets with zero counts for empty vocab', () => {
    const result = getWordsByPeriod({}, 'week');
    expect(result.length).toBe(8);
    result.forEach(b => expect(b.count).toBe(0));
  });

  it('places words added early this week in the current week bucket', () => {
    // Use the start of the current week (Sunday) to guarantee bucket 0
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(sunday.getDate() - sunday.getDay());
    sunday.setHours(1, 0, 0, 0);
    const result = getWordsByPeriod({
      '猫': { dateAdded: sunday.toISOString() },
    }, 'week');
    const thisWeek = result.find(b => b.label === 'This wk');
    expect(thisWeek.count).toBe(1);
  });

  it('ignores words with no dateAdded', () => {
    const result = getWordsByPeriod({
      '猫': { pinyin: 'māo', english: 'cat' },
    }, 'week');
    result.forEach(b => expect(b.count).toBe(0));
  });

  it('returns 6 monthly buckets', () => {
    const result = getWordsByPeriod({}, 'month');
    expect(result.length).toBe(6);
  });
});

// ── computeStats ─────────────────────────────────────────────

describe('computeStats', () => {
  it('computes stats for empty state', () => {
    const state = {
      learnedVocabulary: {},
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learningActivity: [],
    };
    const stats = computeStats(state);
    expect(stats.totalWords).toBe(0);
    expect(stats.avgQuizScore).toBeNull();
    expect(stats.totalLessons).toBe(0);
    expect(stats.completedLessons).toBe(0);
    expect(stats.readersGenerated).toBe(0);
    expect(stats.streak).toBe(0);
  });

  it('counts total words', () => {
    const state = {
      learnedVocabulary: { '猫': { langId: 'zh' }, '개': { langId: 'ko' } },
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learningActivity: [],
    };
    const stats = computeStats(state);
    expect(stats.totalWords).toBe(2);
  });

  it('groups words by language', () => {
    const state = {
      learnedVocabulary: {
        '猫': { langId: 'zh' },
        '狗': { langId: 'zh' },
        '개': { langId: 'ko' },
      },
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learningActivity: [],
    };
    const stats = computeStats(state);
    expect(stats.wordsByLang.zh).toBe(2);
    expect(stats.wordsByLang.ko).toBe(1);
  });

  it('defaults missing langId to zh', () => {
    const state = {
      learnedVocabulary: { '猫': { pinyin: 'māo' } },
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learningActivity: [],
    };
    const stats = computeStats(state);
    expect(stats.wordsByLang.zh).toBe(1);
  });

  it('computes average quiz score', () => {
    const state = {
      learnedVocabulary: {},
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learningActivity: [
        { type: 'quiz_graded', score: 4, timestamp: Date.now() },
        { type: 'quiz_graded', score: 5, timestamp: Date.now() },
      ],
    };
    const stats = computeStats(state);
    expect(stats.avgQuizScore).toBe(4.5);
    expect(stats.quizCount).toBe(2);
  });

  it('counts lesson totals and completions', () => {
    const state = {
      learnedVocabulary: {},
      syllabi: [
        { id: 's1', lessons: [{ lesson_number: 1 }, { lesson_number: 2 }] },
      ],
      syllabusProgress: {
        s1: { lessonIndex: 1, completedLessons: [0] },
      },
      standaloneReaders: [{ key: 'sr1' }],
      learningActivity: [],
    };
    const stats = computeStats(state);
    expect(stats.totalLessons).toBe(2);
    expect(stats.completedLessons).toBe(1);
    expect(stats.syllabusCount).toBe(1);
    expect(stats.standaloneCount).toBe(1);
  });

  it('counts readers generated from activity', () => {
    const state = {
      learnedVocabulary: {},
      syllabi: [],
      syllabusProgress: {},
      standaloneReaders: [],
      learningActivity: [
        { type: 'reader_generated', timestamp: Date.now() },
        { type: 'reader_generated', timestamp: Date.now() },
        { type: 'vocab_added', timestamp: Date.now() },
      ],
    };
    const stats = computeStats(state);
    expect(stats.readersGenerated).toBe(2);
  });
});
