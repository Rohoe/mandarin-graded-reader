import { useT } from '../i18n';

export default function ReaderActions({ isDemo, isCompleted, onMarkComplete, onUnmarkComplete, lessonKey, confirmRegen, setConfirmRegen, handleRegenConfirm, onContinueStory, reader, lessonMeta, isPending, langId }) {
  const t = useT();
  return (
    <>
      {/* Mark complete */}
      {!isDemo && !isCompleted && onMarkComplete && (
        <div className="reader-view__complete-row">
          <button className="btn btn-primary reader-view__complete-btn" onClick={onMarkComplete}>{lessonKey?.startsWith('standalone_') ? t('reader.actions.markComplete') : t('reader.actions.markLessonComplete')}</button>
        </div>
      )}
      {isCompleted && (
        <div className="reader-view__completed-badge">
          <span>{lessonKey?.startsWith('standalone_') ? `✓ ${t('reader.actions.completed')}` : `✓ ${t('reader.actions.lessonCompleted')}`}</span>
          {onUnmarkComplete && (
            <button className="btn btn-ghost btn-sm reader-view__unmark-btn" onClick={onUnmarkComplete}>{t('common.undo')}</button>
          )}
        </div>
      )}

      {/* Regenerate */}
      {!isDemo && (
        <div className="reader-view__regen-row">
          {confirmRegen ? (
            <>
              <span className="reader-view__regen-prompt text-muted">{t('reader.actions.replaceReader')}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(false)}>{t('common.cancel')}</button>
              <button className="btn btn-sm reader-view__regen-confirm-btn" onClick={handleRegenConfirm}>{t('reader.actions.regenerate')}</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(true)}>{t('reader.actions.regenerateReader')}</button>
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
            {t('reader.actions.nextEpisode')}
          </button>
        </div>
      )}
    </>
  );
}
