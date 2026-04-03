import { getLessonTitle } from '../../lib/languages';
import { useT } from '../../i18n';
import Skeleton from '../Skeleton';

export default function ReaderEvictedState({ lessonMeta, langId, restoring, onRestore }) {
  const t = useT();
  return (
    <div className="reader-view reader-view--pregenerate">
      <div className="reader-view__pregenerate card card-padded">
        {lessonMeta && (
          <>
            <p className="reader-view__lesson-num text-subtle font-display">{t('reader.lessonNum', { number: lessonMeta.lesson_number })}</p>
            <h2 className="text-target-title reader-view__lesson-title">{getLessonTitle(lessonMeta, langId)}</h2>
            <p className="reader-view__lesson-en font-display text-muted">{lessonMeta.title_en}</p>
          </>
        )}
        <p className="text-muted" style={{ textAlign: 'center', margin: 'var(--space-4) 0' }}>
          {t('reader.evicted.message')}
        </p>
        <button
          className="btn btn-primary btn-lg reader-view__generate-btn"
          onClick={onRestore}
          disabled={restoring}
        >
          {restoring ? t('reader.evicted.restoring') : t('reader.evicted.restore')}
        </button>
        {restoring && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Skeleton variant="title" />
            <Skeleton variant="text" lines={3} />
          </div>
        )}
      </div>
    </div>
  );
}
