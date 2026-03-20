/**
 * Extract grammar notes from a reader for SRS storage.
 */
export function mapReaderGrammar(reader, langId) {
  if (!reader?.grammarNotes?.length) return null;
  const mapped = reader.grammarNotes
    .filter(note => note.pattern)
    .map(note => ({
      pattern: note.pattern,
      label: note.label || '',
      explanation: note.explanation || '',
      example: note.example || '',
      langId,
    }));
  return mapped.length > 0 ? mapped : null;
}
