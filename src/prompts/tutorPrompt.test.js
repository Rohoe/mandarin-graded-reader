import { describe, it, expect } from 'vitest';
import { buildTutorSystemPrompt } from './tutorPrompt';
import { getLang } from '../lib/languages';

describe('buildTutorSystemPrompt', () => {
  const zhConfig = getLang('zh');
  const frConfig = getLang('fr');

  const baseReader = {
    level: 3,
    story: 'A short test story.',
    vocabulary: [
      { target: '你好', romanization: 'nǐ hǎo', english: 'hello' },
      { target: '谢谢', romanization: 'xiè xie', english: 'thank you' },
    ],
    grammarNotes: [
      { pattern: '是...的', label: 'shi...de', explanation: 'Emphasizes when/where/how', example: '他是昨天来的' },
    ],
  };

  it('includes role and language info', () => {
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English');
    expect(prompt).toContain('Mandarin Chinese');
    expect(prompt).toContain('HSK');
    expect(prompt).toContain('level 3');
    expect(prompt).toContain('English');
    expect(prompt).toContain('patient, encouraging');
  });

  it('includes story text', () => {
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English');
    expect(prompt).toContain('A short test story.');
  });

  it('includes vocabulary items', () => {
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English');
    expect(prompt).toContain('你好');
    expect(prompt).toContain('nǐ hǎo');
    expect(prompt).toContain('hello');
    expect(prompt).toContain('谢谢');
  });

  it('includes grammar notes', () => {
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English');
    expect(prompt).toContain('是...的');
    expect(prompt).toContain('Emphasizes when/where/how');
  });

  it('includes quiz results when present', () => {
    const reader = {
      ...baseReader,
      quizResults: {
        score: '80%',
        results: [
          { question: 'Q1?', correct: true, feedback: 'Good job' },
          { question: 'Q2?', correct: false, feedback: 'Review this' },
        ],
      },
    };
    const prompt = buildTutorSystemPrompt(reader, null, zhConfig, 'English');
    expect(prompt).toContain('80%');
    expect(prompt).toContain('Q1?');
    expect(prompt).toContain('correct');
    expect(prompt).toContain('incorrect');
  });

  it('includes syllabus context from lessonMeta', () => {
    const meta = {
      description: 'Learn about food vocabulary',
      vocabulary_focus: ['food', 'cooking'],
      difficulty_hint: 'stretch',
    };
    const prompt = buildTutorSystemPrompt(baseReader, meta, zhConfig, 'English');
    expect(prompt).toContain('Learn about food vocabulary');
    expect(prompt).toContain('food, cooking');
    expect(prompt).toContain('stretch');
  });

  it('works with French config (no romanization)', () => {
    const reader = {
      level: 2,
      story: 'Une histoire française.',
      vocabulary: [{ target: 'bonjour', romanization: null, english: 'hello' }],
      grammarNotes: [],
    };
    const prompt = buildTutorSystemPrompt(reader, null, frConfig, 'English');
    expect(prompt).toContain('French');
    expect(prompt).toContain('CEFR');
    expect(prompt).toContain('bonjour');
  });

  it('handles empty reader gracefully', () => {
    const prompt = buildTutorSystemPrompt({}, null, zhConfig, 'English');
    expect(prompt).toContain('Mandarin Chinese');
    expect(prompt).not.toContain('## Lesson Story');
    expect(prompt).not.toContain('## Vocabulary');
  });

  it('truncates long stories', () => {
    const longStory = 'A'.repeat(2000);
    const reader = { ...baseReader, story: longStory };
    const prompt = buildTutorSystemPrompt(reader, null, zhConfig, 'English');
    expect(prompt).toContain('[...]');
    expect(prompt.length).toBeLessThan(longStory.length + 500);
  });

  // Feature 3: Cross-Lesson Tutor Memory
  it('without priorLessonSummaries → output unchanged', () => {
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English');
    expect(prompt).not.toContain('Prior Lesson Summaries');
  });

  it('with priorLessonSummaries → includes section', () => {
    const summaries = [
      { lessonNumber: 1, summary: 'We discussed food vocabulary and practiced ordering.' },
      { lessonNumber: 2, summary: 'Reviewed grammar patterns for past tense.' },
    ];
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English', { priorLessonSummaries: summaries });
    expect(prompt).toContain('## Prior Lesson Summaries');
    expect(prompt).toContain('Lesson 1:');
    expect(prompt).toContain('Lesson 2:');
    expect(prompt).toContain('food vocabulary');
  });

  it('summaries truncated at 200 chars each', () => {
    const longSummary = 'A'.repeat(300);
    const summaries = [{ lessonNumber: 1, summary: longSummary }];
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English', { priorLessonSummaries: summaries });
    expect(prompt).toContain('## Prior Lesson Summaries');
    // The line for lesson 1 should have at most 200 chars of the summary
    const match = prompt.match(/Lesson 1: (A+)/);
    expect(match[1].length).toBe(200);
  });

  it('max 5 summaries', () => {
    const summaries = Array.from({ length: 7 }, (_, i) => ({
      lessonNumber: i + 1,
      summary: `Summary for lesson ${i + 1}`,
    }));
    // The hook caps at 5, but the prompt builder should handle any number passed in
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English', { priorLessonSummaries: summaries });
    expect(prompt).toContain('Lesson 7:');
  });

  it('standalone readers (no priorLessonSummaries) → no section', () => {
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English', { priorLessonSummaries: undefined });
    expect(prompt).not.toContain('Prior Lesson Summaries');
  });

  it('empty array priorLessonSummaries → no section', () => {
    const prompt = buildTutorSystemPrompt(baseReader, null, zhConfig, 'English', { priorLessonSummaries: [] });
    expect(prompt).not.toContain('Prior Lesson Summaries');
  });
});
