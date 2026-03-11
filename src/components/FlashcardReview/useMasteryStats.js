import { useMemo } from 'react';
import { getMasteryLevel } from './srs';

/**
 * Computes mastery statistics (mastered/learning/new counts and review forecast)
 * from the filtered language cards.
 * @param {Array} langCards - Array of card objects for the current language
 * @returns {{ mastered: number, learning: number, new: number, total: number, dueTomorrow: number, dueIn3Days: number }}
 */
export function useMasteryStats(langCards) {
  return useMemo(() => {
    let mastered = 0, learning = 0, newCount = 0;
    for (const card of langCards) {
      const level = getMasteryLevel(card, 'forward');
      if (level === 'mastered') mastered++;
      else if (level === 'learning') learning++;
      else newCount++;
    }

    // Compute next review forecast
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    let dueTomorrow = 0, dueIn3Days = 0;
    for (const card of langCards) {
      if (!card.nextReview) continue;
      const nr = new Date(card.nextReview).getTime();
      if (nr > now.getTime() && nr <= tomorrow.getTime()) dueTomorrow++;
      if (nr > now.getTime() && nr <= in3Days.getTime()) dueIn3Days++;
    }

    return { mastered, learning, new: newCount, total: langCards.length, dueTomorrow, dueIn3Days };
  }, [langCards]);
}
