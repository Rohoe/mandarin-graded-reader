/**
 * Derives learning statistics from app state + activity log.
 */

export function computeStats(state) {
  const { learnedVocabulary, syllabi, syllabusProgress, standaloneReaders, learningActivity } = state;

  // ── Vocabulary stats ───────────────────────────────────────
  const vocabEntries = Object.entries(learnedVocabulary || {});
  const totalWords = vocabEntries.length;

  const wordsByLang = {};
  for (const [, info] of vocabEntries) {
    const lang = info.langId || 'zh';
    wordsByLang[lang] = (wordsByLang[lang] || 0) + 1;
  }

  const wordsByPeriod = getWordsByPeriod(learnedVocabulary, 'week');

  // ── Quiz stats ─────────────────────────────────────────────
  const quizActivities = (learningActivity || []).filter(a => a.type === 'quiz_graded');
  const quizScores = quizActivities.map(a => a.score).filter(s => s != null);
  const avgQuizScore = quizScores.length > 0
    ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length * 10) / 10
    : null;

  // ── Completion stats ───────────────────────────────────────
  let totalLessons = 0;
  let completedLessons = 0;
  for (const s of syllabi) {
    totalLessons += (s.lessons || []).length;
    const progress = syllabusProgress[s.id];
    if (progress) completedLessons += (progress.completedLessons || []).length;
  }
  const readersGenerated = (learningActivity || []).filter(a => a.type === 'reader_generated').length;

  // ── Streak ─────────────────────────────────────────────────
  const streak = getStreak(learningActivity);

  return {
    totalWords,
    wordsByLang,
    wordsByPeriod,
    avgQuizScore,
    totalLessons,
    completedLessons,
    readersGenerated,
    standaloneCount: standaloneReaders.length,
    syllabusCount: syllabi.length,
    streak,
    quizCount: quizActivities.length,
  };
}

export function getStreak(activity) {
  if (!activity || activity.length === 0) return 0;

  const days = new Set();
  for (const a of activity) {
    if (a.timestamp) {
      const d = new Date(a.timestamp);
      days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  }

  if (days.size === 0) return 0;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // Check if today or yesterday is in the set (streak must be current)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (!days.has(todayKey) && !days.has(yesterdayKey)) return 0;

  let streak = 0;
  const check = new Date(today);
  // Start from today if today is active, otherwise yesterday
  if (!days.has(todayKey)) check.setDate(check.getDate() - 1);

  while (true) {
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (days.has(key)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function getWordsByPeriod(vocab, period = 'week') {
  if (!vocab) return [];

  const now = new Date();
  const buckets = {};

  // Determine bucket count and format
  const bucketCount = period === 'week' ? 8 : 6;

  for (const [, info] of Object.entries(vocab)) {
    if (!info.dateAdded) continue;
    const d = new Date(info.dateAdded);
    let bucketKey;

    if (period === 'week') {
      // Weekly buckets (last 8 weeks)
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const diffWeeks = Math.floor((weekStart - d) / (7 * 24 * 60 * 60 * 1000));
      if (diffWeeks < 0 || diffWeeks >= bucketCount) continue;
      bucketKey = diffWeeks;
    } else {
      // Monthly buckets (last 6 months)
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (diffMonths < 0 || diffMonths >= bucketCount) continue;
      bucketKey = diffMonths;
    }
    buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
  }

  // Build array from most recent to oldest (reversed for display)
  const result = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    const label = i === 0 ? 'This wk' : i === 1 ? 'Last wk' : `${i}wk ago`;
    result.push({ label, count: buckets[i] || 0 });
  }
  return result;
}
