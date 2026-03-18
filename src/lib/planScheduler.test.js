import { describe, it, expect } from 'vitest';
import {
  estimateActivityDuration,
  calculateDailyBudget,
  distributeActivities,
  getCurrentMonday,
  isNewWeek,
} from './planScheduler';

describe('estimateActivityDuration', () => {
  it('returns known durations for standard types', () => {
    expect(estimateActivityDuration('reading')).toBe(20);
    expect(estimateActivityDuration('flashcards')).toBe(10);
    expect(estimateActivityDuration('quiz')).toBe(10);
    expect(estimateActivityDuration('tutor')).toBe(15);
    expect(estimateActivityDuration('review')).toBe(15);
  });

  it('returns 15 for unknown types', () => {
    expect(estimateActivityDuration('unknown')).toBe(15);
  });
});

describe('calculateDailyBudget', () => {
  it('returns weekly total divided by days', () => {
    expect(calculateDailyBudget(30, 7)).toBe(30);
    expect(calculateDailyBudget(30, 5)).toBe(42);
  });

  it('returns at least 10', () => {
    expect(calculateDailyBudget(5, 7)).toBe(10);
  });
});

describe('distributeActivities', () => {
  it('distributes activities across 7 days', () => {
    const activities = [
      { type: 'reading', estimatedMinutes: 20 },
      { type: 'flashcards', estimatedMinutes: 10 },
      { type: 'reading', estimatedMinutes: 20 },
      { type: 'quiz', estimatedMinutes: 10 },
    ];
    const result = distributeActivities(activities, 30);
    expect(result).toHaveLength(7);
    // All activities should be distributed
    const total = result.reduce((sum, day) => sum + day.length, 0);
    expect(total).toBe(4);
  });

  it('does not exceed daily budget when possible', () => {
    const activities = [
      { type: 'reading', estimatedMinutes: 20 },
      { type: 'reading', estimatedMinutes: 20 },
      { type: 'reading', estimatedMinutes: 20 },
    ];
    const result = distributeActivities(activities, 20);
    // Each day should have at most 1 reading
    for (const day of result) {
      const mins = day.reduce((s, a) => s + a.estimatedMinutes, 0);
      expect(mins).toBeLessThanOrEqual(20);
    }
  });

  it('handles empty activities', () => {
    const result = distributeActivities([], 30);
    expect(result).toHaveLength(7);
    expect(result.every(d => d.length === 0)).toBe(true);
  });
});

describe('getCurrentMonday', () => {
  it('returns an ISO date string', () => {
    const monday = getCurrentMonday();
    expect(monday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a Monday', () => {
    const monday = getCurrentMonday();
    const date = new Date(monday + 'T00:00:00');
    // getDay() returns 1 for Monday
    expect(date.getDay()).toBe(1);
  });
});

describe('isNewWeek', () => {
  it('returns true when currentWeek is null', () => {
    expect(isNewWeek(null)).toBe(true);
  });

  it('returns false when weekOf matches current Monday', () => {
    const monday = getCurrentMonday();
    expect(isNewWeek({ weekOf: monday })).toBe(false);
  });

  it('returns true when weekOf is from a different week', () => {
    expect(isNewWeek({ weekOf: '2020-01-06' })).toBe(true);
  });
});
