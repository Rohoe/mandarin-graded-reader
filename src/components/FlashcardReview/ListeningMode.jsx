import { useState, useCallback, useEffect, useRef } from 'react';
import { useT } from '../../i18n';
import { useQuizMode } from '../../hooks/useQuizMode';
import QuizDoneScreen from './QuizDoneScreen';
import QuizFeedback from './QuizFeedback';
import QuizProgress from './QuizProgress';
import QuizEmpty from './QuizEmpty';

/**
 * Listening quiz mode.
 * Plays the target word via TTS, user types what they hear.
 */
export default function ListeningMode({ cards, onJudge, onClose, speakText, singleCard, onComplete }) {
  const t = useT();
  const [input, setInput] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const inputRef = useRef(null);

  const resetListeningState = useCallback(() => {
    setInput('');
    setHasPlayed(false);
    setHintRevealed(false);
  }, []);

  const { index, revealed, results, activeCards, card, done, reveal, handleNext } = useQuizMode({
    cards, singleCard, onJudge, onClose, onComplete,
    extraResets: resetListeningState,
  });

  // Auto-play on new card
  useEffect(() => {
    if (card && !hasPlayed && speakText) {
      speakText(card.target, `listening-${index}`);
      setHasPlayed(true);
    }
  }, [index, card, hasPlayed, speakText]);

  useEffect(() => {
    if (!revealed && inputRef.current) inputRef.current.focus();
  }, [index, revealed]);

  const handleReplay = useCallback(() => {
    if (card && speakText) {
      speakText(card.target, `listening-${index}`);
    }
  }, [card, speakText, index]);

  const handlePlaySlow = useCallback(() => {
    if (card && speakText) {
      speakText(card.target, `listening-slow-${index}`, { rate: 0.5 });
    }
  }, [card, speakText, index]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (revealed || !card) return;
    reveal(input.trim() === card.target ? 'got' : 'missed');
  }, [input, card, revealed, reveal]);

  if (activeCards.length === 0) {
    return <QuizEmpty className="quiz-listening__empty" messageKey="flashcard.noListeningCards" />;
  }

  if (done) {
    return <QuizDoneScreen titleKey="flashcard.listeningComplete" results={results} onClose={onClose} />;
  }

  return (
    <div className="quiz-listening">
      <QuizProgress remaining={activeCards.length - index} />

      <div className="quiz-listening__prompt">
        <div className="quiz-listening__controls">
          <button className="btn btn-secondary quiz-listening__play" onClick={handleReplay} aria-label="Play audio">
            <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>&#9654;</span>
            <span>{t('flashcard.playAgain')}</span>
          </button>
          <button className="btn btn-ghost btn-sm quiz-listening__slow" onClick={handlePlaySlow} aria-label="Play slow">
            <span aria-hidden="true">&#128034;</span> {t('flashcard.playSlow')}
          </button>
        </div>
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{t('flashcard.typeWhatYouHear')}</p>
        {!revealed && !hintRevealed && card.translation && (
          <button className="btn btn-ghost btn-sm quiz-listening__hint" onClick={() => setHintRevealed(true)}>
            {t('flashcard.showHint')}
          </button>
        )}
        {!revealed && hintRevealed && (
          <p className="quiz-listening__hint-text text-muted">{card.translation}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="quiz-listening__form">
        <input
          ref={inputRef}
          type="text"
          className="quiz-listening__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('flashcard.typeTheWord')}
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
          answerExtra={<>{card.romanization && <span className="text-muted"> ({card.romanization})</span>}{card.translation && <span className="text-muted"> — {card.translation}</span>}</>}
          onNext={handleNext}
          className="quiz-listening__feedback"
        />
      )}
    </div>
  );
}
