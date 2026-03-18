import { useT } from '../../i18n';

const TYPE_ICONS = {
  reading: '📖',
  flashcards: '🃏',
  quiz: '✏️',
  tutor: '💬',
  review: '🔄',
};

const TYPE_LABELS = {
  reading: 'plan.activity.reading',
  flashcards: 'plan.activity.flashcards',
  quiz: 'plan.activity.quiz',
  tutor: 'plan.activity.tutor',
  review: 'plan.activity.review',
};

export default function ActivityCard({ activity, onClick, onSkip, onUndo }) {
  const t = useT();
  const { type, title, description, estimatedMinutes, status } = activity;
  const isCompleted = status === 'completed';
  const isSkipped = status === 'skipped';
  const isInProgress = status === 'in_progress';

  return (
    <div
      className={`activity-card ${isCompleted ? 'activity-card--completed' : ''} ${isSkipped ? 'activity-card--skipped' : ''} ${isInProgress ? 'activity-card--in-progress' : ''}`}
      onClick={!isCompleted && !isSkipped ? onClick : undefined}
      role={!isCompleted && !isSkipped ? 'button' : undefined}
      tabIndex={!isCompleted && !isSkipped ? 0 : undefined}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !isCompleted && !isSkipped) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="activity-card__icon">
        {isCompleted ? '✓' : TYPE_ICONS[type] || '•'}
      </div>
      <div className="activity-card__content">
        <div className="activity-card__header">
          <span className="activity-card__type">{t(TYPE_LABELS[type] || 'plan.activity.reading')}</span>
          <span className="activity-card__time">{estimatedMinutes} min</span>
        </div>
        <span className="activity-card__title">{title}</span>
        {description && <span className="activity-card__desc">{description}</span>}
      </div>
      {isCompleted && (
        <button
          className="activity-card__undo"
          onClick={e => { e.stopPropagation(); onUndo?.(); }}
          title={t('plan.dashboard.undo') || 'Undo'}
          aria-label={t('plan.dashboard.undo') || 'Undo'}
        >
          ↩
        </button>
      )}
      {!isCompleted && !isSkipped && (
        <button
          className="activity-card__skip"
          onClick={e => { e.stopPropagation(); onSkip?.(); }}
          title={t('plan.dashboard.skip')}
          aria-label={t('plan.dashboard.skip')}
        >
          ✕
        </button>
      )}
    </div>
  );
}
