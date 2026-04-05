import { useState, useCallback, useRef } from 'react';
import { translateText } from '../lib/translate';
import { usePopoverDismissal } from './usePopoverDismissal';

/**
 * Manages click-to-translate popovers for words and sentence-end punctuation.
 *
 * Two modes:
 * - 'word': click any word → popover shows word translation
 * - 'sentence': click sentence-end punctuation → sentence highlights, popover shows sentence translation
 *
 * highlightedSentence persists through word clicks so users can drill into
 * individual words while keeping the sentence context visible.
 */
export function useSentenceTranslate(langId, nativeLang = 'en') {
  // { mode: 'word'|'sentence', text, rect, translation, pi?, si? }
  const [sentencePopover, setSentencePopover] = useState(null);
  // { pi, si } — which sentence is highlighted (persists through word clicks)
  const [highlightedSentence, setHighlightedSentence] = useState(null);
  const popoverRef = useRef(null);
  const abortRef = useRef(null);

  const closeSentencePopover = useCallback(() => {
    setSentencePopover(null);
    setHighlightedSentence(null);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }, []);

  /**
   * Called when a word in the story text is clicked.
   * Opens a popover showing the word translation.
   * Keeps any active sentence highlight so users can explore words in context.
   */
  const handleWordClick = useCallback((e, wordText, sentence) => {
    // Bail if clicking a vocab button (let vocab popover handle it)
    if (e.target.closest('.reader-view__vocab-btn')) return;

    // Bail if there's a text selection (let selection popover handle it)
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;

    const rect = e.currentTarget.getBoundingClientRect();

    // Abort any previous translation request
    if (abortRef.current) abortRef.current.abort();

    // Toggle off if clicking the same word
    let isToggleOff = false;
    setSentencePopover(prev => {
      if (prev && prev.mode === 'word' && prev.text === wordText) {
        isToggleOff = true;
        return null;
      }
      return { mode: 'word', text: wordText, rect, translation: null };
    });
    if (isToggleOff) return;

    // Fetch word translation
    const controller = new AbortController();
    abortRef.current = controller;

    translateText(wordText, langId, { to: nativeLang })
      .then(translation => {
        if (controller.signal.aborted) return;
        setSentencePopover(prev =>
          prev && prev.mode === 'word' && prev.text === wordText
            ? { ...prev, translation }
            : prev
        );
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        setSentencePopover(prev =>
          prev && prev.mode === 'word' && prev.text === wordText
            ? { ...prev, translation: '(translation failed)' }
            : prev
        );
      });
  }, [langId, nativeLang]);

  /**
   * Called when sentence-ending punctuation is clicked.
   * Highlights the sentence and opens a popover showing the full sentence translation.
   */
  const handleSentenceEndClick = useCallback((e, sentence, pi, si) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const sentenceText = sentence.plainText;

    // Abort any previous translation request
    if (abortRef.current) abortRef.current.abort();

    // Toggle off if clicking the same sentence-end
    let isToggleOff = false;
    setSentencePopover(prev => {
      if (prev && prev.mode === 'sentence' && prev.pi === pi && prev.si === si) {
        isToggleOff = true;
        setHighlightedSentence(null);
        return null;
      }
      setHighlightedSentence({ pi, si });
      return { mode: 'sentence', text: sentenceText, rect, translation: null, pi, si };
    });
    if (isToggleOff) return;

    // Fetch sentence translation
    const controller = new AbortController();
    abortRef.current = controller;

    translateText(sentenceText, langId, { to: nativeLang })
      .then(translation => {
        if (controller.signal.aborted) return;
        setSentencePopover(prev =>
          prev && prev.mode === 'sentence' && prev.pi === pi && prev.si === si
            ? { ...prev, translation }
            : prev
        );
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        setSentencePopover(prev =>
          prev && prev.mode === 'sentence' && prev.pi === pi && prev.si === si
            ? { ...prev, translation: '(translation failed)' }
            : prev
        );
      });
  }, [langId, nativeLang]);

  // Close on Escape, outside click, or scroll
  usePopoverDismissal(!!sentencePopover, popoverRef, closeSentencePopover, {
    ignoreSelectors: ['.reader-view__word', '.reader-view__vocab-btn', '.reader-view__sentence-end', '.popover-drill-word'],
    pointerDelay: 50,
  });

  return {
    sentencePopover,
    highlightedSentence,
    sentencePopoverRef: popoverRef,
    handleWordClick,
    handleSentenceEndClick,
    closeSentencePopover,
  };
}
