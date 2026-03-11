/**
 * Shared inline markdown rendering utilities.
 * Converts **bold** and *italic* to React elements or strips them to plain text.
 */

/**
 * Render inline markdown (**bold**, *italic*) to React elements.
 */
export function renderInline(text) {
  if (!text) return null;
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|[^*]+)/g;
  const parts = [];
  let m;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m[2] !== undefined)      parts.push(<strong key={i++}>{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={i++}>{m[3]}</em>);
    else                         parts.push(<span key={i++}>{m[0]}</span>);
  }
  return parts;
}

/**
 * Strip **bold** and *italic* markdown to plain text.
 */
export function stripMarkdown(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
}
