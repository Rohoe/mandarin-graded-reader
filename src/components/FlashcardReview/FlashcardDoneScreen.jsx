import { useT } from '../../i18n';

/**
 * FlashcardDoneScreen — the "review complete" summary screen shown when
 * a flashcard session finishes or when no cards are due.
 */
export default function FlashcardDoneScreen({
  phase,
  totalCards,
  cardIdx,
  session,
  masteryStats,
  history,
  hasMoreCards,
  onUndo,
  onNextSession,
  onNewSession,
  onClose,
}) {
  const t = useT();

  // "All done for today" — no cards at all or index beyond deck
  if (totalCards === 0 || (phase !== 'done' && cardIdx >= totalCards)) {
    return (
      <div className="flashcard-done">
        <h3 className="font-display flashcard-done__title">{t('flashcard.allDone')}</h3>
        <p className="text-muted">{t('flashcard.noCardsDue')}</p>
        {masteryStats.dueTomorrow > 0 && (
          <p className="text-muted flashcard-forecast">
            {masteryStats.dueTomorrow === 1 ? t('flashcard.cardDueTomorrow') : t('flashcard.cardsDueTomorrow', { count: masteryStats.dueTomorrow })}
          </p>
        )}
        <div className="flashcard-done__actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    );
  }

  // "Session Complete" — all cards reviewed
  return (
    <div className="flashcard-done">
      <h3 className="font-display flashcard-done__title">{t('flashcard.sessionComplete')}</h3>
      <div className="flashcard-done__stats">
        <span className="flashcard-done__stat flashcard-done__stat--got">{t('flashcard.correct', { count: session.results.got })}</span>
        <span className="flashcard-done__stat flashcard-done__stat--almost">{t('flashcard.almostResult', { count: session.results.almost })}</span>
        <span className="flashcard-done__stat flashcard-done__stat--missed">{t('flashcard.missed', { count: session.results.missed })}</span>
      </div>
      <p className="text-muted">
        {session.results.got === 1 ? t('flashcard.cardCompleted') : t('flashcard.cardsCompleted', { count: session.results.got })}
        {totalCards > session.results.got && ` ${t('flashcard.inAttempts', { count: totalCards })}`}
      </p>

      {/* Mastery breakdown */}
      <div className="flashcard-mastery">
        <div className="flashcard-mastery__bar">
          {masteryStats.mastered > 0 && (
            <div
              className="flashcard-mastery__segment flashcard-mastery__segment--mastered"
              style={{ flex: masteryStats.mastered }}
              title={t('flashcard.mastered', { count: masteryStats.mastered })}
            />
          )}
          {masteryStats.learning > 0 && (
            <div
              className="flashcard-mastery__segment flashcard-mastery__segment--learning"
              style={{ flex: masteryStats.learning }}
              title={t('flashcard.learning', { count: masteryStats.learning })}
            />
          )}
          {masteryStats.new > 0 && (
            <div
              className="flashcard-mastery__segment flashcard-mastery__segment--new"
              style={{ flex: masteryStats.new }}
              title={t('flashcard.newCards', { count: masteryStats.new })}
            />
          )}
        </div>
        <div className="flashcard-mastery__labels">
          <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--mastered"></span>{t('flashcard.mastered', { count: masteryStats.mastered })}</span>
          <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--learning"></span>{t('flashcard.learning', { count: masteryStats.learning })}</span>
          <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--new"></span>{t('flashcard.newCards', { count: masteryStats.new })}</span>
        </div>
      </div>

      {/* Next review forecast */}
      {(masteryStats.dueTomorrow > 0 || masteryStats.dueIn3Days > 0) && (
        <p className="text-muted flashcard-forecast">
          {masteryStats.dueTomorrow > 0 && t('flashcard.dueTomorrow', { count: masteryStats.dueTomorrow })}
          {masteryStats.dueTomorrow > 0 && masteryStats.dueIn3Days > masteryStats.dueTomorrow && ', '}
          {masteryStats.dueIn3Days > masteryStats.dueTomorrow && t('flashcard.dueIn3Days', { count: masteryStats.dueIn3Days })}
        </p>
      )}

      <div className="flashcard-done__actions">
        {history.length > 0 && (
          <button className="btn btn-ghost btn-sm flashcard-undo" onClick={onUndo} title={t('flashcard.undoTooltip')}>
            {t('flashcard.undoBtn')}
          </button>
        )}
        {hasMoreCards ? (
          <button className="btn btn-secondary btn-sm" onClick={onNextSession}>{t('flashcard.startNextSession')}</button>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={onNewSession}>{t('flashcard.newSession')}</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('common.close')}</button>
      </div>
    </div>
  );
}
