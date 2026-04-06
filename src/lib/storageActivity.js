import { load, save } from './storageHelpers';

const KEYS = {
  LEARNING_ACTIVITY: 'gradedReader_learningActivity',
  READING_TIME: 'gradedReader_readingTime',
  READING_TIME_LOG: 'gradedReader_readingTimeLog',
  WEEKLY_GOALS: 'gradedReader_weeklyGoals',
  DIFFICULTY_FEEDBACK: 'gradedReader_difficultyFeedback',
  SHOWN_MILESTONES: 'gradedReader_shownMilestones',
};

const ACTIVITY_STASH_KEY = 'gradedReader_learningActivity_stash';
const STASH_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const STASH_THRESHOLD = 500;

// ── Learning Activity ─────────────────────────────────────────

export function loadLearningActivity() {
  return load(KEYS.LEARNING_ACTIVITY, []);
}

export function saveLearningActivity(activity) {
  save(KEYS.LEARNING_ACTIVITY, activity);
}

/**
 * Move activity entries older than 90 days to a separate stash key.
 * Called when the main array exceeds STASH_THRESHOLD entries.
 * Returns the pruned (recent) activity array.
 */
export function stashOldActivity(activity) {
  if (activity.length <= STASH_THRESHOLD) return activity;
  const cutoff = Date.now() - STASH_AGE_MS;
  const recent = [];
  const old = [];
  for (const entry of activity) {
    if ((entry.timestamp || 0) < cutoff) old.push(entry);
    else recent.push(entry);
  }
  if (old.length === 0) return activity;
  // Merge with existing stash
  const existingStash = load(ACTIVITY_STASH_KEY, []);
  save(ACTIVITY_STASH_KEY, [...existingStash, ...old]);
  save(KEYS.LEARNING_ACTIVITY, recent);
  return recent;
}

export function loadActivityStash() {
  return load(ACTIVITY_STASH_KEY, []);
}

// ── Reading time tracking ─────────────────────────────────────

export function loadReadingTime() {
  return load(KEYS.READING_TIME, {});
}

export function saveReadingTime(data) {
  save(KEYS.READING_TIME, data);
}

// ── Reading time log (timestamped sessions) ──────────────────────

export function loadReadingTimeLog() {
  return load(KEYS.READING_TIME_LOG, []);
}

export function saveReadingTimeLog(log) {
  save(KEYS.READING_TIME_LOG, log);
}

// ── Weekly goals ─────────────────────────────────────────

const DEFAULT_WEEKLY_GOALS = { lessons: 3, flashcards: 30, quizzes: 2, minutes: 30 };

export function loadWeeklyGoals() {
  return load(KEYS.WEEKLY_GOALS, DEFAULT_WEEKLY_GOALS);
}

export function saveWeeklyGoals(goals) {
  save(KEYS.WEEKLY_GOALS, goals);
}

// ── Difficulty feedback ──────────────────────────────────────

export function loadDifficultyFeedback() {
  return load(KEYS.DIFFICULTY_FEEDBACK, {});
}

export function saveDifficultyFeedback(data) {
  save(KEYS.DIFFICULTY_FEEDBACK, data);
}

// ── Shown milestones ────────────────────────────────────────

export function loadShownMilestones() {
  return load(KEYS.SHOWN_MILESTONES, []);
}

export function saveShownMilestones(set) {
  save(KEYS.SHOWN_MILESTONES, [...set]);
}
