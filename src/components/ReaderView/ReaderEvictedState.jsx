import { getLessonTitle } from '../../lib/languages';

export default function ReaderEvictedState({ lessonMeta, langId, restoring, onRestore }) {
  return (
    <div className="reader-view reader-view--pregenerate">
      <div className="reader-view__pregenerate card card-padded">
        {lessonMeta && (
          <>
            <p className="reader-view__lesson-num text-subtle font-display">Lesson {lessonMeta.lesson_number}</p>
            <h2 className="text-target-title reader-view__lesson-title">{getLessonTitle(lessonMeta, langId)}</h2>
            <p className="reader-view__lesson-en font-display text-muted">{lessonMeta.title_en}</p>
          </>
        )}
        <p className="text-muted" style={{ textAlign: 'center', margin: 'var(--space-4) 0' }}>
          This reader was archived to free up browser storage.
        </p>
        <button
          className="btn btn-primary btn-lg reader-view__generate-btn"
          onClick={onRestore}
          disabled={restoring}
        >
          {restoring ? 'Restoring…' : 'Restore from backup'}
        </button>
      </div>
    </div>
  );
}
