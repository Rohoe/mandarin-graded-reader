import { useRef, useLayoutEffect, useState } from 'react';
import { useT } from '../../i18n';
import { isLeech } from './srs';

/**
 * FlashcardCard — the individual card display with 3D flip and rating buttons.
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
  const t = useT();
  const showLeech = currentCard && isLeech(currentCard, currentDirection);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [minHeight, setMinHeight] = useState(160);

  // Measure both faces and set container min-height to the taller one
  useLayoutEffect(() => {
    const frontH = frontRef.current?.scrollHeight || 0;
    const backH = backRef.current?.scrollHeight || 0;
    setMinHeight(Math.max(frontH, backH, 160));
  }, [currentCard, phase, currentDirection]);

  const isFlipped = phase === 'back';

  return (
    <>
      <div className="flashcard-progress">
        <span className="flashcard-progress__count text-muted">
          {t('flashcard.remaining', { count: totalCards - cardIdx })}
        </span>
        {history.length > 0 && (
          <button className="btn btn-ghost btn-sm flashcard-undo" onClick={onUndo} title={t('flashcard.undoTooltip')}>
            {t('flashcard.undoBtn')}
          </button>
        )}
      </div>

      <div className="flashcard-card-container" style={{ minHeight }}>
        <div className={`flashcard-card-inner ${isFlipped ? 'flashcard-card-inner--flipped' : ''}`} data-lang={currentCard?.langId}>
          {/* Front face */}
          <div ref={frontRef} className="flashcard-card-face flashcard-card-face--front" aria-hidden={isFlipped}>
            {showLeech && (
              <span className="flashcard-leech-badge" title={t('flashcard.leechHint')}>{t('flashcard.leechBadge')}</span>
            )}
            {currentDirection === 'forward' ? (
              <span className="flashcard-card__target text-target">
                {romanizationOn && romanizer && currentCard ? renderRomanization(currentCard.target, 'fc') : currentCard?.target}
              </span>
            ) : (
              <div className="flashcard-card__front--reverse">
                <span className="flashcard-card__translation-front">{currentCard?.translation}</span>
                <span className="flashcard-card__recall-hint text-muted">{t('flashcard.recallTheWord')}</span>
              </div>
            )}
          </div>

          {/* Back face */}
          <div ref={backRef} className="flashcard-card-face flashcard-card-face--back" aria-hidden={!isFlipped}>
            {currentDirection === 'forward' ? (
              <>
                {currentCard?.romanization && (
                  <span className="flashcard-card__romanization text-muted">{currentCard.romanization}</span>
                )}
                <span className="flashcard-card__translation">{currentCard?.translation}</span>
              </>
            ) : (
              <>
                <span className="flashcard-card__target text-target">{currentCard?.target}</span>
                {currentCard?.romanization && (
                  <span className="flashcard-card__romanization text-muted">{currentCard.romanization}</span>
                )}
              </>
            )}
            {(currentCard?.exampleSentence || currentCard?.exampleExtra) && (
              <div className="flashcard-card__examples">
                {currentCard.exampleSentence && (
                  <div className="flashcard-card__example-pair">
                    <span className="flashcard-card__example text-muted">{currentCard.exampleSentence}</span>
                    {currentCard.exampleSentenceTranslation && (
                      <span className="flashcard-card__example-translation text-muted">{currentCard.exampleSentenceTranslation}</span>
                    )}
                  </div>
                )}
                {currentCard.exampleExtra && (
                  <div className="flashcard-card__example-pair">
                    <span className="flashcard-card__example text-muted">{currentCard.exampleExtra}</span>
                    {currentCard.exampleExtraTranslation && (
                      <span className="flashcard-card__example-translation text-muted">{currentCard.exampleExtraTranslation}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {phase === 'front' ? (
        <div className="flashcard-actions">
          <button className="btn btn-secondary" onClick={onReveal}>{t('flashcard.showAnswer')}</button>
        </div>
      ) : (
        <div className="flashcard-actions">
          <button className="btn btn-sm flashcard-btn--got" onClick={() => onJudge('got')}>
            {t('flashcard.gotIt')}
            <span className="flashcard-btn__interval">{previews.got}</span>
          </button>
          <button className="btn btn-sm flashcard-btn--almost" onClick={() => onJudge('almost')}>
            {t('flashcard.almost')}
            <span className="flashcard-btn__interval">{previews.almost}</span>
          </button>
          <button className="btn btn-sm flashcard-btn--missed" onClick={() => onJudge('missed')}>
            {t('flashcard.missedIt')}
            <span className="flashcard-btn__interval">{previews.missed}</span>
          </button>
        </div>
      )}
    </>
  );
}
