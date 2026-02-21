import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Popover shown when a sentence is clicked.
 * Displays the original sentence (selectable for drill-down), romanization, and translation.
 */
export default function SentencePopover({
  sentencePopover,
  popoverRef,
  getPopoverPosition,
  romanizer,
  onSubSelection,
}) {
  if (!sentencePopover) return null;

  const { sentenceText, rect, translation, subText, subTranslation } = sentencePopover;

  // Compute romanization
  let romanization = null;
  if (romanizer) {
    try {
      const arr = romanizer.romanize(sentenceText);
      romanization = arr.join('');
    } catch { /* ignore */ }
  }

  const style = getPopoverPosition(rect, 320);

  return createPortal(
    <SentencePopoverInner
      ref={popoverRef}
      sentenceText={sentenceText}
      romanization={romanization}
      translation={translation}
      subText={subText}
      subTranslation={subTranslation}
      style={style}
      onSubSelection={onSubSelection}
    />,
    document.body
  );
}

import { forwardRef } from 'react';

const SentencePopoverInner = forwardRef(function SentencePopoverInner(
  { sentenceText, romanization, translation, subText, subTranslation, style, onSubSelection },
  ref
) {
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      onSubSelection(null);
      return;
    }
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

  return (
    <div ref={ref} className="reader-view__popover sentence-popover" style={style}>
      <span className="sentence-popover__original text-target">{sentenceText}</span>
      {romanization && (
        <span className="sentence-popover__romanization">{romanization}</span>
      )}
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
