import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../context/useAppSelector';
import { actions } from '../../context/actions';
import { useT } from '../../i18n';
import { getLang } from '../../lib/languages';
import { usePlanWeek } from '../../hooks/usePlanWeek';
import DayColumn from './DayColumn';
import WeekProgress from './WeekProgress';
import WeekConfirmation from './WeekConfirmation';
import './PlanDashboard.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlanDashboard({ planId, onActivityOpen, onOpenSettings }) {
  const plan = useAppSelector(s => s.learningPlans[planId]);
  const progress = useAppSelector(s => s.planProgress[planId]);
  const dispatch = useAppDispatch();
  const act = actions(dispatch);
  const t = useT();

  const { generating, error, regenerate } = usePlanWeek(planId);
  const [selectedDay, setSelectedDay] = useState(null);

  if (!plan) {
    return (
      <div className="plan-dashboard__empty">
        <p className="text-muted">{t('plan.dashboard.noPlan')}</p>
      </div>
    );
  }

  const langConfig = getLang(plan.langId);
  const week = plan.currentWeek;

  // Generating state
  if (generating) {
    return (
      <div className="plan-dashboard__loading">
        <div className="plan-dashboard__spinner" />
        <p>{t('plan.dashboard.generatingWeek')}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="plan-dashboard__error">
        <p>{t('plan.dashboard.generationError')}</p>
        <p className="text-muted">{error}</p>
        <button className="btn btn-primary" onClick={regenerate}>{t('common.retry')}</button>
        {onOpenSettings && (
          <button className="btn btn-ghost" onClick={onOpenSettings}>{t('plan.dashboard.checkSettings')}</button>
        )}
      </div>
    );
  }

  // No week yet
  if (!week) {
    return (
      <div className="plan-dashboard__empty">
        <h2 className="font-display">{t('plan.dashboard.welcomeTitle')}</h2>
        <p className="text-muted">{t('plan.dashboard.welcomeDesc')}</p>
        <div className="plan-dashboard__plan-info">
          <span>{langConfig.name}</span>
          <span>{langConfig.proficiency.levels.find(l => l.value === plan.currentLevel)?.label}</span>
          <span>{plan.dailyMinutes} {t('plan.onboarding.minutesPerDay')}</span>
        </div>
        <button className="btn btn-primary" onClick={regenerate}>
          {t('plan.dashboard.generateFirstWeek')}
        </button>
      </div>
    );
  }

  // Unconfirmed week — show confirmation
  if (!week.confirmed) {
    return (
      <WeekConfirmation
        plan={plan}
        week={week}
        onConfirm={() => act.confirmPlanWeek(planId)}
        onRegenerate={regenerate}
      />
    );
  }

  // Compute today's day index (0=Monday)
  const now = new Date();
  const todayDow = now.getDay();
  const todayIndex = todayDow === 0 ? 6 : todayDow - 1;
  const activeDayIndex = selectedDay ?? todayIndex;

  // Activity completion stats
  let completedCount = 0;
  let totalCount = 0;
  for (const day of week.days) {
    for (const a of day.activities) {
      totalCount++;
      if (a.status === 'completed') completedCount++;
    }
  }

  function handleActivityClick(dayIndex, activity) {
    if (activity.status === 'completed') return;
    // Mark in-progress
    act.updatePlanActivityStatus(planId, dayIndex, activity.id, 'in_progress');
    onActivityOpen?.({ planId, dayIndex, activity });
  }

  function handleSkip(dayIndex, activityId) {
    act.skipPlanActivity(planId, dayIndex, activityId);
  }

  function handleUndo(dayIndex, activityId) {
    act.uncompletePlanActivity(planId, dayIndex, activityId);
  }

  return (
    <div className="plan-dashboard">
      {/* Header */}
      <div className="plan-dashboard__header">
        <div>
          <h2 className="font-display plan-dashboard__title">{week.theme || t('plan.dashboard.weeklyPlan')}</h2>
          <p className="text-muted plan-dashboard__subtitle">
            {langConfig.proficiency.levels.find(l => l.value === plan.currentLevel)?.label}
            {plan.adaptationNotes && ` · ${plan.adaptationNotes}`}
          </p>
        </div>
        <WeekProgress completed={completedCount} total={totalCount} />
      </div>

      {/* Day tabs */}
      <div className="plan-dashboard__day-tabs" role="tablist">
        {DAY_NAMES.map((name, i) => {
          const dayActivities = week.days[i]?.activities || [];
          const dayDone = dayActivities.length > 0 && dayActivities.every(a => a.status === 'completed' || a.status === 'skipped');
          const isToday = i === todayIndex;
          return (
            <button
              key={i}
              role="tab"
              aria-selected={i === activeDayIndex}
              className={`plan-dashboard__day-tab ${i === activeDayIndex ? 'plan-dashboard__day-tab--active' : ''} ${isToday ? 'plan-dashboard__day-tab--today' : ''} ${dayDone ? 'plan-dashboard__day-tab--done' : ''}`}
              onClick={() => setSelectedDay(i)}
            >
              <span className="plan-dashboard__day-name">{name}</span>
              {dayDone && <span className="plan-dashboard__day-check">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Day content */}
      <DayColumn
        day={week.days[activeDayIndex]}
        dayIndex={activeDayIndex}
        dayName={DAY_NAMES[activeDayIndex]}
        isToday={activeDayIndex === todayIndex}
        onActivityClick={(activity) => handleActivityClick(activeDayIndex, activity)}
        onSkip={(activityId) => handleSkip(activeDayIndex, activityId)}
        onUndo={(activityId) => handleUndo(activeDayIndex, activityId)}
      />

      {/* Progress summary */}
      {progress && (
        <div className="plan-dashboard__stats">
          <div className="plan-dashboard__stat">
            <span className="plan-dashboard__stat-value">{progress.totalActivitiesCompleted}</span>
            <span className="plan-dashboard__stat-label">{t('plan.dashboard.activitiesDone')}</span>
          </div>
          <div className="plan-dashboard__stat">
            <span className="plan-dashboard__stat-value">{progress.totalMinutesSpent}</span>
            <span className="plan-dashboard__stat-label">{t('plan.dashboard.minutesSpent')}</span>
          </div>
          <div className="plan-dashboard__stat">
            <span className="plan-dashboard__stat-value">{(plan.weekHistory || []).length}</span>
            <span className="plan-dashboard__stat-label">{t('plan.dashboard.weeksCompleted')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
