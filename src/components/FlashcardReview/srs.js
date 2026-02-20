/**
 * SM-2 inspired spaced repetition algorithm for flashcard review.
 */

/**
 * Calculate updated SRS fields after a judgment.
 * @param {'got'|'almost'|'missed'} judgment
 * @param {object} word - Current vocab entry (may have SRS fields or not)
 * @returns {{ interval, ease, nextReview, reviewCount, lapses }}
 */
export function calculateSRS(judgment, word) {
  const interval = word.interval ?? 0;
  const ease = word.ease ?? 2.5;
  const reviewCount = word.reviewCount ?? 0;
  const lapses = word.lapses ?? 0;

  let newInterval, newEase, newLapses;

  switch (judgment) {
    case 'got':
      newInterval = interval === 0 ? 1 : interval === 1 ? 3 : Math.round(interval * ease);
      newEase = Math.min(ease + 0.1, 3.0);
      newLapses = lapses;
      break;
    case 'almost':
      newInterval = 1;
      newEase = ease;
      newLapses = lapses;
      break;
    case 'missed':
      newInterval = 0;
      newEase = Math.max(ease - 0.2, 1.3);
      newLapses = lapses + 1;
      break;
    default:
      return { interval, ease, nextReview: word.nextReview ?? null, reviewCount, lapses };
  }

  return {
    interval: newInterval,
    ease: newEase,
    nextReview: getNextReviewDate(newInterval),
    reviewCount: reviewCount + 1,
    lapses: newLapses,
  };
}

/**
 * Returns an ISO date string for when the card should next be reviewed.
 * @param {number} intervalDays
 * @returns {string} ISO date string
 */
export function getNextReviewDate(intervalDays) {
  const d = new Date();
  d.setDate(d.getDate() + intervalDays);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Sort cards for review: overdue first (most overdue first), then new, then not-yet-due.
 * @param {Array} cards - Cards with SRS fields from learnedVocabulary
 * @returns {{ due: Array, newCards: Array, notDue: Array, sorted: Array }}
 */
export function sortCardsBySRS(cards) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const nowMs = now.getTime();

  const due = [];
  const newCards = [];
  const notDue = [];

  for (const card of cards) {
    const nextReview = card.nextReview ? new Date(card.nextReview).getTime() : null;
    const reviewCount = card.reviewCount ?? 0;

    if (reviewCount === 0 && !nextReview) {
      newCards.push(card);
    } else if (!nextReview || nextReview <= nowMs) {
      due.push({ ...card, _overdueBy: nextReview ? nowMs - nextReview : Infinity });
    } else {
      notDue.push(card);
    }
  }

  // Sort due cards: most overdue first
  due.sort((a, b) => b._overdueBy - a._overdueBy);

  // Clean up temp field
  const cleanDue = due.map(({ _overdueBy, ...rest }) => rest);

  return {
    due: cleanDue,
    newCards,
    notDue,
    sorted: [...cleanDue, ...newCards, ...notDue],
  };
}

/**
 * Classify a card's mastery level based on its interval.
 * @param {object} word - Vocab entry with optional SRS fields
 * @returns {'mastered'|'learning'|'new'}
 */
export function getMasteryLevel(word) {
  const reviewCount = word.reviewCount ?? 0;
  const interval = word.interval ?? 0;
  if (reviewCount === 0) return 'new';
  if (interval >= 21) return 'mastered';
  return 'learning';
}
