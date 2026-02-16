import { useState, useEffect, useCallback } from 'react';
import { loadRomanizer } from '../lib/romanizer';

export function useRomanization(langId, langConfig) {
  const [pinyinOn, setPinyinOn] = useState(false);
  const [romanizer, setRomanizer] = useState(null);
  const scriptRegex = langConfig.scriptRegex;

  useEffect(() => {
    let cancelled = false;
    loadRomanizer(langId).then(r => { if (!cancelled) setRomanizer(r); });
    return () => { cancelled = true; };
  }, [langId]);

  const renderChars = useCallback((text, keyPrefix) => {
    if (!pinyinOn || !romanizer) return text;
    const chars = [...text];
    const romArr = romanizer.romanize(text);
    const nodes = [];
    let nonTarget = '';
    let nonTargetStart = 0;
    for (let i = 0; i < chars.length; i++) {
      if (scriptRegex.test(chars[i])) {
        if (nonTarget) {
          nodes.push(<span key={`${keyPrefix}-t${nonTargetStart}`}>{nonTarget}</span>);
          nonTarget = '';
        }
        nodes.push(<ruby key={`${keyPrefix}-r${i}`}>{chars[i]}<rt>{romArr[i]}</rt></ruby>);
      } else {
        if (!nonTarget) nonTargetStart = i;
        nonTarget += chars[i];
      }
    }
    if (nonTarget) nodes.push(<span key={`${keyPrefix}-tend`}>{nonTarget}</span>);
    return nodes;
  }, [pinyinOn, romanizer, scriptRegex]);

  return { pinyinOn, setPinyinOn, romanizer, renderChars };
}
