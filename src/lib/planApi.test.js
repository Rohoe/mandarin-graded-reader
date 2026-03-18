import { describe, it, expect } from 'vitest';
import { buildWeeklySummary } from './planApi';

describe('buildWeeklySummary', () => {
  it('returns null for empty history', () => {
    expect(buildWeeklySummary({ weekHistory: [] })).toBeNull();
  });

  it('builds summary from last week', () => {
    const plan = {
      weekHistory: [
        { theme: 'Daily Life', completedCount: 8, totalCount: 10, minutesSpent: 120 },
      ],
    };
    const summary = buildWeeklySummary(plan);
    expect(summary).toContain('Week 1');
    expect(summary).toContain('Daily Life');
    expect(summary).toContain('8/10');
    expect(summary).toContain('120');
  });
});
