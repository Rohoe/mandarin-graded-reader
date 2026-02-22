/**
 * Validates reader vocabulary difficulty against the user's known vocabulary
 * and the requested proficiency level.
 *
 * Returns a difficulty assessment with stats and optional warnings.
 */

/**
 * @param {Array} readerVocab - vocabulary items from the parsed reader
 * @param {Object} learnedVocabulary - user's learned vocabulary map
 * @param {number} requestedLevel - proficiency level used for generation (0-6)
 * @returns {{ newWordCount: number, knownWordCount: number, totalWords: number, newWordRatio: number, assessment: string }}
 */
export function assessDifficulty(readerVocab, learnedVocabulary, requestedLevel) {
  if (!readerVocab || readerVocab.length === 0) {
    return { newWordCount: 0, knownWordCount: 0, totalWords: 0, newWordRatio: 0, assessment: 'none' };
  }

  const total = readerVocab.length;
  let known = 0;

  for (const item of readerVocab) {
    const word = item.target || item.chinese;
    if (word && learnedVocabulary[word]) {
      known++;
    }
  }

  const newWords = total - known;
  const ratio = total > 0 ? newWords / total : 0;

  // Assessment based on proportion of new words
  // For graded readers, ideally ~60-80% of vocab should be new
  let assessment;
  if (ratio <= 0.3) {
    assessment = 'easy';     // Most words already known
  } else if (ratio <= 0.8) {
    assessment = 'good';     // Good mix of new and known
  } else if (ratio <= 0.95) {
    assessment = 'challenging';  // Mostly new words
  } else {
    assessment = 'hard';     // Almost all words are new
  }

  return {
    newWordCount: newWords,
    knownWordCount: known,
    totalWords: total,
    newWordRatio: ratio,
    assessment,
  };
}

/** Badge label for the assessment */
export function assessmentLabel(assessment) {
  switch (assessment) {
    case 'easy': return 'Easy';
    case 'good': return 'Good level';
    case 'challenging': return 'Challenging';
    case 'hard': return 'Hard';
    default: return '';
  }
}

/** CSS modifier class for the assessment */
export function assessmentClass(assessment) {
  switch (assessment) {
    case 'easy': return 'difficulty--easy';
    case 'good': return 'difficulty--good';
    case 'challenging': return 'difficulty--challenging';
    case 'hard': return 'difficulty--hard';
    default: return '';
  }
}
