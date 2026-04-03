import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Tracks scroll progress through an article element.
 * Uses passive scroll listener with rAF throttling.
 * @param {React.RefObject} articleRef - Ref to the scrollable article/container
 * @returns {{ progress: number }}
 */
export function useScrollProgress(articleRef) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = articleRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      const totalH = el.scrollHeight;
      // How much of the article has scrolled past the viewport top
      const scrolled = -rect.top + windowH;
      const pct = Math.max(0, Math.min(1, scrolled / totalH));
      setProgress(pct);
    });
  }, [articleRef]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial measurement
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  return { progress };
}
