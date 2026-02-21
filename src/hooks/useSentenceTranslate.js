import { useState, useEffect, useCallback, useRef } from 'react';
import { translateText } from '../lib/translate';

/**
 * Manages sentence-click-to-translate popover state.
 * Returns state and handlers for the SentencePopover component.
 */
export function useSentenceTranslate(langId) {
  // { sentenceText, rect, translation, subTranslation }
  const [sentencePopover, setSentencePopover] = useState(null);
  const popoverRef = useRef(null);

  const closeSentencePopover = useCallback(() => {
    setSentencePopover(null);
  }, []);

  const handleSentenceClick = useCallback((e, sentence, _paragraphIndex) => {
    // Bail if clicking a vocab button (let vocab popover handle it)
    if (e.target.closest('.reader-view__vocab-btn')) return;

    // Bail if there's a text selection (let selection popover handle it)
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const sentenceText = sentence.plainText;

    // Toggle off if clicking the same sentence
    setSentencePopover(prev => {
      if (prev && prev.sentenceText === sentenceText) return null;
      return { sentenceText, rect, translation: null, subTranslation: null };
    });

    // Fetch translation
    translateText(sentenceText, langId)
      .then(translation => {
        setSentencePopover(prev =>
          prev && prev.sentenceText === sentenceText
            ? { ...prev, translation }
            : prev
        );
      })
      .catch(() => {
        setSentencePopover(prev =>
          prev && prev.sentenceText === sentenceText
            ? { ...prev, translation: '(translation failed)' }
            : prev
        );
      });
  }, [langId]);

  /**
   * Called when user drag-selects text within the sentence popover.
   * Translates the sub-selection and shows it below the main translation.
   */
  const handleSubSelection = useCallback((selectedText) => {
    if (!selectedText?.trim()) {
      setSentencePopover(prev => prev ? { ...prev, subText: null, subTranslation: null } : null);
      return;
    }

    const text = selectedText.trim();
    setSentencePopover(prev => prev ? { ...prev, subText: text, subTranslation: null } : null);

    translateText(text, langId)
      .then(translation => {
        setSentencePopover(prev =>
          prev && prev.subText === text
            ? { ...prev, subTranslation: translation }
            : prev
        );
      })
      .catch(() => {
        setSentencePopover(prev =>
          prev && prev.subText === text
            ? { ...prev, subTranslation: '(translation failed)' }
            : prev
        );
      });
  }, [langId]);

  // Close on Escape, outside click, or scroll
  useEffect(() => {
    if (!sentencePopover) return;

    function onKey(e) {
      if (e.key === 'Escape') setSentencePopover(null);
    }

    function onPointerDown(e) {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      // Don't close if clicking a sentence span (handleSentenceClick will toggle)
      if (e.target.closest('.reader-view__sentence')) return;
      setSentencePopover(null);
    }

    function onScroll() {
      setSentencePopover(null);
    }

    // Delay attaching pointerdown so the same click doesn't close immediately
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown);
    }, 50);

    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [sentencePopover]);

  return {
    sentencePopover,
    sentencePopoverRef: popoverRef,
    handleSentenceClick,
    handleSubSelection,
    closeSentencePopover,
  };
}
