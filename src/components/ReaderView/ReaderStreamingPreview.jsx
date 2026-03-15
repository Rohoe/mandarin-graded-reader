import { getLessonTitle } from '../../lib/languages';
import { useT } from '../../i18n';

export default function ReaderStreamingPreview({ lessonMeta, langId, streamingText }) {
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
        <div className="reader-view__streaming-text text-target">
          {streamingText}<span className="reader-view__streaming-cursor" />
        </div>
      </div>
    </div>
  );
}
