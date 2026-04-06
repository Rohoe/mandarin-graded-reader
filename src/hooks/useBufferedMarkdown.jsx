import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Debounces streaming text and converts simple markdown to React elements.
 * Handles: ### headers, **bold**, *italic*, paragraphs.
 * Strips code fences (```…```) since those are data blocks, not display content.
 * Also extracts partial vocab entries from incomplete vocab-json blocks.
 */
export function useBufferedMarkdown(streamingText, delay = 80) {
  const [buffered, setBuffered] = useState(streamingText);
  const timerRef = useRef(null);

  useEffect(() => {
    // Flush immediately on null (stream ended) or empty (stream started)
    if (streamingText === null || streamingText === '') {
      clearTimeout(timerRef.current);
      setBuffered(streamingText);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setBuffered(streamingText), delay);
    return () => clearTimeout(timerRef.current);
  }, [streamingText, delay]);

  const rendered = useMemo(() => renderMarkdown(buffered), [buffered]);
  const partialVocab = useMemo(() => extractPartialVocab(buffered), [buffered]);

  return { rendered, partialVocab };
}

/* ── Lightweight markdown → React elements ──────────────────── */

function renderMarkdown(text) {
  if (text === null || text === '') return text;

  // Strip code fences and their content (vocab-json, etc.)
  const cleaned = text.replace(/```[\s\S]*?```/g, '').replace(/```[\s\S]*$/, '');

  const lines = cleaned.split('\n');
  const elements = [];
  let paraLines = [];
  let key = 0;

  const flushPara = () => {
    if (paraLines.length === 0) return;
    const text = paraLines.join('\n');
    if (text.trim()) {
      elements.push(<p key={key++}>{renderInlineMarkdown(text)}</p>);
    }
    paraLines = [];
  };

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headerMatch) {
      flushPara();
      const level = Math.min(headerMatch[1].length, 4);
      const Tag = `h${level}`;
      elements.push(<Tag key={key++}>{renderInlineMarkdown(headerMatch[2])}</Tag>);
      continue;
    }

    if (line.trim() === '') {
      flushPara();
      continue;
    }

    paraLines.push(line);
  }
  flushPara();

  return elements.length > 0 ? elements : null;
}

/* ── Extract completed vocab objects from a partial vocab-json block ── */

const EMPTY_VOCAB = [];

function extractPartialVocab(text) {
  if (!text) return EMPTY_VOCAB;

  // Find the start of the vocab-json fence
  const fenceStart = text.indexOf('```vocab-json');
  if (fenceStart === -1) return EMPTY_VOCAB;

  // Content after the opening fence line
  const afterFence = text.slice(fenceStart + '```vocab-json'.length);

  // Extract each complete JSON object using brace counting
  const entries = [];
  let i = 0;
  while (i < afterFence.length) {
    // Find next opening brace
    const objStart = afterFence.indexOf('{', i);
    if (objStart === -1) break;

    // Count braces to find the matching close
    let depth = 0;
    let inString = false;
    let escaped = false;
    let j = objStart;
    for (; j < afterFence.length; j++) {
      const ch = afterFence[j];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\' && inString) { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }

    if (depth !== 0) break; // incomplete object — stop here

    try {
      const obj = JSON.parse(afterFence.slice(objStart, j + 1));
      entries.push(obj);
    } catch { /* malformed — skip */ }
    i = j + 1;
  }

  return entries.length > 0 ? entries : EMPTY_VOCAB;
}

function renderInlineMarkdown(text) {
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      parts.push(<strong key={i++}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={i++}>{match[3]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}
