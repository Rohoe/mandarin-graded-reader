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

  // Romanize a plain text string (no markdown) into ruby-annotated JSX nodes
  const romanizeText = useCallback((text, keyPrefix) => {
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
  }, [romanizer, scriptRegex]);

  // Split text into markdown segments (**bold**, *italic*, plain) and render each,
  // applying ruby romanization when enabled
  const renderChars = useCallback((text, keyPrefix) => {
    if (!text) return null;
    const mdPattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|[^*]+)/g;
    let m;
    const nodes = [];
    let seg = 0;

    while ((m = mdPattern.exec(text)) !== null) {
      const segKey = `${keyPrefix}-s${seg++}`;
      if (m[2] !== undefined) {
        // Bold segment
        const inner = (pinyinOn && romanizer) ? romanizeText(m[2], segKey) : m[2];
        nodes.push(<strong key={segKey}>{inner}</strong>);
      } else if (m[3] !== undefined) {
        // Italic segment
        const inner = (pinyinOn && romanizer) ? romanizeText(m[3], segKey) : m[3];
        nodes.push(<em key={segKey}>{inner}</em>);
      } else {
        // Plain text segment
        if (pinyinOn && romanizer) {
          nodes.push(<span key={segKey}>{romanizeText(m[0], segKey)}</span>);
        } else {
          nodes.push(<span key={segKey}>{m[0]}</span>);
        }
      }
    }

    return nodes.length > 0 ? nodes : null;
  }, [pinyinOn, romanizer, romanizeText]);

  return { pinyinOn, setPinyinOn, romanizer, renderChars };
}
