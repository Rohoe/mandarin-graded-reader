import { getLessonTitle } from '../../lib/languages';
import { useT } from '../../i18n';
import GenerationProgress from '../GenerationProgress';
import Skeleton from '../Skeleton';

export default function ReaderGeneratingState({ lessonMeta, langId, targetLength }) {
  const t = useT();
  return (
    <div className="reader-view reader-view--generating">
      <div className="reader-view__pregenerate card card-padded">
        {lessonMeta && (
          <>
            <p className="reader-view__lesson-num text-subtle font-display">{t('reader.lessonNum', { number: lessonMeta.lesson_number })}</p>
            <h2 className="text-target-title reader-view__lesson-title">{getLessonTitle(lessonMeta, langId)}</h2>
            <p className="reader-view__lesson-en font-display text-muted">{lessonMeta.title_en}</p>
          </>
        )}
        <GenerationProgress type="reader" targetLength={targetLength} langId={langId} />
        <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton variant="title" />
          <Skeleton variant="text" lines={4} />
          <Skeleton variant="text" lines={3} />
          <Skeleton variant="card" />
        </div>
      </div>
    </div>
  );
}
