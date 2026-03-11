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
  // "All done for today" — no cards at all or index beyond deck
  if (totalCards === 0 || (phase !== 'done' && cardIdx >= totalCards)) {
    return (
      <div className="flashcard-done">
        <h3 className="font-display flashcard-done__title">All done for today!</h3>
        <p className="text-muted">No cards due for review right now.</p>
        {masteryStats.dueTomorrow > 0 && (
          <p className="text-muted flashcard-forecast">
            {masteryStats.dueTomorrow} card{masteryStats.dueTomorrow !== 1 ? 's' : ''} due tomorrow
          </p>
        )}
        <div className="flashcard-done__actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  // "Session Complete" — all cards reviewed
  return (
    <div className="flashcard-done">
      <h3 className="font-display flashcard-done__title">Session Complete</h3>
      <div className="flashcard-done__stats">
        <span className="flashcard-done__stat flashcard-done__stat--got">{session.results.got} correct</span>
        <span className="flashcard-done__stat flashcard-done__stat--almost">{session.results.almost} almost</span>
        <span className="flashcard-done__stat flashcard-done__stat--missed">{session.results.missed} missed</span>
      </div>
      <p className="text-muted">
        {session.results.got} card{session.results.got !== 1 ? 's' : ''} completed
        {totalCards > session.results.got && ` in ${totalCards} attempts`}
      </p>

      {/* Mastery breakdown */}
      <div className="flashcard-mastery">
        <div className="flashcard-mastery__bar">
          {masteryStats.mastered > 0 && (
            <div
              className="flashcard-mastery__segment flashcard-mastery__segment--mastered"
              style={{ flex: masteryStats.mastered }}
              title={`${masteryStats.mastered} mastered`}
            />
          )}
          {masteryStats.learning > 0 && (
            <div
              className="flashcard-mastery__segment flashcard-mastery__segment--learning"
              style={{ flex: masteryStats.learning }}
              title={`${masteryStats.learning} learning`}
            />
          )}
          {masteryStats.new > 0 && (
            <div
              className="flashcard-mastery__segment flashcard-mastery__segment--new"
              style={{ flex: masteryStats.new }}
              title={`${masteryStats.new} new`}
            />
          )}
        </div>
        <div className="flashcard-mastery__labels">
          <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--mastered"></span>{masteryStats.mastered} mastered</span>
          <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--learning"></span>{masteryStats.learning} learning</span>
          <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--new"></span>{masteryStats.new} new</span>
        </div>
      </div>

      {/* Next review forecast */}
      {(masteryStats.dueTomorrow > 0 || masteryStats.dueIn3Days > 0) && (
        <p className="text-muted flashcard-forecast">
          {masteryStats.dueTomorrow > 0 && `${masteryStats.dueTomorrow} due tomorrow`}
          {masteryStats.dueTomorrow > 0 && masteryStats.dueIn3Days > masteryStats.dueTomorrow && ', '}
          {masteryStats.dueIn3Days > masteryStats.dueTomorrow && `${masteryStats.dueIn3Days} in 3 days`}
        </p>
      )}

      <div className="flashcard-done__actions">
        {history.length > 0 && (
          <button className="btn btn-ghost btn-sm flashcard-undo" onClick={onUndo} title="Undo last judgment (Ctrl+Z)">
            ↩ Undo
          </button>
        )}
        {hasMoreCards ? (
          <button className="btn btn-secondary btn-sm" onClick={onNextSession}>Start next session</button>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={onNewSession}>New session</button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
