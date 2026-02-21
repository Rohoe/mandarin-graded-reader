import { parseStorySegments } from './parser';
import { getLang } from './languages';

/**
 * Splits a paragraph (markdown string) into sentences, preserving bold/italic segments.
 * Returns an array of sentence objects, each containing its segments and plain text.
 *
 * @param {string} paragraphMarkdown - Raw paragraph with **bold** / *italic* markup
 * @param {string} langId - Language identifier (zh, yue, ko)
 * @returns {Array<{ segments: Array<{type: string, content: string}>, plainText: string }>}
 */
export function splitParagraphIntoSentences(paragraphMarkdown, langId) {
  const segments = parseStorySegments(paragraphMarkdown);
  if (segments.length === 0) return [];

  const langConfig = getLang(langId);
  const endRegex = langConfig.sentenceEndRegex;

  // Accumulate sentences by walking segments and splitting on sentence-ending punctuation
  const sentences = [];
  let currentSegments = [];
  let currentPlain = '';

  function pushSentence() {
    if (currentSegments.length === 0) return;
    sentences.push({ segments: currentSegments, plainText: currentPlain });
    currentSegments = [];
    currentPlain = '';
  }

  for (const seg of segments) {
    if (seg.type === 'bold' || seg.type === 'italic') {
      // Bold/italic segments are kept whole (they're vocab words, not split mid-word)
      currentSegments.push(seg);
      currentPlain += seg.content;
    } else {
      // Split text segments on sentence boundaries
      const parts = seg.content.split(endRegex);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        // Check if this part is a sentence-ending punctuation character
        if (endRegex.test(part) && part.length <= 2) {
          // Attach punctuation to current sentence, then push
          currentSegments.push({ type: 'text', content: part });
          currentPlain += part;
          pushSentence();
        } else {
          currentSegments.push({ type: 'text', content: part });
          currentPlain += part;
        }
      }
    }
  }

  // Remaining segments form the last sentence
  pushSentence();

  return sentences;
}
