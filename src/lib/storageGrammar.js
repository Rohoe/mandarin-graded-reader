import { load, save, saveWithFile } from './storageHelpers';

const KEYS = {
  GRAMMAR: 'gradedReader_learnedGrammar',
};

export function loadLearnedGrammar() {
  return load(KEYS.GRAMMAR, {});
}

export function mergeGrammar(existing, noteList) {
  const merged = { ...existing };
  const now = new Date().toISOString();
  for (const note of noteList) {
    const key = `${note.langId}::${note.pattern}`;
    if (key && !merged[key]) {
      merged[key] = {
        pattern: note.pattern,
        label: note.label || '',
        explanation: note.explanation || '',
        example: note.example || '',
        langId: note.langId,
        dateAdded: now,
        interval: 0, ease: 2.5, nextReview: null, reviewCount: 0, lapses: 0,
      };
    }
  }
  return merged;
}

export function saveLearnedGrammar(grammar) {
  saveWithFile(KEYS.GRAMMAR, grammar, 'grammar');
}

// Grammar session (ephemeral, no file fanout)
export function loadGrammarSession(langId) {
  return load('gradedReader_grammarSession_' + langId, null);
}

export function saveGrammarSession(session, langId) {
  save('gradedReader_grammarSession_' + langId, session);
}
