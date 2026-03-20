import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Debounces streaming text and converts simple markdown to React elements.
 * Handles: ### headers, **bold**, *italic*, paragraphs.
 * Strips code fences (```…```) since those are data blocks, not display content.
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

  return useMemo(() => renderMarkdown(buffered), [buffered]);
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
