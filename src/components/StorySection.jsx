import { useState } from 'react';
import { createPortal } from 'react-dom';
import { parseStorySegments } from '../lib/parser';

function stripMarkdown(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}

export default function StorySection({
  storyParagraphs,
  pinyinOn,
  renderChars,
  ttsSupported,
  speakingKey,
  speakText,
  lookupVocab,
  handleVocabClick,
  activeVocab,
  popoverRef,
  getPopoverPosition,
  paragraphTranslations,
  onTranslate,
  translatingIndex,
  showTranslateButtons,
}) {
  const [visibleTranslations, setVisibleTranslations] = useState(new Set());

  function handleTranslateClick(e, index, para) {
    e.stopPropagation();
    const cached = paragraphTranslations && paragraphTranslations[index];
    if (cached) {
      setVisibleTranslations(prev => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    } else {
      setVisibleTranslations(prev => new Set(prev).add(index));
      onTranslate(index, para);
    }
  }

  return (
    <div className="reader-view__story-section">
      <div className={`reader-view__story text-target ${pinyinOn ? 'reader-view__story--pinyin' : ''}`}>
        {storyParagraphs.map((para, pi) => {
          const paraKey = `para-${pi}`;
          const isSpeaking = speakingKey === paraKey;
          const isTranslating = translatingIndex === pi;
          const translation = paragraphTranslations && paragraphTranslations[pi];
          const showTranslation = visibleTranslations.has(pi) && translation;
          return (
            <div key={pi} className="reader-view__para-wrapper">
              <p
                className={`reader-view__paragraph ${ttsSupported ? 'reader-view__paragraph--tts' : ''} ${isSpeaking ? 'reader-view__paragraph--speaking' : ''}`}
                onClick={ttsSupported ? () => speakText(stripMarkdown(para), paraKey) : undefined}
                title={ttsSupported ? (isSpeaking ? 'Stop' : 'Click to listen') : undefined}
              >
                {parseStorySegments(para).map((seg, i) => {
                  if (seg.type === 'bold') {
                    const entry = lookupVocab(seg.content);
                    if (entry) {
                      return (
                        <button
                          key={i}
                          className="reader-view__vocab-btn"
                          onClick={(e) => handleVocabClick(e, entry)}
                        >
                          {renderChars(seg.content, `${pi}-b${i}`)}
                        </button>
                      );
                    }
                    return (
                      <strong key={i} className="reader-view__vocab">
                        {renderChars(seg.content, `${pi}-b${i}`)}
                      </strong>
                    );
                  }
                  if (seg.type === 'italic') return <em key={i}>{renderChars(seg.content, `${pi}-em${i}`)}</em>;
                  return <span key={i}>{renderChars(seg.content, `${pi}-s${i}`)}</span>;
                })}
                {showTranslateButtons && (
                  <button
                    className={`reader-view__translate-btn ${isTranslating ? 'reader-view__translate-btn--loading' : ''} ${showTranslation ? 'reader-view__translate-btn--active' : ''}`}
                    onClick={(e) => handleTranslateClick(e, pi, para)}
                    disabled={isTranslating}
                    title={showTranslation ? 'Hide translation' : 'Translate to English'}
                    aria-label={showTranslation ? 'Hide translation' : 'Translate to English'}
                  >
                    EN
                  </button>
                )}
              </p>
              {showTranslation && (
                <div className="reader-view__translation">
                  <p className="reader-view__translation-text">{translation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {activeVocab && createPortal(
        <div ref={popoverRef} className="reader-view__popover" style={getPopoverPosition(activeVocab.rect)}>
          <span className="reader-view__popover-chinese text-target">{activeVocab.word.chinese}</span>
          <span className="reader-view__popover-pinyin">{activeVocab.word.pinyin}</span>
          <span className="reader-view__popover-english">{activeVocab.word.english}</span>
        </div>,
        document.body
      )}
    </div>
  );
}
