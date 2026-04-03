import confetti from 'canvas-confetti';

/**
 * Fire a celebration confetti burst.
 * @param {'major' | 'normal'} intensity
 */
export function fireCelebration(intensity = 'normal') {
  // Respect prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  if (intensity === 'major') {
    // Dual burst from both sides
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.3, y: 0.6 }, disableForReducedMotion: true });
    confetti({ particleCount: 80, spread: 70, origin: { x: 0.7, y: 0.6 }, disableForReducedMotion: true });
  } else {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.65 }, disableForReducedMotion: true });
  }
}

/**
 * Determine confetti intensity based on milestone type.
 */
export function getMilestoneIntensity(milestone) {
  if (!milestone) return 'normal';
  // Major milestones: vocab >= 100 thresholds, streak >= 30
  if (milestone.id?.includes('vocab_100') || milestone.id?.includes('vocab_200') ||
      milestone.id?.includes('vocab_500') || milestone.id?.includes('vocab_1000') ||
      milestone.id?.includes('streak_30') || milestone.id?.includes('streak_60') ||
      milestone.id?.includes('streak_100')) {
    return 'major';
  }
  return 'normal';
}
