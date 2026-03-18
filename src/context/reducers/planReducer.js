import {
  ADD_PLAN, UPDATE_PLAN, REMOVE_PLAN,
  SET_PLAN_WEEK, CONFIRM_PLAN_WEEK,
  COMPLETE_PLAN_ACTIVITY, UNCOMPLETE_PLAN_ACTIVITY, SKIP_PLAN_ACTIVITY,
  UPDATE_PLAN_ACTIVITY_STATUS,
  ARCHIVE_WEEK, EARN_XP, ADD_MILESTONE,
} from '../actionTypes';

export function planReducer(state, action) {
  switch (action.type) {
    case ADD_PLAN: {
      const plan = action.payload;
      return {
        ...state,
        learningPlans: { ...state.learningPlans, [plan.id]: plan },
        planProgress: {
          ...state.planProgress,
          [plan.id]: {
            totalActivitiesCompleted: 0,
            currentStreak: 0,
            totalMinutesSpent: 0,
            xp: 0,
            milestones: [],
          },
        },
      };
    }

    case UPDATE_PLAN: {
      const { id, ...updates } = action.payload;
      const existing = state.learningPlans[id];
      if (!existing) return state;
      return {
        ...state,
        learningPlans: {
          ...state.learningPlans,
          [id]: { ...existing, ...updates },
        },
      };
    }

    case REMOVE_PLAN: {
      const planId = action.payload;
      const { [planId]: _, ...remainingPlans } = state.learningPlans;
      const { [planId]: __, ...remainingProgress } = state.planProgress;
      return {
        ...state,
        learningPlans: remainingPlans,
        planProgress: remainingProgress,
      };
    }

    case SET_PLAN_WEEK: {
      const { planId, week } = action.payload;
      const plan = state.learningPlans[planId];
      if (!plan) return state;
      return {
        ...state,
        learningPlans: {
          ...state.learningPlans,
          [planId]: { ...plan, currentWeek: week },
        },
      };
    }

    case CONFIRM_PLAN_WEEK: {
      const planId = action.payload;
      const plan = state.learningPlans[planId];
      if (!plan || !plan.currentWeek) return state;
      return {
        ...state,
        learningPlans: {
          ...state.learningPlans,
          [planId]: {
            ...plan,
            currentWeek: { ...plan.currentWeek, confirmed: true },
          },
        },
      };
    }

    case COMPLETE_PLAN_ACTIVITY: {
      const { planId, dayIndex, activityId, actualMinutes } = action.payload;
      const plan = state.learningPlans[planId];
      if (!plan || !plan.currentWeek) return state;

      const newDays = plan.currentWeek.days.map((day, i) => {
        if (i !== dayIndex) return day;
        return {
          ...day,
          activities: day.activities.map(a =>
            a.id === activityId
              ? { ...a, status: 'completed', completedAt: Date.now(), actualMinutes: actualMinutes ?? a.estimatedMinutes }
              : a
          ),
        };
      });

      const progress = state.planProgress[planId] || { totalActivitiesCompleted: 0, currentStreak: 0, totalMinutesSpent: 0, xp: 0, milestones: [] };
      const mins = actualMinutes ?? 0;

      return {
        ...state,
        learningPlans: {
          ...state.learningPlans,
          [planId]: {
            ...plan,
            currentWeek: { ...plan.currentWeek, days: newDays },
          },
        },
        planProgress: {
          ...state.planProgress,
          [planId]: {
            ...progress,
            totalActivitiesCompleted: progress.totalActivitiesCompleted + 1,
            totalMinutesSpent: progress.totalMinutesSpent + mins,
          },
        },
      };
    }

    case UNCOMPLETE_PLAN_ACTIVITY: {
      const { planId, dayIndex, activityId } = action.payload;
      const plan = state.learningPlans[planId];
      if (!plan || !plan.currentWeek) return state;

      // Find the activity to get its actualMinutes before reverting
      const targetDay = plan.currentWeek.days[dayIndex];
      const targetActivity = targetDay?.activities.find(a => a.id === activityId);
      if (!targetActivity || targetActivity.status !== 'completed') return state;

      const revertedMinutes = targetActivity.actualMinutes || 0;

      const newDays = plan.currentWeek.days.map((day, i) => {
        if (i !== dayIndex) return day;
        return {
          ...day,
          activities: day.activities.map(a =>
            a.id === activityId
              ? { ...a, status: 'pending', completedAt: null, actualMinutes: null }
              : a
          ),
        };
      });

      const progress = state.planProgress[planId] || { totalActivitiesCompleted: 0, currentStreak: 0, totalMinutesSpent: 0, xp: 0, milestones: [] };

      return {
        ...state,
        learningPlans: {
          ...state.learningPlans,
          [planId]: {
            ...plan,
            currentWeek: { ...plan.currentWeek, days: newDays },
          },
        },
        planProgress: {
          ...state.planProgress,
          [planId]: {
            ...progress,
            totalActivitiesCompleted: Math.max(0, progress.totalActivitiesCompleted - 1),
            totalMinutesSpent: Math.max(0, progress.totalMinutesSpent - revertedMinutes),
          },
        },
      };
    }

    case SKIP_PLAN_ACTIVITY: {
      const { planId, dayIndex, activityId } = action.payload;
      const plan = state.learningPlans[planId];
      if (!plan || !plan.currentWeek) return state;

      const newDays = plan.currentWeek.days.map((day, i) => {
        if (i !== dayIndex) return day;
        return {
          ...day,
          activities: day.activities.map(a =>
            a.id === activityId ? { ...a, status: 'skipped' } : a
          ),
        };
      });

      return {
        ...state,
        learningPlans: {
          ...state.learningPlans,
          [planId]: {
            ...plan,
            currentWeek: { ...plan.currentWeek, days: newDays },
          },
        },
      };
    }

    case UPDATE_PLAN_ACTIVITY_STATUS: {
      const { planId, dayIndex, activityId, status } = action.payload;
      const plan = state.learningPlans[planId];
      if (!plan || !plan.currentWeek) return state;

      const newDays = plan.currentWeek.days.map((day, i) => {
        if (i !== dayIndex) return day;
        return {
          ...day,
          activities: day.activities.map(a =>
            a.id === activityId ? { ...a, status } : a
          ),
        };
      });

      return {
        ...state,
        learningPlans: {
          ...state.learningPlans,
          [planId]: {
            ...plan,
            currentWeek: { ...plan.currentWeek, days: newDays },
          },
        },
      };
    }

    case ARCHIVE_WEEK: {
      const planId = action.payload;
      const plan = state.learningPlans[planId];
      if (!plan || !plan.currentWeek) return state;

      const week = plan.currentWeek;
      let completedCount = 0;
      let totalCount = 0;
      let minutesSpent = 0;
      for (const day of week.days) {
        for (const a of day.activities) {
          totalCount++;
          if (a.status === 'completed') {
            completedCount++;
            minutesSpent += a.actualMinutes || a.estimatedMinutes || 0;
          }
        }
      }

      const summary = {
        weekOf: week.weekOf,
        completedCount,
        totalCount,
        minutesSpent,
        theme: week.theme,
      };

      return {
        ...state,
        learningPlans: {
          ...state.learningPlans,
          [planId]: {
            ...plan,
            currentWeek: null,
            weekHistory: [...(plan.weekHistory || []), summary],
          },
        },
      };
    }

    case EARN_XP: {
      const { planId, amount } = action.payload;
      const progress = state.planProgress[planId];
      if (!progress) return state;
      return {
        ...state,
        planProgress: {
          ...state.planProgress,
          [planId]: { ...progress, xp: progress.xp + amount },
        },
      };
    }

    case ADD_MILESTONE: {
      const { planId, milestone } = action.payload;
      const progress = state.planProgress[planId];
      if (!progress) return state;
      return {
        ...state,
        planProgress: {
          ...state.planProgress,
          [planId]: {
            ...progress,
            milestones: [...progress.milestones, { ...milestone, date: new Date().toISOString() }],
          },
        },
      };
    }

    default:
      return undefined;
  }
}
