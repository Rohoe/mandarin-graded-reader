import { useT } from '../../i18n';

export default function QuizDoneScreen({ titleKey, results, onClose, extraStats }) {
  const t = useT();
  return (
    <div className="flashcard-done">
      <h3 className="font-display flashcard-done__title">{t(titleKey)}</h3>
      <div className="flashcard-done__stats">
        <span className="flashcard-done__stat flashcard-done__stat--got">{t('flashcard.correct', { count: results.correct })}</span>
        {extraStats}
        <span className="flashcard-done__stat flashcard-done__stat--missed">{t('flashcard.incorrect', { count: results.incorrect })}</span>
      </div>
      <div className="flashcard-done__actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.close')}</button>
      </div>
    </div>
  );
}
