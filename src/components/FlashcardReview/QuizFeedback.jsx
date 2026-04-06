import { useT } from '../../i18n';

/**
 * Shared feedback bar for quiz modes.
 * Shows correct/incorrect result + Next button.
 * Pass `children` for fully custom feedback content (e.g. ReverseListening's 3-level judgment).
 */
export default function QuizFeedback({ isCorrect, answer, answerExtra, onNext, className, children }) {
  const t = useT();
  return (
    <div className={className || 'quiz-fillblank__feedback'}>
      {children || (isCorrect ? (
        <span className="quiz-fillblank__correct">{t('common.correct')}</span>
      ) : (
        <span className="quiz-fillblank__incorrect">
          {t('common.answer')} <strong className="text-target">{answer}</strong>
          {answerExtra}
        </span>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={onNext}>{t('common.next')}</button>
    </div>
  );
}
