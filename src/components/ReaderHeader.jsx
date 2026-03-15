import { getLessonTitle } from '../lib/languages';
import { useT } from '../i18n';

export default function ReaderHeader({ reader, lessonMeta, langId, profBadge, storyText, ttsSupported, speakingKey, speakText, stopSpeaking }) {
  const t = useT();
  return (
    <header className="reader-view__header">
      <div className="reader-view__header-text">
        <div className="reader-view__meta text-subtle font-display">
          {reader.level && profBadge}
          {reader.topic && ` · ${reader.topic.charAt(0).toUpperCase() + reader.topic.slice(1)}`}
        </div>
        <h1 className="reader-view__title text-target-title">
          {reader.titleZh || getLessonTitle(lessonMeta, langId) || ''}
        </h1>
        {reader.titleEn && <p className="reader-view__title-en font-display text-muted">{reader.titleEn}</p>}
      </div>
      {ttsSupported && (
        <div className="reader-view__header-actions">
          <button
            className={`btn btn-ghost btn-sm reader-view__tts-btn ${speakingKey === 'story' ? 'reader-view__tts-btn--active' : ''}`}
            onClick={() => speakingKey ? (window.speechSynthesis.cancel(), stopSpeaking()) : speakText(storyText.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'), 'story')}
            title={speakingKey ? t('reader.header.stop') : t('reader.header.listenToStory')}
            aria-label={speakingKey ? t('reader.header.stop') : t('reader.header.listenToStory')}
          >
            {speakingKey ? '⏹' : '🔊'}
          </button>
        </div>
      )}
    </header>
  );
}
