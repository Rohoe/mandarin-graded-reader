import { useState, useMemo, useCallback, useRef } from 'react';
import { useFlashcardKeyboard } from './useFlashcardKeyboard';

/**
 * Shared quiz mode state management hook.
 *
 * @param {object} options
 * @param {Array} options.cards — full card array
 * @param {object} [options.singleCard] — optional single card for QuizMix
 * @param {Function} options.onJudge — parent callback (target, judgment, direction) => void
 * @param {Function} options.onClose — close handler
 * @param {Function} [options.onComplete] — callback for singleCard mode
 * @param {'forward'|'reverse'} [options.direction='forward'] — SRS direction
 * @param {Function} [options.filterCards] — (cards, singleCard) => enrichedCards[]
 * @param {Function} [options.extraResets] — useCallback-wrapped reset for mode-specific state in handleNext
 * @param {string[]} [options.resultKeys] — extra result buckets (e.g. ['almost'])
 */
export function useQuizMode({
  cards,
  singleCard,
  onJudge,
  onClose,
  onComplete,
  direction = 'forward',
  filterCards,
  extraResets,
  resultKeys = [],
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Build initial results shape: { correct: 0, incorrect: 0, ...extraKeys }
  const initialResults = useMemo(() => {
    const base = { correct: 0, incorrect: 0 };
    for (const key of resultKeys) base[key] = 0;
    return base;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [results, setResults] = useState(initialResults);
  const lastJudgmentRef = useRef(null);

  const activeCards = useMemo(() => {
    if (filterCards) return filterCards(cards, singleCard);
    if (singleCard) return [singleCard];
    return cards;
  }, [cards, singleCard, filterCards]);

  const card = activeCards[index] || null;
  const done = !singleCard && index >= activeCards.length;

  /**
   * Mark the current card as revealed with a judgment.
   * Modes determine correctness and call reveal('got'|'missed'|'almost').
   */
  const reveal = useCallback((judgment) => {
    setRevealed(true);
    const bucket = judgment === 'got' ? 'correct' : judgment === 'missed' ? 'incorrect' : judgment;
    setResults(prev => ({ ...prev, [bucket]: prev[bucket] + 1 }));
    lastJudgmentRef.current = judgment;
    if (card) onJudge(card.target, judgment, direction);
  }, [card, onJudge, direction]);

  const handleNext = useCallback(() => {
    if (singleCard && onComplete) {
      onComplete(lastJudgmentRef.current);
      return;
    }
    setIndex(i => i + 1);
    setRevealed(false);
    extraResets?.();
  }, [singleCard, onComplete, extraResets]);

  useFlashcardKeyboard({ onClose, onNext: handleNext, enabled: revealed });

  return {
    index,
    revealed,
    results,
    lastJudgmentRef,
    activeCards,
    card,
    done,
    reveal,
    handleNext,
  };
}
