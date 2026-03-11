import { useState, useCallback, useRef } from 'react';
import { translateText } from '../lib/translate';
import { usePopoverDismissal } from './usePopoverDismissal';

/**
 * Manages sentence-click-to-translate popover state.
 * Returns state and handlers for the SentencePopover component.
 */
export function useSentenceTranslate(langId, nativeLang = 'en') {
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
    translateText(sentenceText, langId, { to: nativeLang })
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
  }, [langId, nativeLang]);

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

    translateText(text, langId, { to: nativeLang })
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
  }, [langId, nativeLang]);

  // Close on Escape, outside click, or scroll
  usePopoverDismissal(!!sentencePopover, popoverRef, closeSentencePopover, {
    ignoreSelectors: ['.reader-view__sentence'],
    pointerDelay: 50,
  });

  return {
    sentencePopover,
    sentencePopoverRef: popoverRef,
    handleSentenceClick,
    handleSubSelection,
    closeSentencePopover,
  };
}
