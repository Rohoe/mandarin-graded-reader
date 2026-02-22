export default function ReaderActions({ isDemo, isCompleted, onMarkComplete, onUnmarkComplete, lessonKey, confirmRegen, setConfirmRegen, handleRegenConfirm, onContinueStory, reader, lessonMeta, isPending, langId }) {
  return (
    <>
      {/* Mark complete */}
      {!isDemo && !isCompleted && onMarkComplete && (
        <div className="reader-view__complete-row">
          <button className="btn btn-primary reader-view__complete-btn" onClick={onMarkComplete}>{lessonKey?.startsWith('standalone_') ? 'Mark Complete ✓' : 'Mark Lesson Complete ✓'}</button>
        </div>
      )}
      {isCompleted && (
        <div className="reader-view__completed-badge">
          <span>✓ {lessonKey?.startsWith('standalone_') ? 'Completed' : 'Lesson completed'}</span>
          {onUnmarkComplete && (
            <button className="btn btn-ghost btn-sm reader-view__unmark-btn" onClick={onUnmarkComplete}>Undo</button>
          )}
        </div>
      )}

      {/* Regenerate */}
      {!isDemo && (
        <div className="reader-view__regen-row">
          {confirmRegen ? (
            <>
              <span className="reader-view__regen-prompt text-muted">Replace this reader?</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(false)}>Cancel</button>
              <button className="btn btn-sm reader-view__regen-confirm-btn" onClick={handleRegenConfirm}>Regenerate</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(true)}>Regenerate reader</button>
          )}
        </div>
      )}

      {/* Continue story */}
      {!isDemo && onContinueStory && reader.story && !isPending && (
        <div className="reader-view__continue-row">
          <button
            className="btn btn-primary"
            onClick={() => onContinueStory({ story: reader.story, topic: reader.topic || lessonMeta?.title_en || 'story', level: reader.level ?? lessonMeta?.level ?? 3, langId })}
          >
            Next episode →
          </button>
        </div>
      )}
    </>
  );
}
