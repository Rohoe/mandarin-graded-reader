import { useEffect, useRef } from 'react';

/**
 * Shared hook to dismiss a popover on Escape, outside click, or scroll.
 *
 * @param {boolean} isOpen - Whether the popover is currently open
 * @param {React.RefObject} popoverRef - Ref to the popover DOM element
 * @param {function} onClose - Called to close the popover
 * @param {object} [options]
 * @param {string[]} [options.ignoreSelectors] - CSS selectors to ignore on pointerdown
 * @param {number} [options.pointerDelay=0] - Delay (ms) before attaching pointerdown listener
 * @param {function} [options.onEscape] - Extra callback invoked on Escape (before onClose)
 */
export function usePopoverDismissal(isOpen, popoverRef, onClose, options = {}) {
  const { ignoreSelectors = [], pointerDelay = 0, onEscape } = options;

  // Refs for callbacks/arrays that callers often pass inline (unstable references).
  // Reading from refs inside handlers avoids thrashing event listeners.
  const onCloseRef = useRef(onClose);
  const onEscapeRef = useRef(onEscape);
  const ignoreSelectorsRef = useRef(ignoreSelectors);
  onCloseRef.current = onClose;
  onEscapeRef.current = onEscape;
  ignoreSelectorsRef.current = ignoreSelectors;

  useEffect(() => {
    if (!isOpen) return;

    function onKey(e) {
      if (e.key === 'Escape') {
        onEscapeRef.current?.();
        onCloseRef.current();
      }
    }

    function onPointerDown(e) {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      for (const sel of ignoreSelectorsRef.current) {
        if (e.target.closest(sel)) return;
      }
      onCloseRef.current();
    }

    function onScroll() {
      onCloseRef.current();
    }

    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);

    let timer;
    if (pointerDelay > 0) {
      timer = setTimeout(() => {
        document.addEventListener('pointerdown', onPointerDown);
      }, pointerDelay);
    } else {
      document.addEventListener('pointerdown', onPointerDown);
    }

    return () => {
      if (timer != null) clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, popoverRef, pointerDelay]);
}
