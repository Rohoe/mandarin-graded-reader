/**
 * FlashcardCard — the individual card display with flip and rating buttons.
 * Handles both forward (target -> translation) and reverse (translation -> target) directions.
 */
export default function FlashcardCard({
  currentCard,
  currentDirection,
  phase,
  totalCards,
  cardIdx,
  previews,
  history,
  romanizationOn,
  romanizer,
  renderRomanization,
  onReveal,
  onJudge,
  onUndo,
}) {
  return (
    <>
      <div className="flashcard-progress">
        <span className="flashcard-progress__count text-muted">
          {totalCards - cardIdx} remaining
        </span>
        {history.length > 0 && (
          <button className="btn btn-ghost btn-sm flashcard-undo" onClick={onUndo} title="Undo last judgment (Ctrl+Z)">
            ↩ Undo
          </button>
        )}
      </div>

      <div className="flashcard-card" data-lang={currentCard?.langId}>
        {currentDirection === 'forward' ? (
          /* Forward card: target on front */
          <>
            <div className="flashcard-card__front">
              <span className="flashcard-card__target text-target">
                {romanizationOn && romanizer && currentCard ? renderRomanization(currentCard.target, 'fc') : currentCard?.target}
              </span>
            </div>

            {phase === 'back' && (
              <div className="flashcard-card__back">
                {currentCard?.romanization && (
                  <span className="flashcard-card__romanization text-muted">{currentCard.romanization}</span>
                )}
                <span className="flashcard-card__translation">{currentCard?.translation}</span>
                {currentCard?.exampleSentence && (
                  <span className="flashcard-card__example text-muted">{currentCard.exampleSentence}</span>
                )}
              </div>
            )}
          </>
        ) : (
          /* Reverse card: translation on front */
          <>
            <div className="flashcard-card__front flashcard-card__front--reverse">
              <span className="flashcard-card__translation-front">{currentCard?.translation}</span>
              <span className="flashcard-card__recall-hint text-muted">Recall the word</span>
            </div>

            {phase === 'back' && (
              <div className="flashcard-card__back">
                <span className="flashcard-card__target text-target">{currentCard?.target}</span>
                {currentCard?.romanization && (
                  <span className="flashcard-card__romanization text-muted">{currentCard.romanization}</span>
                )}
                {currentCard?.exampleSentence && (
                  <span className="flashcard-card__example text-muted">{currentCard.exampleSentence}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {phase === 'front' ? (
        <div className="flashcard-actions">
          <button className="btn btn-secondary" onClick={onReveal}>Show Answer</button>
        </div>
      ) : (
        <div className="flashcard-actions">
          <button className="btn btn-sm flashcard-btn--got" onClick={() => onJudge('got')}>
            Got it
            <span className="flashcard-btn__interval">{previews.got}</span>
          </button>
          <button className="btn btn-sm flashcard-btn--almost" onClick={() => onJudge('almost')}>
            Almost
            <span className="flashcard-btn__interval">{previews.almost}</span>
          </button>
          <button className="btn btn-sm flashcard-btn--missed" onClick={() => onJudge('missed')}>
            Missed it
            <span className="flashcard-btn__interval">{previews.missed}</span>
          </button>
        </div>
      )}
    </>
  );
}
