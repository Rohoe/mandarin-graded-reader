import { useState, useCallback, useMemo, useRef } from 'react';
import { usePopoverDismissal } from './usePopoverDismissal';

export function useVocabPopover(reader, langConfig) {
  const [activeVocab, setActiveVocab] = useState(null);
  const popoverRef = useRef(null);
  const scriptRegex = langConfig.scriptRegex;

  const vocabulary = reader?.vocabulary;
  const vocabMap = useMemo(() => {
    const map = new Map();
    if (vocabulary) {
      for (const v of vocabulary) {
        const word = v.target || v.chinese;
        map.set(word, v);
        if (scriptRegex) {
          const stripped = word.replace(new RegExp(`^[^${scriptRegex.source.slice(1, -1)}]+|[^${scriptRegex.source.slice(1, -1)}]+$`, 'g'), '');
          if (stripped && stripped !== word) map.set(stripped, v);
        }
      }
    }
    return map;
  }, [vocabulary, scriptRegex]);

  const handleVocabClick = useCallback((e, vocabWord) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveVocab(prev =>
      prev && (prev.word.target || prev.word.chinese) === (vocabWord.target || vocabWord.chinese) ? null : { word: vocabWord, rect }
    );
  }, []);

  function lookupVocab(text) {
    const exact = vocabMap.get(text);
    if (exact) return exact;
    if (scriptRegex) {
      const stripped = text.replace(new RegExp(`^[^${scriptRegex.source.slice(1, -1)}]+|[^${scriptRegex.source.slice(1, -1)}]+$`, 'g'), '');
      if (stripped && stripped !== text) return vocabMap.get(stripped);
    }
    return null;
  }

  function getPopoverPosition(rect, width = 220) {
    const gap = 8;
    const popoverWidth = width;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));
    const preferAbove = rect.top - gap > 120;
    return {
      position: 'fixed',
      zIndex: 60,
      width: popoverWidth,
      left,
      ...(preferAbove ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
    };
  }

  // Close popover on Escape, outside click, or scroll
  usePopoverDismissal(!!activeVocab, popoverRef, () => setActiveVocab(null), {
    ignoreSelectors: ['.reader-view__vocab-btn', '.popover-drill-word'],
  });

  return { activeVocab, setActiveVocab, popoverRef, vocabMap, handleVocabClick, lookupVocab, getPopoverPosition };
}
