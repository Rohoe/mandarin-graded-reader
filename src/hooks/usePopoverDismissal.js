import { useEffect } from 'react';

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

  useEffect(() => {
    if (!isOpen) return;

    function onKey(e) {
      if (e.key === 'Escape') {
        onEscape?.();
        onClose();
      }
    }

    function onPointerDown(e) {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      for (const sel of ignoreSelectors) {
        if (e.target.closest(sel)) return;
      }
      onClose();
    }

    function onScroll() {
      onClose();
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
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
}
