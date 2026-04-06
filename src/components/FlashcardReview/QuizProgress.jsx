import { useT } from '../../i18n';

export default function QuizProgress({ remaining }) {
  const t = useT();
  return (
    <div className="flashcard-progress">
      <span className="flashcard-progress__count text-muted">
        {t('flashcard.remaining', { count: remaining })}
      </span>
    </div>
  );
}
