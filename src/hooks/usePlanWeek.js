/**
 * Manages the weekly plan lifecycle:
 * - Detects new week
 * - Generates plan via LLM
 * - Shows confirmation before committing
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../context/useAppSelector';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { buildLLMConfig } from '../lib/llmConfig';
import { generateWeeklyPlan } from '../lib/planApi';
import { isNewWeek, getCurrentMonday } from '../lib/planScheduler';

export function usePlanWeek(planId) {
  const plan = useAppSelector(s => s.learningPlans[planId]);
  const { state } = useApp();
  const dispatch = useAppDispatch();
  const act = actions(dispatch);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const generatedRef = useRef(false);

  // Auto-detect new week on mount
  useEffect(() => {
    if (!plan || generatedRef.current) return;
    if (plan.currentWeek && !isNewWeek(plan.currentWeek)) return;

    // Don't auto-generate if there's no API key
    if (!state.apiKey) return;

    // If there's an old week that wasn't archived, archive it first
    if (plan.currentWeek && isNewWeek(plan.currentWeek)) {
      act.archiveWeek(planId);
    }

    // Don't auto-generate — let user trigger manually from the dashboard
    // The dashboard shows a "Generate first week" or "Generate new week" button
  }, [planId]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerate = useCallback(async () => {
    if (!plan || generating) return;

    setGenerating(true);
    setError(null);
    generatedRef.current = true;

    try {
      // Archive current week if it exists and is from a previous week
      if (plan.currentWeek && isNewWeek(plan.currentWeek)) {
        act.archiveWeek(planId);
      }

      const llmConfig = buildLLMConfig(state);
      const result = await generateWeeklyPlan(llmConfig, plan, state);

      const week = {
        weekOf: getCurrentMonday(),
        generatedAt: Date.now(),
        confirmed: false,
        theme: result.theme || '',
        days: result.days.map((d, i) => ({
          dayIndex: i,
          activities: d.activities || [],
        })),
      };

      act.setPlanWeek(planId, week);

      // Store adaptation notes
      if (result.adaptationNotes) {
        act.updatePlan(planId, { adaptationNotes: result.adaptationNotes });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [plan, planId, generating, state]); // eslint-disable-line react-hooks/exhaustive-deps

  return { generating, error, regenerate };
}
