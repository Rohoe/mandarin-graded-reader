import { describe, it, expect } from 'vitest';
import { planReducer } from './planReducer';
import {
  ADD_PLAN, UPDATE_PLAN, REMOVE_PLAN,
  SET_PLAN_WEEK, CONFIRM_PLAN_WEEK,
  COMPLETE_PLAN_ACTIVITY, SKIP_PLAN_ACTIVITY,
  UPDATE_PLAN_ACTIVITY_STATUS,
  ARCHIVE_WEEK, EARN_XP, ADD_MILESTONE,
} from '../actionTypes';

function baseState() {
  return {
    learningPlans: {},
    planProgress: {},
  };
}

function makePlan(overrides = {}) {
  return {
    id: 'plan_1',
    langId: 'zh',
    nativeLang: 'en',
    assessedLevel: 3,
    currentLevel: 3,
    goals: 'Pass HSK 3',
    dailyMinutes: 30,
    createdAt: Date.now(),
    currentWeek: null,
    weekHistory: [],
    adaptationNotes: '',
    ...overrides,
  };
}

function makeWeek(overrides = {}) {
  return {
    weekOf: '2026-03-16',
    generatedAt: Date.now(),
    confirmed: false,
    theme: 'Daily Life',
    days: Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i,
      activities: i < 5 ? [{
        id: `activity_${i}`,
        type: 'reading',
        status: 'pending',
        title: `Reading ${i + 1}`,
        description: 'A reading activity',
        estimatedMinutes: 20,
        completedAt: null,
        actualMinutes: null,
        config: { topic: 'test' },
      }] : [],
    })),
    ...overrides,
  };
}

describe('planReducer', () => {
  it('returns undefined for unknown actions', () => {
    expect(planReducer(baseState(), { type: 'UNKNOWN' })).toBeUndefined();
  });

  describe('ADD_PLAN', () => {
    it('adds a plan and initializes progress', () => {
      const plan = makePlan();
      const result = planReducer(baseState(), { type: ADD_PLAN, payload: plan });
      expect(result.learningPlans.plan_1).toEqual(plan);
      expect(result.planProgress.plan_1).toEqual({
        totalActivitiesCompleted: 0,
        currentStreak: 0,
        totalMinutesSpent: 0,
        xp: 0,
        milestones: [],
      });
    });
  });

  describe('UPDATE_PLAN', () => {
    it('updates plan fields', () => {
      const state = { ...baseState(), learningPlans: { plan_1: makePlan() } };
      const result = planReducer(state, { type: UPDATE_PLAN, payload: { id: 'plan_1', currentLevel: 4 } });
      expect(result.learningPlans.plan_1.currentLevel).toBe(4);
      expect(result.learningPlans.plan_1.goals).toBe('Pass HSK 3');
    });

    it('returns state if plan not found', () => {
      const state = baseState();
      expect(planReducer(state, { type: UPDATE_PLAN, payload: { id: 'nope', currentLevel: 4 } })).toBe(state);
    });
  });

  describe('REMOVE_PLAN', () => {
    it('removes plan and progress', () => {
      const state = {
        learningPlans: { plan_1: makePlan() },
        planProgress: { plan_1: { totalActivitiesCompleted: 5, currentStreak: 0, totalMinutesSpent: 100, xp: 0, milestones: [] } },
      };
      const result = planReducer(state, { type: REMOVE_PLAN, payload: 'plan_1' });
      expect(result.learningPlans).toEqual({});
      expect(result.planProgress).toEqual({});
    });
  });

  describe('SET_PLAN_WEEK', () => {
    it('sets the current week', () => {
      const state = { ...baseState(), learningPlans: { plan_1: makePlan() } };
      const week = makeWeek();
      const result = planReducer(state, { type: SET_PLAN_WEEK, payload: { planId: 'plan_1', week } });
      expect(result.learningPlans.plan_1.currentWeek).toEqual(week);
    });
  });

  describe('CONFIRM_PLAN_WEEK', () => {
    it('sets confirmed to true', () => {
      const plan = makePlan({ currentWeek: makeWeek() });
      const state = { ...baseState(), learningPlans: { plan_1: plan } };
      const result = planReducer(state, { type: CONFIRM_PLAN_WEEK, payload: 'plan_1' });
      expect(result.learningPlans.plan_1.currentWeek.confirmed).toBe(true);
    });
  });

  describe('COMPLETE_PLAN_ACTIVITY', () => {
    it('marks activity completed and updates progress', () => {
      const plan = makePlan({ currentWeek: makeWeek() });
      const state = {
        learningPlans: { plan_1: plan },
        planProgress: { plan_1: { totalActivitiesCompleted: 0, currentStreak: 0, totalMinutesSpent: 0, xp: 0, milestones: [] } },
      };
      const result = planReducer(state, {
        type: COMPLETE_PLAN_ACTIVITY,
        payload: { planId: 'plan_1', dayIndex: 0, activityId: 'activity_0', actualMinutes: 25 },
      });
      const activity = result.learningPlans.plan_1.currentWeek.days[0].activities[0];
      expect(activity.status).toBe('completed');
      expect(activity.actualMinutes).toBe(25);
      expect(activity.completedAt).toBeGreaterThan(0);
      expect(result.planProgress.plan_1.totalActivitiesCompleted).toBe(1);
      expect(result.planProgress.plan_1.totalMinutesSpent).toBe(25);
    });
  });

  describe('SKIP_PLAN_ACTIVITY', () => {
    it('marks activity as skipped', () => {
      const plan = makePlan({ currentWeek: makeWeek() });
      const state = { ...baseState(), learningPlans: { plan_1: plan } };
      const result = planReducer(state, {
        type: SKIP_PLAN_ACTIVITY,
        payload: { planId: 'plan_1', dayIndex: 0, activityId: 'activity_0' },
      });
      expect(result.learningPlans.plan_1.currentWeek.days[0].activities[0].status).toBe('skipped');
    });
  });

  describe('UPDATE_PLAN_ACTIVITY_STATUS', () => {
    it('updates activity status', () => {
      const plan = makePlan({ currentWeek: makeWeek() });
      const state = { ...baseState(), learningPlans: { plan_1: plan } };
      const result = planReducer(state, {
        type: UPDATE_PLAN_ACTIVITY_STATUS,
        payload: { planId: 'plan_1', dayIndex: 0, activityId: 'activity_0', status: 'in_progress' },
      });
      expect(result.learningPlans.plan_1.currentWeek.days[0].activities[0].status).toBe('in_progress');
    });
  });

  describe('ARCHIVE_WEEK', () => {
    it('archives week with summary and clears currentWeek', () => {
      const week = makeWeek({ confirmed: true });
      // Complete 2 activities
      week.days[0].activities[0].status = 'completed';
      week.days[0].activities[0].actualMinutes = 20;
      week.days[1].activities[0].status = 'completed';
      week.days[1].activities[0].actualMinutes = 15;

      const plan = makePlan({ currentWeek: week });
      const state = { ...baseState(), learningPlans: { plan_1: plan } };
      const result = planReducer(state, { type: ARCHIVE_WEEK, payload: 'plan_1' });

      expect(result.learningPlans.plan_1.currentWeek).toBeNull();
      expect(result.learningPlans.plan_1.weekHistory).toHaveLength(1);
      const summary = result.learningPlans.plan_1.weekHistory[0];
      expect(summary.completedCount).toBe(2);
      expect(summary.totalCount).toBe(5);
      expect(summary.minutesSpent).toBe(35);
    });
  });

  describe('EARN_XP', () => {
    it('adds XP to progress', () => {
      const state = {
        ...baseState(),
        planProgress: { plan_1: { totalActivitiesCompleted: 0, currentStreak: 0, totalMinutesSpent: 0, xp: 100, milestones: [] } },
      };
      const result = planReducer(state, { type: EARN_XP, payload: { planId: 'plan_1', amount: 30 } });
      expect(result.planProgress.plan_1.xp).toBe(130);
    });
  });

  describe('ADD_MILESTONE', () => {
    it('adds milestone with date', () => {
      const state = {
        ...baseState(),
        planProgress: { plan_1: { totalActivitiesCompleted: 0, currentStreak: 0, totalMinutesSpent: 0, xp: 0, milestones: [] } },
      };
      const result = planReducer(state, {
        type: ADD_MILESTONE,
        payload: { planId: 'plan_1', milestone: { type: 'vocab_50', label: '50 words learned' } },
      });
      expect(result.planProgress.plan_1.milestones).toHaveLength(1);
      expect(result.planProgress.plan_1.milestones[0].type).toBe('vocab_50');
      expect(result.planProgress.plan_1.milestones[0].date).toBeTruthy();
    });
  });
});
