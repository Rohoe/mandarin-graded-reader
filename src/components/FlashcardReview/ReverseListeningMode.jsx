import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useT } from '../../i18n';
import { useQuizMode } from '../../hooks/useQuizMode';
import QuizDoneScreen from './QuizDoneScreen';
import QuizFeedback from './QuizFeedback';
import QuizProgress from './QuizProgress';
import QuizEmpty from './QuizEmpty';

const filterTranslationCards = (cards, singleCard) => {
  if (singleCard) return singleCard.translation ? [singleCard] : [];
  return cards.filter(c => c.translation);
};

/**
 * Reverse Listening mode.
 * Shows the target word, user types the translation.
 * Tests meaning recall (reverse direction → updates reverse SRS fields).
 */
export default function ReverseListeningMode({ cards, onJudge, onClose, singleCard, onComplete }) {
  const t = useT();
  const [input, setInput] = useState('');
  const [judgment, setJudgment] = useState(null);
  const inputRef = useRef(null);

  const resetReverseState = useCallback(() => {
    setInput('');
    setJudgment(null);
  }, []);

  const { index, revealed, results, activeCards, card, done, reveal, handleNext } = useQuizMode({
    cards, singleCard, onJudge, onClose, onComplete,
    direction: 'reverse',
    filterCards: filterTranslationCards,
    extraResets: resetReverseState,
    resultKeys: ['almost'],
  });

  useEffect(() => {
    if (!revealed && inputRef.current) inputRef.current.focus();
  }, [index, revealed]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (revealed || !card) return;

    const answer = input.trim().toLowerCase();
    const translation = card.translation.trim().toLowerCase();
    let j;

    if (answer === translation) {
      j = 'got';
    } else if (isCloseMatch(answer, translation)) {
      j = 'almost';
    } else {
      j = 'missed';
    }

    setJudgment(j);
    reveal(j);
  }, [input, card, revealed, reveal]);

  if (activeCards.length === 0) {
    return <QuizEmpty className="quiz-reverse__empty" messageKey="flashcard.noVocab" />;
  }

  if (done) {
    return (
      <QuizDoneScreen
        titleKey="flashcard.reverseListeningComplete"
        results={results}
        onClose={onClose}
        extraStats={results.almost > 0 && (
          <span className="flashcard-done__stat flashcard-done__stat--almost">{t('flashcard.almostResult', { count: results.almost })}</span>
        )}
      />
    );
  }

  return (
    <div className="quiz-reverse">
      <QuizProgress remaining={activeCards.length - index} />

      <div className="quiz-reverse__prompt">
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{t('flashcard.whatDoesThisMean')}</p>
        <div className="quiz-reverse__target text-target">{card.target}</div>
        {card.romanization && (
          <div className="quiz-reverse__romanization text-muted">{card.romanization}</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="quiz-reverse__form">
        <input
          ref={inputRef}
          type="text"
          className="quiz-fillblank__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('flashcard.typeTheTranslation')}
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
        <QuizFeedback onNext={handleNext}>
          {judgment === 'got' ? (
            <span className="quiz-fillblank__correct">{t('common.correct')}</span>
          ) : judgment === 'almost' ? (
            <span className="quiz-reverse__almost">
              {t('flashcard.closeMatch')} <strong>{card.translation}</strong>
            </span>
          ) : (
            <span className="quiz-fillblank__incorrect">
              {t('common.answer')} <strong>{card.translation}</strong>
            </span>
          )}
        </QuizFeedback>
      )}
    </div>
  );
}

/**
 * Check if the answer is a close match to the translation.
 * Close match: one is contained within the other AND the shorter is ≥60% of the longer.
 */
function isCloseMatch(answer, translation) {
  if (!answer || !translation) return false;
  const contains = answer.includes(translation) || translation.includes(answer);
  if (!contains) return false;
  const shorter = Math.min(answer.length, translation.length);
  const longer = Math.max(answer.length, translation.length);
  return shorter / longer >= 0.6;
}
