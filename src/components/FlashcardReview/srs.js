/**
 * SM-2 inspired spaced repetition algorithm for flashcard review.
 */

/**
 * Calculate updated SRS fields after a judgment.
 * @param {'got'|'almost'|'missed'} judgment
 * @param {object} word - Current vocab entry (may have SRS fields or not)
 * @param {'forward'|'reverse'} direction - Card direction
 * @returns {object} SRS fields (prefixed with 'reverse' when direction === 'reverse')
 */
export function calculateSRS(judgment, word, direction = 'forward') {
  const prefix = direction === 'reverse' ? 'reverse' : '';
  const key = (field) => prefix ? `${prefix}${field.charAt(0).toUpperCase()}${field.slice(1)}` : field;

  const interval = word[key('interval')] ?? 0;
  const ease = word[key('ease')] ?? 2.5;
  const reviewCount = word[key('reviewCount')] ?? 0;
  const lapses = word[key('lapses')] ?? 0;

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
      return {
        [key('interval')]: interval,
        [key('ease')]: ease,
        [key('nextReview')]: word[key('nextReview')] ?? null,
        [key('reviewCount')]: reviewCount,
        [key('lapses')]: lapses,
      };
  }

  return {
    [key('interval')]: newInterval,
    [key('ease')]: newEase,
    [key('nextReview')]: getNextReviewDate(newInterval),
    [key('reviewCount')]: reviewCount + 1,
    [key('lapses')]: newLapses,
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
 * @param {'forward'|'reverse'} direction - Card direction
 * @returns {'mastered'|'learning'|'new'}
 */
export function getMasteryLevel(word, direction = 'forward') {
  const prefix = direction === 'reverse' ? 'reverse' : '';
  const key = (field) => prefix ? `${prefix}${field.charAt(0).toUpperCase()}${field.slice(1)}` : field;

  const reviewCount = word[key('reviewCount')] ?? 0;
  const interval = word[key('interval')] ?? 0;
  if (reviewCount === 0) return 'new';
  if (interval >= 21) return 'mastered';
  return 'learning';
}

/**
 * Build a daily flashcard session.
 *
 * @param {Array} cards - All vocab cards for the active language (with SRS fields)
 * @param {number} newCardsPerDay - Maximum new cards (forward + reverse) per day
 * @param {object|null} existingSession - Previously saved session from localStorage
 * @param {string} langId - Current language filter
 * @returns {object} Session object
 */
export function buildDailySession(cards, newCardsPerDay, existingSession, langId, { dateOverride } = {}) {
  const now = dateOverride ? new Date(dateOverride) : new Date();
  now.setHours(0, 0, 0, 0);
  const today = now.toISOString().slice(0, 10);
  const nowMs = now.getTime();

  // Resume existing session if same day + language and still valid
  if (existingSession && existingSession.date === today && existingSession.langId === langId) {
    // Revalidate: check card keys still exist
    const cardSet = new Set(cards.map(c => c.target));
    const validKeys = existingSession.cardKeys.filter(k => cardSet.has(k));
    if (validKeys.length === existingSession.cardKeys.length) {
      return existingSession;
    }
    // Rebuild if cards changed
  }

  // Collect due forward cards
  const dueForward = [];
  for (const card of cards) {
    const rc = card.reviewCount ?? 0;
    const nr = card.nextReview ? new Date(card.nextReview).getTime() : null;
    if (rc > 0 && (nr === null || nr <= nowMs)) {
      dueForward.push({ ...card, _overdueBy: nr ? nowMs - nr : Infinity, _direction: 'forward' });
    }
  }
  dueForward.sort((a, b) => b._overdueBy - a._overdueBy);

  // Collect due reverse cards (words reviewed at least once forward, reverse is overdue)
  const dueReverse = [];
  for (const card of cards) {
    const fwdRc = card.reviewCount ?? 0;
    const revRc = card.reverseReviewCount ?? 0;
    const revNr = card.reverseNextReview ? new Date(card.reverseNextReview).getTime() : null;
    if (fwdRc >= 1 && revRc > 0 && (revNr === null || revNr <= nowMs)) {
      dueReverse.push({ ...card, _overdueBy: revNr ? nowMs - revNr : Infinity, _direction: 'reverse' });
    }
  }
  dueReverse.sort((a, b) => b._overdueBy - a._overdueBy);

  // Collect new forward cards (never reviewed)
  const newForward = [];
  for (const card of cards) {
    const rc = card.reviewCount ?? 0;
    if (rc === 0) {
      newForward.push({ ...card, _direction: 'forward' });
    }
  }

  // Collect new reverse cards (reviewed forward at least once, never reviewed reverse)
  const newReverse = [];
  for (const card of cards) {
    const fwdRc = card.reviewCount ?? 0;
    const revRc = card.reverseReviewCount ?? 0;
    if (fwdRc >= 1 && revRc === 0) {
      newReverse.push({ ...card, _direction: 'reverse' });
    }
  }

  // Carry over newCardsUsed from earlier sessions today
  const priorNewUsed = (existingSession && existingSession.date === today) ? existingSession.newCardsUsed : 0;
  const newBudget = Math.max(0, newCardsPerDay - priorNewUsed);

  // Select new cards up to budget (interleave forward and reverse)
  const selectedNew = [];
  let fi = 0, ri = 0;
  while (selectedNew.length < newBudget && (fi < newForward.length || ri < newReverse.length)) {
    if (fi < newForward.length) { selectedNew.push(newForward[fi++]); if (selectedNew.length >= newBudget) break; }
    if (ri < newReverse.length) { selectedNew.push(newReverse[ri++]); if (selectedNew.length >= newBudget) break; }
  }

  // Build session array: due first, then new
  const sessionCards = [
    ...dueForward.map(({ _overdueBy, _direction, ...c }) => ({ target: c.target, direction: _direction })),
    ...dueReverse.map(({ _overdueBy, _direction, ...c }) => ({ target: c.target, direction: _direction })),
    ...selectedNew.map(({ _direction, ...c }) => ({ target: c.target, direction: _direction })),
  ];

  return {
    date: today,
    langId,
    cardKeys: sessionCards.map(c => c.target),
    cardDirections: sessionCards.map(c => c.direction),
    index: 0,
    results: { got: 0, almost: 0, missed: 0 },
    newCardsUsed: priorNewUsed + selectedNew.length,
  };
}
