import { useState, useMemo, useCallback } from 'react';
import { useT } from '../../i18n';
import { useQuizMode } from '../../hooks/useQuizMode';
import { filterFillBlankCards } from './quizFilters';
import { shuffle } from '../../lib/shuffle';
import QuizDoneScreen from './QuizDoneScreen';
import QuizFeedback from './QuizFeedback';
import QuizProgress from './QuizProgress';
import QuizEmpty from './QuizEmpty';

/**
 * Context Clue mode — multiple-choice fill-in-the-blank.
 * Shows an example sentence with the target blanked out + 4 MC options.
 */
export default function ContextClueMode({ cards, onJudge, onClose, singleCard, onComplete }) {
  const t = useT();
  const [selected, setSelected] = useState(null);

  const resetSelected = useCallback(() => setSelected(null), []);

  const { index, revealed, results, activeCards, card, done, reveal, handleNext } = useQuizMode({
    cards, singleCard, onJudge, onClose, onComplete,
    filterCards: filterFillBlankCards,
    extraResets: resetSelected,
  });

  // Build blanked sentence
  const blankedSentence = useMemo(() => {
    if (!card) return '';
    return card.fillSentence.replace(card.target, '______');
  }, [card]);

  // Build 4 options: correct + 3 distractors from other cards
  const options = useMemo(() => {
    if (!card) return [];
    // In singleCard mode, draw distractors from the full cards array
    const pool = singleCard ? cards : activeCards;
    const otherTargets = pool
      .filter(c => c.target !== card.target)
      .map(c => c.target);

    const distractors = shuffle(otherTargets).slice(0, 3);

    // Place correct answer at random position
    return shuffle([...distractors, card.target]);
  }, [card, activeCards, singleCard, cards, index]);

  const handleSelect = useCallback((option) => {
    if (revealed || !card) return;
    setSelected(option);
    reveal(option === card.target ? 'got' : 'missed');
  }, [card, revealed, reveal]);

  if (activeCards.length === 0) {
    return <QuizEmpty className="quiz-context__empty" messageKey="flashcard.noContextClueCards" />;
  }

  if (done) {
    return <QuizDoneScreen titleKey="flashcard.contextClueComplete" results={results} onClose={onClose} />;
  }

  return (
    <div className="quiz-context">
      <QuizProgress remaining={activeCards.length - index} />

      <p className="text-muted" style={{ fontSize: 'var(--text-sm)', textAlign: 'center' }}>
        {t('flashcard.chooseTheWord')}
      </p>

      <div className="quiz-fillblank__sentence text-target">
        {blankedSentence}
      </div>

      <div className="quiz-context__options">
        {options.map((option, i) => {
          let cls = 'quiz-context__option';
          if (revealed) {
            if (option === card.target) cls += ' quiz-context__option--correct';
            else if (option === selected) cls += ' quiz-context__option--incorrect';
          } else if (option === selected) {
            cls += ' quiz-context__option--selected';
          }
          return (
            <button
              key={`${index}-${i}`}
              className={cls}
              onClick={() => handleSelect(option)}
              disabled={revealed}
            >
              <span className="text-target">{option}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <QuizFeedback
          isCorrect={selected === card.target}
          answer={card.target}
          answerExtra={card.translation && <span className="text-muted"> — {card.translation}</span>}
          onNext={handleNext}
          className="quiz-context__feedback"
        />
      )}
    </div>
  );
}
