/**
 * Pure functions for plan scheduling and time-budget distribution.
 */

const ACTIVITY_DURATIONS = {
  reading: 20,
  flashcards: 10,
  quiz: 10,
  tutor: 15,
  review: 15,
};

/**
 * Estimate duration for an activity type.
 */
export function estimateActivityDuration(type) {
  return ACTIVITY_DURATIONS[type] || 15;
}

/**
 * Calculate daily time budget from weekly minutes.
 * @param {number} dailyMinutes — user's daily time budget
 * @param {number} daysPerWeek — active days (default 7)
 * @returns {number} minutes per day
 */
export function calculateDailyBudget(dailyMinutes, daysPerWeek = 7) {
  return Math.max(10, Math.round(dailyMinutes * 7 / daysPerWeek));
}

/**
 * Distribute activities across 7 days within a time budget.
 * Ensures each day's total estimated time ≤ dailyMinutes.
 *
 * @param {Array} activities — flat list of { type, title, description, estimatedMinutes, config }
 * @param {number} dailyMinutes — per-day time budget
 * @returns {Array<Array>} — 7 arrays (Mon–Sun), each containing activities for that day
 */
export function distributeActivities(activities, dailyMinutes) {
  const days = Array.from({ length: 7 }, () => ({ activities: [], totalMinutes: 0 }));

  // Sort activities: readings first (most important), then by estimated time descending
  const sorted = [...activities].sort((a, b) => {
    const typeOrder = { reading: 0, quiz: 1, tutor: 2, review: 3, flashcards: 4 };
    const aOrder = typeOrder[a.type] ?? 5;
    const bOrder = typeOrder[b.type] ?? 5;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.estimatedMinutes || 0) - (a.estimatedMinutes || 0);
  });

  // Greedy distribution: assign each activity to the day with the most remaining budget
  for (const activity of sorted) {
    const mins = activity.estimatedMinutes || estimateActivityDuration(activity.type);

    // Find the day with the most remaining budget
    let bestDay = 0;
    let bestRemaining = -1;
    for (let i = 0; i < 7; i++) {
      const remaining = dailyMinutes - days[i].totalMinutes;
      if (remaining >= mins && remaining > bestRemaining) {
        bestDay = i;
        bestRemaining = remaining;
      }
    }

    // If no day has enough budget, find the least-loaded day anyway
    if (bestRemaining < 0) {
      let minLoad = Infinity;
      for (let i = 0; i < 7; i++) {
        if (days[i].totalMinutes < minLoad) {
          minLoad = days[i].totalMinutes;
          bestDay = i;
        }
      }
    }

    days[bestDay].activities.push(activity);
    days[bestDay].totalMinutes += mins;
  }

  return days.map(d => d.activities);
}

/**
 * Get the ISO date string for the Monday of the current week.
 */
export function getCurrentMonday() {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday=0
  const monday = new Date(now);
  monday.setDate(monday.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/**
 * Check if a new week has started since the last plan week.
 */
export function isNewWeek(currentWeek) {
  if (!currentWeek) return true;
  const mondayNow = getCurrentMonday();
  return mondayNow !== currentWeek.weekOf;
}
