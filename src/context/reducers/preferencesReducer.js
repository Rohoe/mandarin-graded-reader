export function preferencesReducer(state, action) {
  switch (action.type) {
    case 'SET_MAX_TOKENS':
      return { ...state, maxTokens: action.payload };

    case 'SET_DEFAULT_LEVEL':
      return { ...state, defaultLevel: action.payload };

    case 'SET_DEFAULT_TOPIK_LEVEL':
      return { ...state, defaultTopikLevel: action.payload };

    case 'SET_DEFAULT_YUE_LEVEL':
      return { ...state, defaultYueLevel: action.payload };

    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.payload };

    case 'SET_TTS_VOICE':
      return { ...state, ttsVoiceURI: action.payload };

    case 'SET_TTS_KO_VOICE':
      return { ...state, ttsKoVoiceURI: action.payload };

    case 'SET_TTS_YUE_VOICE':
      return { ...state, ttsYueVoiceURI: action.payload };

    case 'SET_EXPORT_SENTENCE_ROM':
      return { ...state, exportSentenceRom: { ...state.exportSentenceRom, [action.payload.langId]: action.payload.value } };

    case 'SET_EXPORT_SENTENCE_TRANS':
      return { ...state, exportSentenceTrans: { ...state.exportSentenceTrans, [action.payload.langId]: action.payload.value } };

    case 'SET_TTS_SPEECH_RATE':
      return { ...state, ttsSpeechRate: action.payload };

    case 'SET_ROMANIZATION_ON':
      return { ...state, romanizationOn: action.payload };

    case 'SET_TRANSLATE_BUTTONS':
      return { ...state, translateButtons: action.payload };

    case 'SET_STRUCTURED_OUTPUT':
      return { ...state, useStructuredOutput: action.payload };

    case 'SET_NEW_CARDS_PER_DAY':
      return { ...state, newCardsPerDay: action.payload };

    default:
      return undefined;
  }
}
