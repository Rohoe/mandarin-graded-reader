import { createPortal } from 'react-dom';

function stripMarkdown(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

function ControlButtons({ pinyinOn, setPinyinOn, ttsSupported, speakingKey, speakText, stopSpeaking, storyText, langConfig }) {
  const romanizationLabel = langConfig.romanizationLabel;
  return (
    <>
      <button
        className={`btn btn-ghost btn-sm reader-view__tts-btn ${pinyinOn ? 'reader-view__tts-btn--active' : ''}`}
        onClick={() => setPinyinOn(v => !v)}
        title={pinyinOn ? `Hide ${langConfig.romanizationName}` : `Show ${langConfig.romanizationName}`}
        aria-label={pinyinOn ? `Hide ${langConfig.romanizationName}` : `Show ${langConfig.romanizationName}`}
      >
        {romanizationLabel}
      </button>
      {ttsSupported && (
        <button
          className={`btn btn-ghost btn-sm reader-view__tts-btn ${speakingKey === 'story' ? 'reader-view__tts-btn--active' : ''}`}
          onClick={() => speakingKey ? (window.speechSynthesis.cancel(), stopSpeaking()) : speakText(stripMarkdown(storyText), 'story')}
          title={speakingKey ? 'Stop' : 'Listen to story'}
          aria-label={speakingKey ? 'Stop' : 'Listen to story'}
        >
          {speakingKey ? '⏹' : '🔊'}
        </button>
      )}
    </>
  );
}

export default function ReaderControls({ headerVisible, pinyinOn, setPinyinOn, ttsSupported, speakingKey, speakText, stopSpeaking, storyText, langConfig }) {
  const props = { pinyinOn, setPinyinOn, ttsSupported, speakingKey, speakText, stopSpeaking, storyText, langConfig };

  return (
    <>
      {headerVisible && (
        <div className="reader-view__header-actions">
          <ControlButtons {...props} />
        </div>
      )}
      {!headerVisible && createPortal(
        <div className="reader-view__header-actions reader-view__header-actions--floating">
          <ControlButtons {...props} />
        </div>,
        document.body
      )}
    </>
  );
}
