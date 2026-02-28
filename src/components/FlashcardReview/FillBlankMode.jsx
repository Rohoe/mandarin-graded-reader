import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

/**
 * Fill-in-the-blank quiz mode.
 * Shows an example sentence with the target word blanked out.
 * User types the answer, gets immediate feedback.
 */
export default function FillBlankMode({ cards, onJudge, onClose }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ correct: 0, incorrect: 0 });
  const inputRef = useRef(null);

  // Filter to cards that have example sentences
  const eligibleCards = useMemo(
    () => cards.filter(c => c.exampleSentence && c.exampleSentence.includes(c.target)),
    [cards]
  );

  const card = eligibleCards[index] || null;
  const done = index >= eligibleCards.length;

  // Build blanked sentence
  const blankedSentence = useMemo(() => {
    if (!card) return '';
    return card.exampleSentence.replace(
      card.target,
      '_'.repeat(card.target.length)
    );
  }, [card]);

  useEffect(() => {
    if (!revealed && inputRef.current) inputRef.current.focus();
  }, [index, revealed]);

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

  if (eligibleCards.length === 0) {
    return (
      <div className="quiz-fillblank__empty">
        <p className="text-muted">No cards with example sentences available for fill-in-the-blank.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flashcard-done">
        <h3 className="font-display flashcard-done__title">Fill-in-the-Blank Complete</h3>
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
    <div className="quiz-fillblank">
      <div className="flashcard-progress">
        <span className="flashcard-progress__count text-muted">
          {eligibleCards.length - index} remaining
        </span>
      </div>

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
          placeholder="Type the missing word…"
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
        <div className="quiz-fillblank__feedback">
          {input.trim() === card.target ? (
            <span className="quiz-fillblank__correct">Correct!</span>
          ) : (
            <span className="quiz-fillblank__incorrect">
              Answer: <strong className="text-target">{card.target}</strong>
              {card.translation && <span className="text-muted"> — {card.translation}</span>}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleNext}>Next</button>
        </div>
      )}
    </div>
  );
}
