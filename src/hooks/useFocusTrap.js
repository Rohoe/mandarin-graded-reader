import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within a container element while active.
 * Saves and restores focus on activation/deactivation.
 * Closes on Escape via the provided onClose callback.
 */
export function useFocusTrap(ref, isActive, onClose) {
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!isActive || !ref?.current) return;

    previousFocus.current = document.activeElement;

    // Focus the first focusable element inside the container
    const container = ref.current;
    const focusables = container.querySelectorAll(FOCUSABLE);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.focus();
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const currentFocusables = container.querySelectorAll(FOCUSABLE);
      if (currentFocusables.length === 0) return;

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus();
      }
    };
  }, [isActive, ref, onClose]);
}
