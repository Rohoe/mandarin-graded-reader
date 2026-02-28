import { mergeVocabulary, mergeExportedWords } from '../../lib/storage';

export function vocabularyReducer(state, action) {
  switch (action.type) {
    case 'ADD_VOCABULARY': {
      const updated = mergeVocabulary(state.learnedVocabulary, action.payload);
      const wordCount = Array.isArray(action.payload) ? action.payload.length : Object.keys(action.payload).length;
      const entry = { type: 'vocab_added', count: wordCount, timestamp: Date.now() };
      return { ...state, learnedVocabulary: updated, learningActivity: [...state.learningActivity, entry] };
    }

    case 'UPDATE_VOCAB_SRS': {
      const { word, ...srsFields } = action.payload;
      const existing = state.learnedVocabulary[word];
      if (!existing) return state;
      return {
        ...state,
        learnedVocabulary: {
          ...state.learnedVocabulary,
          [word]: { ...existing, ...srsFields },
        },
      };
    }

    case 'CLEAR_VOCABULARY':
      return { ...state, learnedVocabulary: {} };

    case 'ADD_EXPORTED_WORDS':
      return { ...state, exportedWords: mergeExportedWords(state.exportedWords, action.payload) };

    case 'CLEAR_EXPORTED_WORDS':
      return { ...state, exportedWords: new Set() };

    default:
      return undefined;
  }
}
