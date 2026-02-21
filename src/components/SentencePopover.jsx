import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getLang } from '../lib/languages';

const LANG_LOCALE = { zh: 'zh', yue: 'zh', ko: 'ko' };

function segmentWords(text, langId) {
  if (typeof Intl.Segmenter !== 'function') return null;
  const locale = LANG_LOCALE[langId];
  if (!locale) return null;
  try {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    return [...segmenter.segment(text)];
  } catch { return null; }
}

/** Render a text string with ruby annotations for each target-script character. */
function rubyAnnotate(text, romanizer, scriptRegex, keyPrefix) {
  const chars = [...text];
  let romArr;
  try { romArr = romanizer.romanize(text); } catch { return text; }
  const nodes = [];
  let nonTarget = '';
  let nonTargetStart = 0;
  for (let i = 0; i < chars.length; i++) {
    if (scriptRegex.test(chars[i])) {
      if (nonTarget) {
        nodes.push(<span key={`${keyPrefix}-t${nonTargetStart}`}>{nonTarget}</span>);
        nonTarget = '';
      }
      nodes.push(<ruby key={`${keyPrefix}-r${i}`}>{chars[i]}<rt>{romArr[i]}</rt></ruby>);
    } else {
      if (!nonTarget) nonTargetStart = i;
      nonTarget += chars[i];
    }
  }
  if (nonTarget) nodes.push(<span key={`${keyPrefix}-tend`}>{nonTarget}</span>);
  return nodes;
}

/**
 * Popover shown when a sentence is clicked.
 * Displays the original sentence with inline ruby romanization, and translation.
 */
export default function SentencePopover({
  sentencePopover,
  popoverRef,
  getPopoverPosition,
  romanizer,
  onSubSelection,
  langId,
}) {
  if (!sentencePopover) return null;

  const { sentenceText, rect, translation, subText, subTranslation } = sentencePopover;
  const style = getPopoverPosition(rect, 320);

  return createPortal(
    <SentencePopoverInner
      ref={popoverRef}
      sentenceText={sentenceText}
      translation={translation}
      subText={subText}
      subTranslation={subTranslation}
      style={style}
      onSubSelection={onSubSelection}
      langId={langId}
      romanizer={romanizer}
    />,
    document.body
  );
}

import { forwardRef } from 'react';

const SentencePopoverInner = forwardRef(function SentencePopoverInner(
  { sentenceText, translation, subText, subTranslation, style, onSubSelection, langId, romanizer },
  ref
) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const scriptRegex = useMemo(() => {
    const cfg = getLang(langId);
    return cfg?.scriptRegex || null;
  }, [langId]);

  const segments = useMemo(
    () => segmentWords(sentenceText, langId),
    [sentenceText, langId]
  );

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text && text !== sentenceText) {
      onSubSelection(text);
    }
  }, [sentenceText, onSubSelection]);

  // Listen for mouseup within the popover for sub-selection drill-down
  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    el.addEventListener('mouseup', handleMouseUp);
    return () => el.removeEventListener('mouseup', handleMouseUp);
  }, [ref, handleMouseUp]);

  const handleWordClick = useCallback((word) => {
    // Clear any text selection so it doesn't interfere
    window.getSelection()?.removeAllRanges();
    onSubSelection(word);
  }, [onSubSelection]);

  /** Render text for a single segment, with optional ruby annotations. */
  const renderSegText = (text, keyPrefix) => {
    if (romanizer && scriptRegex) {
      return rubyAnnotate(text, romanizer, scriptRegex, keyPrefix);
    }
    return text;
  };

  const renderSentenceText = () => {
    if (!segments) {
      return renderSegText(sentenceText, 'sp');
    }
    return segments.map((seg, i) => {
      if (!seg.isWordLike) return <span key={`p${i}`}>{renderSegText(seg.segment, `p${i}`)}</span>;
      return (
        <span
          key={i}
          className={`sentence-popover__word${hoveredIdx === i ? ' sentence-popover__word--hover' : ''}`}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
          onClick={(e) => { e.stopPropagation(); handleWordClick(seg.segment); }}
        >
          {renderSegText(seg.segment, `w${i}`)}
        </span>
      );
    });
  };

  return (
    <div ref={ref} className="reader-view__popover sentence-popover" style={style}>
      <span className={`sentence-popover__original text-target${romanizer ? ' sentence-popover__original--ruby' : ''}`}>
        {renderSentenceText()}
      </span>
      <span className="sentence-popover__translation">
        {translation || '\u2026'}
      </span>
      {subText && (
        <div className="sentence-popover__sub">
          <span className="sentence-popover__sub-label">
            {subText}: {subTranslation || '\u2026'}
          </span>
        </div>
      )}
    </div>
  );
});
