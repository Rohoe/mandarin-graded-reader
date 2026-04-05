import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { splitParagraphIntoSentences } from '../lib/sentenceSplitter';
import { stripMarkdown } from '../lib/renderInline';
import { getNativeLang } from '../lib/nativeLanguages';
import { getLang } from '../lib/languages';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useT } from '../i18n';
import { Volume2, Square } from 'lucide-react';

const LANG_LOCALE = { zh: 'zh', yue: 'zh', ko: 'ko', fr: 'fr', es: 'es', en: 'en' };

/**
 * Splits a text segment into individual word spans with hover/click behavior.
 * Falls back to a plain span if Intl.Segmenter is unavailable.
 */
function WordSegments({ text, langId, sentence, renderChars, keyPrefix, onWordClick, tag: Tag }) {
  const segments = useMemo(() => segmentWordsInline(text, langId), [text, langId]);

  if (!segments) {
    const inner = <span>{renderChars(text, keyPrefix)}</span>;
    return Tag ? <Tag>{inner}</Tag> : inner;
  }

  const nodes = segments.map((seg, i) => {
    if (!seg.isWordLike) {
      return <span key={`p${i}`}>{renderChars(seg.segment, `${keyPrefix}-p${i}`)}</span>;
    }
    return (
      <span
        key={i}
        className="reader-view__word"
        onClick={(e) => { e.stopPropagation(); onWordClick && onWordClick(e, seg.segment, sentence); }}
      >
        {renderChars(seg.segment, `${keyPrefix}-w${i}`)}
      </span>
    );
  });

  return Tag ? <Tag>{nodes}</Tag> : <>{nodes}</>;
}

function segmentWordsInline(text, langId) {
  if (typeof Intl.Segmenter !== 'function') return null;
  const locale = LANG_LOCALE[langId];
  if (!locale) return null;
  try {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    return [...segmenter.segment(text)];
  } catch { return null; }
}

export default function StorySection({
  storyParagraphs,
  pinyinOn,
  renderChars,
  showParagraphTools,
  langId,
  nativeLang,
  romanizer,
  // Grouped props
  ttsProps: { ttsSupported, speakingKey, speakText } = {},
  vocabProps: { lookupVocab, handleVocabClick, activeVocab, onCloseVocab } = {},
  popoverProps: { popoverRef, getPopoverPosition, selectionPopover, selectionPopoverRef, sentencePopover, highlightedSentence, sentencePopoverRef, onWordClick, onSentenceEndClick, onCloseSelection, onCloseSentence } = {},
  translationProps: { paragraphTranslations, onTranslate, translatingIndex } = {},
}) {
  const t = useT();
  const nativeLangConfig = getNativeLang(nativeLang);
  const [visibleTranslations, setVisibleTranslations] = useState(new Set());

  const sentenceEndRegex = useMemo(() => {
    const cfg = getLang(langId);
    return cfg?.sentenceEndRegex || null;
  }, [langId]);

  // Focus traps for popovers
  const stableCloseVocab = useCallback(() => onCloseVocab?.(), [onCloseVocab]);
  const stableCloseSelection = useCallback(() => onCloseSelection?.(), [onCloseSelection]);
  const stableCloseSentence = useCallback(() => onCloseSentence?.(), [onCloseSentence]);
  useFocusTrap(popoverRef, !!activeVocab, stableCloseVocab);
  useFocusTrap(selectionPopoverRef, !!selectionPopover, stableCloseSelection);
  useFocusTrap(sentencePopoverRef, !!sentencePopover, stableCloseSentence);

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

  /** Check if a segment is sentence-ending punctuation */
  function isSentenceEndPunctuation(seg, segIndex, segments) {
    if (seg.type !== 'text') return false;
    if (segIndex !== segments.length - 1) return false;
    if (!sentenceEndRegex) return false;
    return sentenceEndRegex.test(seg.content) && seg.content.length <= 2;
  }

  /** Get romanization string for text */
  function getRomanization(text) {
    if (!romanizer) return null;
    try { return romanizer.romanize(text).join(''); } catch { return null; }
  }

  /** Render the unified popover content (shared by word-click, sentence-click, and selection popovers) */
  function renderPopoverContent(text, romanization, translation, ttsKey) {
    const isSpeaking = speakingKey === ttsKey;
    return (
      <>
        <div className="popover-tts-row">
          <span className="reader-view__popover-chinese text-target">{text}</span>
          {ttsSupported && (
            <button
              className={`popover-tts-btn${isSpeaking ? ' popover-tts-btn--active' : ''}`}
              onClick={(e) => { e.stopPropagation(); speakText(text, ttsKey); }}
              title={isSpeaking ? t('story.stop') : t('story.listen')}
              aria-label={isSpeaking ? t('story.stopSpeaking') : t('story.listenToWord')}
            >
              {isSpeaking ? <Square size={12} /> : 'TTS'}
            </button>
          )}
        </div>
        {romanization && (
          <span className="reader-view__popover-pinyin">{romanization}</span>
        )}
        <span className="reader-view__popover-english">
          {translation || '\u2026'}
        </span>
      </>
    );
  }

  return (
    <section className="reader-view__story-section" role="article" aria-label="Story content">
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
                {sentences.map((sentence, si) => {
                  const isHighlighted = highlightedSentence?.pi === pi && highlightedSentence?.si === si;
                  return (
                    <span key={si} className={`reader-view__sentence${isHighlighted ? ' reader-view__sentence--highlighted' : ''}`}>
                      {sentence.segments.map((seg, i) => {
                        // Sentence-ending punctuation — clickable for sentence translation
                        if (isSentenceEndPunctuation(seg, i, sentence.segments)) {
                          return (
                            <span
                              key={i}
                              className="reader-view__sentence-end"
                              onClick={(e) => onSentenceEndClick?.(e, sentence, pi, si)}
                            >
                              {seg.content}
                            </span>
                          );
                        }
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
                        if (seg.type === 'italic') {
                          return <WordSegments key={i} text={seg.content} langId={langId} sentence={sentence} renderChars={renderChars} keyPrefix={`${pi}-${si}-em${i}`} onWordClick={onWordClick} tag="em" />;
                        }
                        return <WordSegments key={i} text={seg.content} langId={langId} sentence={sentence} renderChars={renderChars} keyPrefix={`${pi}-${si}-s${i}`} onWordClick={onWordClick} />;
                      })}
                    </span>
                  );
                })}
                {showParagraphTools && ttsSupported && (
                  <button
                    className={`reader-view__para-tts-btn ${isSpeaking ? 'reader-view__para-tts-btn--active' : ''}`}
                    onClick={(e) => handleTtsClick(e, para, paraKey)}
                    title={isSpeaking ? t('story.stop') : t('story.listen')}
                    aria-label={isSpeaking ? t('story.stopSpeaking') : t('story.listenToParagraph')}
                  >
                    {isSpeaking ? <Square size={12} /> : 'TTS'}
                  </button>
                )}
                {showParagraphTools && (
                  <button
                    className={`reader-view__translate-btn ${isTranslating ? 'reader-view__translate-btn--loading' : ''} ${showTranslation ? 'reader-view__translate-btn--active' : ''}`}
                    onClick={(e) => handleTranslateClick(e, pi, para)}
                    disabled={isTranslating}
                    title={showTranslation ? t('story.hideTranslation') : t('story.translateTo', { lang: nativeLangConfig.name })}
                    aria-label={showTranslation ? t('story.hideTranslation') : t('story.translateTo', { lang: nativeLangConfig.name })}
                  >
                    {nativeLangConfig.shortLabel}
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
      {/* Vocab popover (bold vocab words) */}
      {activeVocab && createPortal(
        <div ref={popoverRef} className="reader-view__popover" role="dialog" aria-label="Vocabulary details" style={getPopoverPosition(activeVocab.rect)}>
          {renderPopoverContent(
            activeVocab.word.target || activeVocab.word.chinese,
            activeVocab.word.romanization || activeVocab.word.pinyin,
            activeVocab.word.translation || activeVocab.word.english,
            `vocab-${activeVocab.word.target || activeVocab.word.chinese}`
          )}
        </div>,
        document.body
      )}
      {/* Selection popover (drag-to-select) — same unified style */}
      {selectionPopover && createPortal(
        <div ref={selectionPopoverRef} className="reader-view__popover" role="dialog" aria-label="Selection translation" style={getPopoverPosition(selectionPopover.rect)}>
          {renderPopoverContent(
            selectionPopover.text,
            selectionPopover.romanization,
            selectionPopover.translation,
            `sel-${selectionPopover.text}`
          )}
        </div>,
        document.body
      )}
      {/* Word / sentence popover (click word or sentence-end punctuation) — same unified style */}
      {sentencePopover && createPortal(
        <div ref={sentencePopoverRef} className="reader-view__popover" role="dialog" aria-label={sentencePopover.mode === 'sentence' ? 'Sentence translation' : 'Word translation'} style={getPopoverPosition(sentencePopover.rect, sentencePopover.mode === 'sentence' ? 300 : 220)}>
          {renderPopoverContent(
            sentencePopover.text,
            sentencePopover.mode === 'word' ? getRomanization(sentencePopover.text) : null,
            sentencePopover.translation,
            sentencePopover.mode === 'sentence' ? `sent-${sentencePopover.pi}-${sentencePopover.si}` : `word-${sentencePopover.text}`
          )}
        </div>,
        document.body
      )}
    </section>
  );
}
