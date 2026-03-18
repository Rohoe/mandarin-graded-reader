/**
 * LLM API integration for learning plan features.
 */

import { getLang } from './languages';
import { getNativeLang } from './nativeLanguages';
import { callLLM } from './api';
import { buildAssessmentPrompt } from '../prompts/assessmentPrompt';
import { buildWeeklyPlanPrompt } from '../prompts/weeklyPlanPrompt';
import { buildLearnerProfile } from './stats';
import { parseJSONWithFallback } from './apiUtils';

/**
 * Generate a placement assessment for a language.
 * @returns {{ snippets: Array, instructions: string }}
 */
export async function generateAssessment(llmConfig, langId, nativeLang = 'en') {
  const langConfig = getLang(langId);
  const nativeLangName = getNativeLang(nativeLang).name;
  const prompt = buildAssessmentPrompt(langConfig, nativeLangName);

  const raw = await callLLM(llmConfig, '', prompt, 2048);
  return parseJSONWithFallback(raw, 'LLM returned an invalid assessment format. Please try again.');
}

/**
 * Generate a weekly plan.
 * @returns {{ theme: string, adaptationNotes: string, days: Array }}
 */
export async function generateWeeklyPlan(llmConfig, plan, state) {
  const langConfig = getLang(plan.langId);
  const nativeLangName = getNativeLang(plan.nativeLang || 'en').name;

  const weekNumber = (plan.weekHistory || []).length + 1;
  const priorWeekSummary = buildWeeklySummary(plan);
  const learnerProfile = buildLearnerProfile(
    state.learnedVocabulary,
    state.generatedReaders,
    state.syllabi,
    state.learningActivity,
    plan.langId,
  );

  const prompt = buildWeeklyPlanPrompt(
    langConfig, plan, weekNumber, priorWeekSummary, learnerProfile, nativeLangName,
  );

  const raw = await callLLM(llmConfig, '', prompt, 4096);
  const result = parseJSONWithFallback(raw, 'LLM returned an invalid weekly plan format. Please try again.');

  // Normalize: assign IDs to activities
  const now = Date.now();
  if (result.days && Array.isArray(result.days)) {
    for (let dayIndex = 0; dayIndex < result.days.length; dayIndex++) {
      const day = result.days[dayIndex];
      if (day.activities && Array.isArray(day.activities)) {
        day.activities = day.activities.map((a, i) => ({
          ...a,
          id: `activity_${now}_${dayIndex}_${i}`,
          status: 'pending',
          completedAt: null,
          actualMinutes: null,
          estimatedMinutes: a.estimatedMinutes || 15,
          config: a.config || {},
        }));
      } else {
        day.activities = [];
      }
    }
  }

  // Ensure exactly 7 days
  while ((result.days || []).length < 7) {
    (result.days = result.days || []).push({ activities: [] });
  }

  return result;
}

/**
 * Build a summary of the prior week for context in the next week's prompt.
 */
export function buildWeeklySummary(plan) {
  const history = plan.weekHistory || [];
  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const parts = [];
  parts.push(`Week ${history.length}: ${last.theme || 'No theme'}`);
  parts.push(`Completed ${last.completedCount}/${last.totalCount} activities`);
  parts.push(`${last.minutesSpent || 0} minutes spent`);

  return parts.join('. ');
}
