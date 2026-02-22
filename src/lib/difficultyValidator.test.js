import { describe, it, expect } from 'vitest';
import { assessDifficulty, assessmentLabel, assessmentClass } from './difficultyValidator';

describe('assessDifficulty', () => {
  it('returns "none" for empty vocab', () => {
    const result = assessDifficulty([], {}, 3);
    expect(result.assessment).toBe('none');
    expect(result.totalWords).toBe(0);
  });

  it('returns "easy" when most words are known', () => {
    const vocab = [
      { target: '猫' }, { target: '狗' }, { target: '鱼' }, { target: '鸟' }, { target: '马' },
    ];
    const learned = { '猫': {}, '狗': {}, '鱼': {}, '鸟': {} }; // 4/5 known
    const result = assessDifficulty(vocab, learned, 3);
    expect(result.assessment).toBe('easy');
    expect(result.knownWordCount).toBe(4);
    expect(result.newWordCount).toBe(1);
  });

  it('returns "good" when mix of new and known', () => {
    const vocab = [
      { target: '猫' }, { target: '狗' }, { target: '鱼' }, { target: '鸟' }, { target: '马' },
    ];
    const learned = { '猫': {}, '狗': {} }; // 2/5 known → 60% new
    const result = assessDifficulty(vocab, learned, 3);
    expect(result.assessment).toBe('good');
  });

  it('returns "challenging" when mostly new words', () => {
    const vocab = [
      { target: '猫' }, { target: '狗' }, { target: '鱼' }, { target: '鸟' },
      { target: '马' }, { target: '羊' }, { target: '牛' }, { target: '鸡' },
      { target: '鸭' }, { target: '兔' },
    ];
    const learned = { '猫': {} }; // 1/10 known → 90% new
    const result = assessDifficulty(vocab, learned, 3);
    expect(result.assessment).toBe('challenging');
  });

  it('returns "hard" when all words are new', () => {
    const vocab = [{ target: '猫' }, { target: '狗' }, { target: '鱼' }];
    const result = assessDifficulty(vocab, {}, 3);
    expect(result.assessment).toBe('hard');
    expect(result.newWordRatio).toBe(1);
  });

  it('handles vocab with chinese field fallback', () => {
    const vocab = [{ chinese: '猫' }];
    const learned = { '猫': {} };
    const result = assessDifficulty(vocab, learned, 3);
    expect(result.knownWordCount).toBe(1);
  });
});

describe('assessmentLabel', () => {
  it('returns correct labels', () => {
    expect(assessmentLabel('easy')).toBe('Easy');
    expect(assessmentLabel('good')).toBe('Good level');
    expect(assessmentLabel('challenging')).toBe('Challenging');
    expect(assessmentLabel('hard')).toBe('Hard');
    expect(assessmentLabel('none')).toBe('');
  });
});

describe('assessmentClass', () => {
  it('returns correct CSS classes', () => {
    expect(assessmentClass('easy')).toBe('difficulty--easy');
    expect(assessmentClass('good')).toBe('difficulty--good');
    expect(assessmentClass('challenging')).toBe('difficulty--challenging');
    expect(assessmentClass('hard')).toBe('difficulty--hard');
    expect(assessmentClass('none')).toBe('');
  });
});
