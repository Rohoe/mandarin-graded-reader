import { useState } from 'react';
import { createPortal } from 'react-dom';
import { splitParagraphIntoSentences } from '../lib/sentenceSplitter';
import SentencePopover from './SentencePopover';

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
  showParagraphTools,
  selectionPopover,
  selectionPopoverRef,
  langId,
  sentencePopover,
  sentencePopoverRef,
  onSentenceClick,
  onSubSelection,
  romanizer,
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

  function handleTtsClick(e, para, paraKey) {
    e.stopPropagation();
    speakText(stripMarkdown(para), paraKey);
  }

  function getSentencePopoverPosition(rect, width = 320) {
    const gap = 8;
    const popoverWidth = width;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));
    const preferAbove = rect.top - gap > 120;
    return {
      position: 'fixed',
      zIndex: 60,
      width: popoverWidth,
      left,
      ...(preferAbove ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
    };
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
          const sentences = splitParagraphIntoSentences(para, langId);
          return (
            <div key={pi} className="reader-view__para-wrapper">
              <p className={`reader-view__paragraph ${isSpeaking ? 'reader-view__paragraph--speaking' : ''}`}>
                {sentences.map((sentence, si) => (
                  <span
                    key={si}
                    className="reader-view__sentence"
                    onClick={(e) => onSentenceClick && onSentenceClick(e, sentence, pi)}
                  >
                    {sentence.segments.map((seg, i) => {
                      if (seg.type === 'bold') {
                        const entry = lookupVocab(seg.content);
                        if (entry) {
                          return (
                            <button
                              key={i}
                              className="reader-view__vocab-btn"
                              onClick={(e) => handleVocabClick(e, entry)}
                            >
                              {renderChars(seg.content, `${pi}-${si}-b${i}`)}
                            </button>
                          );
                        }
                        return (
                          <strong key={i} className="reader-view__vocab">
                            {renderChars(seg.content, `${pi}-${si}-b${i}`)}
                          </strong>
                        );
                      }
                      if (seg.type === 'italic') return <em key={i}>{renderChars(seg.content, `${pi}-${si}-em${i}`)}</em>;
                      return <span key={i}>{renderChars(seg.content, `${pi}-${si}-s${i}`)}</span>;
                    })}
                  </span>
                ))}
                {showParagraphTools && ttsSupported && (
                  <button
                    className={`reader-view__para-tts-btn ${isSpeaking ? 'reader-view__para-tts-btn--active' : ''}`}
                    onClick={(e) => handleTtsClick(e, para, paraKey)}
                    title={isSpeaking ? 'Stop' : 'Listen'}
                    aria-label={isSpeaking ? 'Stop speaking' : 'Listen to paragraph'}
                  >
                    {isSpeaking ? '■' : 'TTS'}
                  </button>
                )}
                {showParagraphTools && (
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
          <span className="reader-view__popover-chinese text-target">{activeVocab.word.target || activeVocab.word.chinese}</span>
          <span className="reader-view__popover-pinyin">{activeVocab.word.romanization || activeVocab.word.pinyin}</span>
          <span className="reader-view__popover-english">{activeVocab.word.translation || activeVocab.word.english}</span>
        </div>,
        document.body
      )}
      {selectionPopover && createPortal(
        <div ref={selectionPopoverRef} className="reader-view__popover reader-view__selection-popover" style={getPopoverPosition(selectionPopover.rect)}>
          <span className="reader-view__selection-text text-target">{selectionPopover.text}</span>
          {selectionPopover.romanization && (
            <span className="reader-view__selection-romanization">{selectionPopover.romanization}</span>
          )}
          <span className="reader-view__selection-translation">
            {selectionPopover.translation || '\u2026'}
          </span>
        </div>,
        document.body
      )}
      <SentencePopover
        sentencePopover={sentencePopover}
        popoverRef={sentencePopoverRef}
        getPopoverPosition={getSentencePopoverPosition}
        romanizer={romanizer}
        onSubSelection={onSubSelection}
        langId={langId}
        pinyinOn={pinyinOn}
      />
    </div>
  );
}
