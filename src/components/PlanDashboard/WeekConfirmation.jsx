import { useT } from '../../i18n';
import WeekProgress from './WeekProgress';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WeekConfirmation({ plan, week, onConfirm, onRegenerate }) {
  const t = useT();

  let totalActivities = 0;
  let totalMinutes = 0;
  for (const day of week.days) {
    for (const a of day.activities) {
      totalActivities++;
      totalMinutes += a.estimatedMinutes || 0;
    }
  }

  return (
    <div className="week-confirmation fade-in">
      <h2 className="font-display week-confirmation__title">{t('plan.dashboard.weekReady')}</h2>

      {week.theme && (
        <p className="week-confirmation__theme">{week.theme}</p>
      )}

      <div className="week-confirmation__summary">
        <span>{totalActivities} {t('plan.dashboard.activities')}</span>
        <span>·</span>
        <span>~{totalMinutes} {t('plan.onboarding.minutes')}</span>
      </div>

      <div className="week-confirmation__days">
        {week.days.map((day, i) => (
          <div key={i} className="week-confirmation__day">
            <span className="week-confirmation__day-name">{DAY_NAMES[i]}</span>
            <div className="week-confirmation__day-activities">
              {day.activities.length === 0 ? (
                <span className="text-muted">{t('plan.dashboard.restDay')}</span>
              ) : (
                day.activities.map(a => (
                  <span key={a.id} className="week-confirmation__activity-chip" data-type={a.type}>
                    {a.title} ({a.estimatedMinutes}m)
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="week-confirmation__actions">
        <button className="btn btn-ghost" onClick={onRegenerate}>
          {t('plan.dashboard.regenerate')}
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          {t('plan.dashboard.startWeek')}
        </button>
      </div>
    </div>
  );
}
