import { describe, it, expect } from 'vitest';
import { buildAssessmentPrompt, deriveAssessedLevel } from './assessmentPrompt';
import { getLang } from '../lib/languages';

describe('buildAssessmentPrompt', () => {
  it('generates a prompt with language-specific details', () => {
    const langConfig = getLang('zh');
    const prompt = buildAssessmentPrompt(langConfig, 'English');
    expect(prompt).toContain('Mandarin Chinese');
    expect(prompt).toContain('HSK');
    expect(prompt).toContain('English');
    expect(prompt).toContain('JSON');
  });

  it('works for Korean', () => {
    const langConfig = getLang('ko');
    const prompt = buildAssessmentPrompt(langConfig, 'English');
    expect(prompt).toContain('Korean');
    expect(prompt).toContain('TOPIK');
  });
});

describe('deriveAssessedLevel', () => {
  const langConfig = getLang('zh');

  it('returns lowest level for empty ratings', () => {
    expect(deriveAssessedLevel([], langConfig)).toBe(0);
    expect(deriveAssessedLevel(null, langConfig)).toBe(0);
  });

  it('returns highest level with rating >= 3', () => {
    const ratings = [
      { level: 1, rating: 4 },
      { level: 2, rating: 3 },
      { level: 3, rating: 2 },
      { level: 4, rating: 1 },
    ];
    expect(deriveAssessedLevel(ratings, langConfig)).toBe(2);
  });

  it('stops at first rating of 1', () => {
    const ratings = [
      { level: 1, rating: 4 },
      { level: 2, rating: 1 },
      { level: 3, rating: 4 },
    ];
    expect(deriveAssessedLevel(ratings, langConfig)).toBe(1);
  });

  it('returns highest level if all rated 4', () => {
    const ratings = [
      { level: 1, rating: 4 },
      { level: 2, rating: 4 },
      { level: 3, rating: 4 },
    ];
    expect(deriveAssessedLevel(ratings, langConfig)).toBe(3);
  });
});
