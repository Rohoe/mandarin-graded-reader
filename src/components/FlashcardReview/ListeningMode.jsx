import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

/**
 * Listening quiz mode.
 * Plays the target word via TTS, user types what they hear.
 */
export default function ListeningMode({ cards, onJudge, onClose, speakText }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });
  const [hasPlayed, setHasPlayed] = useState(false);
  const inputRef = useRef(null);

  const card = cards[index] || null;
  const done = index >= cards.length;

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

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (revealed || !card) return;
    setRevealed(true);
    const isCorrect = input.trim() === card.target;
    const judgment = isCorrect ? 'got' : 'missed';
    setResults(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));
    onJudge(card.target, judgment, 'forward');
  }, [input, card, revealed, onJudge]);

  const handleNext = useCallback(() => {
    setIndex(i => i + 1);
    setInput('');
    setRevealed(false);
    setHasPlayed(false);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (revealed && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNext();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [revealed, handleNext, onClose]);

  if (cards.length === 0) {
    return (
      <div className="quiz-listening__empty">
        <p className="text-muted">No cards available for listening practice.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flashcard-done">
        <h3 className="font-display flashcard-done__title">Listening Complete</h3>
        <div className="flashcard-done__stats">
          <span className="flashcard-done__stat flashcard-done__stat--got">{results.correct} correct</span>
          <span className="flashcard-done__stat flashcard-done__stat--missed">{results.incorrect} incorrect</span>
        </div>
        <div className="flashcard-done__actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-listening">
      <div className="flashcard-progress">
        <span className="flashcard-progress__count text-muted">
          {cards.length - index} remaining
        </span>
      </div>

      <div className="quiz-listening__prompt">
        <button className="btn btn-secondary quiz-listening__play" onClick={handleReplay} aria-label="Play audio">
          <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>&#9654;</span>
          <span>Play again</span>
        </button>
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>Type what you hear</p>
      </div>

      <form onSubmit={handleSubmit} className="quiz-listening__form">
        <input
          ref={inputRef}
          type="text"
          className="quiz-listening__input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type the word…"
          disabled={revealed}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {!revealed && (
          <button type="submit" className="btn btn-secondary btn-sm">Check</button>
        )}
      </form>

      {revealed && (
        <div className="quiz-listening__feedback">
          {input.trim() === card.target ? (
            <span className="quiz-fillblank__correct">Correct!</span>
          ) : (
            <span className="quiz-fillblank__incorrect">
              Answer: <strong className="text-target">{card.target}</strong>
              {card.romanization && <span className="text-muted"> ({card.romanization})</span>}
              {card.translation && <span className="text-muted"> — {card.translation}</span>}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleNext}>Next</button>
        </div>
      )}
    </div>
  );
}
