import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../context/useAppSelector';
import { actions } from '../context/actions';
import { checkMilestones } from '../lib/milestones';
import { fireCelebration, getMilestoneIntensity } from '../lib/confetti';

/**
 * Checks for newly-earned milestones and manages a display queue.
 * Auto-dismisses after 6 seconds.
 */
export function useMilestoneCheck() {
  const dispatch = useAppDispatch();
  const act = useMemo(() => actions(dispatch), [dispatch]);
  const state = useAppSelector(s => ({
    learnedVocabulary: s.learnedVocabulary,
    learningActivity: s.learningActivity,
    syllabi: s.syllabi,
    shownMilestones: s.shownMilestones,
  }));

  const [activeMilestone, setActiveMilestone] = useState(null);
  const activeMilestoneRef = useRef(null);
  const queueRef = useRef([]);
  const timerRef = useRef(null);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setActiveMilestone(null);
      activeMilestoneRef.current = null;
      return;
    }
    const next = queueRef.current.shift();
    setActiveMilestone(next);
    activeMilestoneRef.current = next;
    act.markMilestoneShown(next.id);
    fireCelebration(getMilestoneIntensity(next));

    // Auto-dismiss after 6s
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveMilestone(null);
      activeMilestoneRef.current = null;
      // Show next in queue after a brief gap — use function ref to avoid stale closure
      setTimeout(() => showNextRef.current(), 300);
    }, 6000);
  }, [act]);

  // Ref to avoid stale closure in timer callbacks
  const showNextRef = useRef(showNext);
  showNextRef.current = showNext;

  // Check for new milestones when relevant state changes
  useEffect(() => {
    const newMilestones = checkMilestones(state);
    if (newMilestones.length > 0) {
      queueRef.current = [...queueRef.current, ...newMilestones];
      if (!activeMilestoneRef.current) {
        showNext();
      }
    }
  }, [state.learnedVocabulary, state.learningActivity, state.syllabi, showNext]);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setActiveMilestone(null);
    activeMilestoneRef.current = null;
    setTimeout(() => showNextRef.current(), 300);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return { activeMilestone, dismiss };
}
