import { useState, useEffect, useCallback, useRef } from 'react';
import { translateText, batchTranslate } from '../lib/translate';

const LANG_MAP = { zh: 'zh-CN', yue: 'yue', ko: 'ko', fr: 'fr', es: 'es', en: 'en', ja: 'ja' };

/**
 * Manages per-question translation state: individual toggles and batch "translate all".
 *
 * @param {{ questions, lessonKey, langId, nativeLang, translateQuestions, questionTranslations, onCacheQuestionTranslations, notify }} options
 * @returns {{ visibleQTranslations, fetchedQTranslations, translatingQIndex, translatingAll, handleQTranslateClick }}
 */
export function useQuestionTranslation({ questions, lessonKey, langId, nativeLang, translateQuestions, questionTranslations, onCacheQuestionTranslations, notify }) {
  const [visibleQTranslations, setVisibleQTranslations] = useState(new Set());
  const [fetchedQTranslations, setFetchedQTranslations] = useState({});
  const [translatingQIndex, setTranslatingQIndex] = useState(null);
  const [translatingAll, setTranslatingAll] = useState(false);

  // Refs to avoid re-triggering the batch translate effect when these change
  // (adding questionTranslations as a dep would loop: translate → cache → state change → re-translate)
  const langIdRef = useRef(langId);
  const nativeLangRef = useRef(nativeLang);
  const questionTranslationsRef = useRef(questionTranslations);
  const onCacheRef = useRef(onCacheQuestionTranslations);
  langIdRef.current = langId;
  nativeLangRef.current = nativeLang;
  questionTranslationsRef.current = questionTranslations;
  onCacheRef.current = onCacheQuestionTranslations;

  // Batch translate all question content when translateQuestions is on
  useEffect(() => {
    if (!translateQuestions || !questions || questions.length === 0) return;
    const cached = questionTranslationsRef.current || {};

    const toTranslate = [];
    questions.forEach((q, i) => {
      const qText = typeof q === 'string' ? q : q.text;
      const qType = (typeof q === 'object' ? q.type : null) || 'fr';
      if (qText && !cached[`q-${i}`]) toTranslate.push({ key: `q-${i}`, text: qText });
      if (qType === 'mc' && q.options) {
        q.options.forEach(opt => {
          const letter = opt.charAt(0);
          if (!cached[`opt-${i}-${letter}`]) toTranslate.push({ key: `opt-${i}-${letter}`, text: opt });
        });
      }
      if (qType === 'fb' && q.bank) {
        q.bank.forEach(word => {
          if (!cached[`bank-${i}-${word}`]) toTranslate.push({ key: `bank-${i}-${word}`, text: word });
        });
      }
      if (qType === 'vm' && q.pairs) {
        q.pairs.forEach(p => {
          if (!cached[`vm-${i}-${p.word}`]) toTranslate.push({ key: `vm-${i}-${p.word}`, text: p.definition });
        });
      }
    });

    if (toTranslate.length === 0) return;

    let cancelled = false;
    setTranslatingAll(true);
    const fromLang = LANG_MAP[langIdRef.current] || langIdRef.current;
    const toLang = nativeLangRef.current === langIdRef.current ? 'en' : (nativeLangRef.current || 'en');

    batchTranslate(toTranslate.map(t => t.text), { from: fromLang, to: toLang })
      .then(results => {
        if (cancelled) return;
        const newTranslations = {};
        toTranslate.forEach((item, idx) => {
          newTranslations[item.key] = results[idx] || '';
        });
        onCacheRef.current?.(newTranslations);
      })
      .catch(err => {
        if (!cancelled) console.warn('[useQuestionTranslation] Batch translate failed:', err.message);
      })
      .finally(() => {
        if (!cancelled) setTranslatingAll(false);
      });

    return () => { cancelled = true; };
  }, [translateQuestions, lessonKey, questions?.length]);

  const handleQTranslateClick = useCallback(async (i, qText, qTranslation) => {
    // Toggle off if already visible
    if (visibleQTranslations.has(i)) {
      setVisibleQTranslations(prev => { const n = new Set(prev); n.delete(i); return n; });
      return;
    }
    // Show existing translation (from LLM or previous fetch)
    if (qTranslation || fetchedQTranslations[i]) {
      setVisibleQTranslations(prev => new Set(prev).add(i));
      return;
    }
    // Fetch via Google Translate
    setVisibleQTranslations(prev => new Set(prev).add(i));
    setTranslatingQIndex(i);
    try {
      const translation = await translateText(qText, langId, { to: nativeLang });
      setFetchedQTranslations(prev => ({ ...prev, [i]: translation }));
    } catch (err) {
      notify?.('error', `Translation failed: ${err.message}`);
    } finally {
      setTranslatingQIndex(null);
    }
  }, [visibleQTranslations, fetchedQTranslations, langId, nativeLang, notify]);

  return { visibleQTranslations, fetchedQTranslations, translatingQIndex, translatingAll, handleQTranslateClick };
}
