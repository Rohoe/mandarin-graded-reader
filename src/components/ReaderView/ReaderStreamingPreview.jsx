import { getLessonTitle } from '../../lib/languages';
import { useT } from '../../i18n';
import { useBufferedMarkdown } from '../../hooks/useBufferedMarkdown';

export default function ReaderStreamingPreview({ lessonMeta, langId, streamingText }) {
  const t = useT();
  const { rendered, partialVocab } = useBufferedMarkdown(streamingText);

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
          {rendered}<span className="reader-view__streaming-cursor" />
        </div>
        {partialVocab.length > 0 && (
          <StreamingVocab vocab={partialVocab} />
        )}
      </div>
    </div>
  );
}

function StreamingVocab({ vocab }) {
  return (
    <div className="streaming-vocab">
      <h3 className="streaming-vocab__title">Vocabulary</h3>
      <div className="streaming-vocab__list">
        {vocab.map((word, i) => (
          <div key={i} className="streaming-vocab__item">
            <span className="streaming-vocab__num">{i + 1}</span>
            <span className="streaming-vocab__target text-chinese">
              {word.target || word.chinese || word.korean}
            </span>
            <span className="streaming-vocab__rom text-muted">
              {word.romanization || word.pinyin || word.jyutping}
            </span>
            <span className="streaming-vocab__trans">
              {word.translation || word.english}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
