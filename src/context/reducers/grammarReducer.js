import { mergeGrammar } from '../../lib/storage';
import {
  ADD_GRAMMAR, UPDATE_GRAMMAR_SRS, CLEAR_GRAMMAR,
} from '../actionTypes';

export function grammarReducer(state, action) {
  switch (action.type) {
    case ADD_GRAMMAR: {
      const updated = mergeGrammar(state.learnedGrammar, action.payload);
      const count = Array.isArray(action.payload) ? action.payload.length : 0;
      const entry = { type: 'grammar_added', count, timestamp: Date.now() };
      return { ...state, learnedGrammar: updated, learningActivity: [...state.learningActivity, entry] };
    }

    case UPDATE_GRAMMAR_SRS: {
      const { key, ...srsFields } = action.payload;
      const existing = state.learnedGrammar[key];
      if (!existing) {
        console.warn(`[grammarReducer] UPDATE_GRAMMAR_SRS: key '${key}' not found in learnedGrammar`);
        return state;
      }
      return {
        ...state,
        learnedGrammar: {
          ...state.learnedGrammar,
          [key]: { ...existing, ...srsFields },
        },
      };
    }

    case CLEAR_GRAMMAR:
      return { ...state, learnedGrammar: {} };

    default:
      return undefined;
  }
}
