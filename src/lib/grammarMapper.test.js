import { describe, it, expect } from 'vitest';
import { mapReaderGrammar } from './grammarMapper';

describe('mapReaderGrammar', () => {
  it('maps grammar notes correctly', () => {
    const reader = {
      grammarNotes: [
        { pattern: '把…V了', label: 'disposal', explanation: 'Puts focus on the object', example: '我把书看了' },
        { pattern: '了', label: 'completion', explanation: 'Indicates completion', example: '他吃了饭' },
      ],
    };
    const result = mapReaderGrammar(reader, 'zh');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      pattern: '把…V了',
      label: 'disposal',
      explanation: 'Puts focus on the object',
      example: '我把书看了',
      langId: 'zh',
    });
  });

  it('filters out notes without pattern', () => {
    const reader = {
      grammarNotes: [
        { pattern: '把…V了', explanation: 'Valid' },
        { pattern: '', explanation: 'No pattern' },
        { explanation: 'Missing pattern' },
      ],
    };
    const result = mapReaderGrammar(reader, 'zh');
    expect(result).toHaveLength(1);
    expect(result[0].pattern).toBe('把…V了');
  });

  it('returns null for empty grammarNotes', () => {
    expect(mapReaderGrammar({ grammarNotes: [] }, 'zh')).toBeNull();
    expect(mapReaderGrammar({}, 'zh')).toBeNull();
    expect(mapReaderGrammar(null, 'zh')).toBeNull();
  });

  it('returns null when all notes lack a pattern', () => {
    const reader = {
      grammarNotes: [
        { explanation: 'No pattern at all' },
      ],
    };
    expect(mapReaderGrammar(reader, 'zh')).toBeNull();
  });

  it('defaults missing fields to empty strings', () => {
    const reader = {
      grammarNotes: [{ pattern: 'V了' }],
    };
    const result = mapReaderGrammar(reader, 'ko');
    expect(result[0]).toEqual({
      pattern: 'V了',
      label: '',
      explanation: '',
      example: '',
      langId: 'ko',
    });
  });
});
