import { useState, useEffect, useCallback, useRef } from 'react';
import { usePopoverDismissal } from './usePopoverDismissal';

export function useTextSelection(containerRef) {
  const [selection, setSelection] = useState(null); // { text, rect }
  const popoverRef = useRef(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Use document-level mouseup and check containment, since the ref
  // may not be attached when the effect first runs
  useEffect(() => {
    function handleSelectionEnd(e) {
      const container = containerRef?.current;
      if (!container) return;

      // Ignore if the event target is inside a vocab button (let vocab popover handle it)
      if (e.target.closest('.reader-view__vocab-btn')) return;

      // Small delay to let the browser finalize the selection
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          return;
        }

        // Only handle selections within our container
        const range = sel.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) {
          return;
        }

        const text = sel.toString().trim();
        if (!text) return;

        const rect = range.getBoundingClientRect();
        setSelection({ text, rect });
      });
    }

    document.addEventListener('mouseup', handleSelectionEnd);
    document.addEventListener('touchend', handleSelectionEnd);

    return () => {
      document.removeEventListener('mouseup', handleSelectionEnd);
      document.removeEventListener('touchend', handleSelectionEnd);
    };
  }, [containerRef]);

  // Close on Escape, click outside, or scroll
  usePopoverDismissal(!!selection, popoverRef, clearSelection, {
    pointerDelay: 50,
    onEscape: () => window.getSelection()?.removeAllRanges(),
  });

  return { selection, popoverRef, clearSelection };
}
