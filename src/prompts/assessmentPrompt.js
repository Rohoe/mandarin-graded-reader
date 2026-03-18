/**
 * Placement assessment prompt — graduated snippets, returns recommended level.
 */
export function buildAssessmentPrompt(langConfig, nativeLangName = 'English') {
  const levels = langConfig.proficiency.levels;
  const profName = langConfig.proficiency.name;
  const langName = langConfig.name;

  const levelDescriptions = levels
    .map(l => `  - Level ${l.value}: ${l.label}`)
    .join('\n');

  return `You are a ${langName} language proficiency assessor.

Your task: generate a short placement assessment to determine a learner's ${profName} level. The learner's native language is ${nativeLangName}.

Create exactly ${Math.min(levels.length, 5)} short text snippets in ${langName}, each at a progressively harder ${profName} level. Each snippet should be 1-2 sentences.

Available levels:
${levelDescriptions}

For each snippet, ask the learner to rate their comprehension on a scale of 1-4:
1 = Cannot understand at all
2 = Understand a few words
3 = Understand the general meaning
4 = Understand completely

Return a JSON object with exactly two keys:
- "snippets": array of objects, each with:
  - "level": the ${profName} level number this snippet tests
  - "text": the ${langName} text snippet
  - "translation": ${nativeLangName} translation of the snippet
- "instructions": A brief ${nativeLangName} instruction telling the learner what to do

Return ONLY valid JSON. No explanation, no markdown fences.`;
}

/**
 * Parse assessment results to recommend a level.
 * @param {Array} ratings — array of { level, rating } from user
 * @param {Object} langConfig — language configuration
 * @returns {number} recommended proficiency level
 */
export function deriveAssessedLevel(ratings, langConfig) {
  if (!ratings || ratings.length === 0) {
    return langConfig.proficiency.levels[0].value;
  }

  // Find the highest level where the user scored >= 3 (understands meaning)
  let bestLevel = langConfig.proficiency.levels[0].value;

  const sorted = [...ratings].sort((a, b) => a.level - b.level);
  for (const { level, rating } of sorted) {
    if (rating >= 3) {
      bestLevel = level;
    } else if (rating <= 1) {
      // Can't understand at all — stop here
      break;
    }
  }

  return bestLevel;
}
