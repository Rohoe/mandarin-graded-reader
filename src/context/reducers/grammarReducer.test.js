import { describe, it, expect } from 'vitest';
import { grammarReducer } from './grammarReducer';
import { ADD_GRAMMAR, UPDATE_GRAMMAR_SRS, CLEAR_GRAMMAR } from '../actionTypes';

const baseState = {
  learnedGrammar: {},
  learningActivity: [],
};

describe('grammarReducer', () => {
  describe('ADD_GRAMMAR', () => {
    it('merges new grammar notes with SRS defaults', () => {
      const notes = [
        { pattern: '把…V了', label: 'disposal', explanation: 'Puts focus on the object', example: '我把书看了', langId: 'zh' },
      ];
      const result = grammarReducer(baseState, { type: ADD_GRAMMAR, payload: notes });
      const key = 'zh::把…V了';
      expect(result.learnedGrammar[key]).toBeDefined();
      expect(result.learnedGrammar[key].pattern).toBe('把…V了');
      expect(result.learnedGrammar[key].interval).toBe(0);
      expect(result.learnedGrammar[key].ease).toBe(2.5);
      expect(result.learnedGrammar[key].reviewCount).toBe(0);
      expect(result.learnedGrammar[key].lapses).toBe(0);
      expect(result.learnedGrammar[key].nextReview).toBeNull();
      expect(result.learnedGrammar[key].dateAdded).toBeTruthy();
    });

    it('skips duplicate grammar notes', () => {
      const existing = {
        'zh::把…V了': { pattern: '把…V了', langId: 'zh', interval: 3, ease: 2.6, reviewCount: 2, lapses: 0, nextReview: null, dateAdded: '2024-01-01' },
      };
      const state = { ...baseState, learnedGrammar: existing };
      const notes = [
        { pattern: '把…V了', langId: 'zh', explanation: 'New explanation' },
      ];
      const result = grammarReducer(state, { type: ADD_GRAMMAR, payload: notes });
      // Should not overwrite existing
      expect(result.learnedGrammar['zh::把…V了'].interval).toBe(3);
      expect(result.learnedGrammar['zh::把…V了'].reviewCount).toBe(2);
    });

    it('logs grammar_added activity', () => {
      const notes = [
        { pattern: '了', langId: 'zh', explanation: 'Completion' },
        { pattern: '过', langId: 'zh', explanation: 'Experience' },
      ];
      const result = grammarReducer(baseState, { type: ADD_GRAMMAR, payload: notes });
      expect(result.learningActivity).toHaveLength(1);
      expect(result.learningActivity[0].type).toBe('grammar_added');
      expect(result.learningActivity[0].count).toBe(2);
    });
  });

  describe('UPDATE_GRAMMAR_SRS', () => {
    it('updates existing grammar SRS fields', () => {
      const state = {
        ...baseState,
        learnedGrammar: {
          'zh::把…V了': { pattern: '把…V了', langId: 'zh', interval: 0, ease: 2.5, reviewCount: 0, lapses: 0, nextReview: null },
        },
      };
      const result = grammarReducer(state, {
        type: UPDATE_GRAMMAR_SRS,
        payload: { key: 'zh::把…V了', interval: 1, ease: 2.6, reviewCount: 1, lapses: 0, nextReview: '2025-01-02T00:00:00.000Z' },
      });
      expect(result.learnedGrammar['zh::把…V了'].interval).toBe(1);
      expect(result.learnedGrammar['zh::把…V了'].ease).toBe(2.6);
      expect(result.learnedGrammar['zh::把…V了'].reviewCount).toBe(1);
    });

    it('no-ops for missing key', () => {
      const result = grammarReducer(baseState, {
        type: UPDATE_GRAMMAR_SRS,
        payload: { key: 'zh::nonexistent', interval: 5 },
      });
      expect(result).toBe(baseState);
    });
  });

  describe('CLEAR_GRAMMAR', () => {
    it('resets to empty object', () => {
      const state = {
        ...baseState,
        learnedGrammar: { 'zh::了': { pattern: '了', langId: 'zh' } },
      };
      const result = grammarReducer(state, { type: CLEAR_GRAMMAR });
      expect(result.learnedGrammar).toEqual({});
    });
  });

  it('returns undefined for unknown actions', () => {
    const result = grammarReducer(baseState, { type: 'UNKNOWN' });
    expect(result).toBeUndefined();
  });
});
