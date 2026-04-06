import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useT } from '../../i18n';
import { useQuizMode } from '../../hooks/useQuizMode';
import { filterFillBlankCards } from './quizFilters';
import QuizDoneScreen from './QuizDoneScreen';
import QuizFeedback from './QuizFeedback';
import QuizProgress from './QuizProgress';
import QuizEmpty from './QuizEmpty';

/**
 * Fill-in-the-blank quiz mode.
 * Shows an example sentence with the target word blanked out.
 * User types the answer, gets immediate feedback.
 */
export default function FillBlankMode({ cards, onJudge, onClose, singleCard, onComplete }) {
  const t = useT();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const resetInput = useCallback(() => setInput(''), []);

  const { index, revealed, results, activeCards, card, done, reveal, handleNext } = useQuizMode({
    cards, singleCard, onJudge, onClose, onComplete,
    filterCards: filterFillBlankCards,
    extraResets: resetInput,
  });

  // Build blanked sentence
  const blankedSentence = useMemo(() => {
    if (!card) return '';
    return card.fillSentence.replace(card.target, '_'.repeat(card.target.length));
  }, [card]);

  useEffect(() => {
    if (!revealed && inputRef.current) inputRef.current.focus();
  }, [index, revealed]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (revealed || !card) return;
    reveal(input.trim() === card.target ? 'got' : 'missed');
  }, [input, card, revealed, reveal]);

  if (activeCards.length === 0) {
    return <QuizEmpty className="quiz-fillblank__empty" messageKey="flashcard.noFillBlankCards" />;
  }

  if (done) {
    return <QuizDoneScreen titleKey="flashcard.fillBlankComplete" results={results} onClose={onClose} />;
  }

  return (
    <div className="quiz-fillblank">
      <QuizProgress remaining={activeCards.length - index} />

      <div className="quiz-fillblank__sentence text-target">
        {blankedSentence}
      </div>

      <form onSubmit={handleSubmit} className="quiz-fillblank__form">
        <input
          ref={inputRef}
          type="text"
          className="quiz-fillblank__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('flashcard.typeMissingWord')}
          disabled={revealed}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {!revealed && (
          <button type="submit" className="btn btn-secondary btn-sm">{t('common.check')}</button>
        )}
      </form>

      {revealed && (
        <QuizFeedback
          isCorrect={input.trim() === card.target}
          answer={card.target}
          answerExtra={card.translation && <span className="text-muted"> — {card.translation}</span>}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
