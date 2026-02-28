export function providerReducer(state, action) {
  switch (action.type) {
    case 'SET_API_KEY': {
      const newKeys = { ...state.providerKeys, anthropic: action.payload };
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'CLEAR_API_KEY': {
      const newKeys = { ...state.providerKeys, anthropic: '' };
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'SET_PROVIDER_KEY': {
      const { provider, key } = action.payload;
      const newKeys = { ...state.providerKeys, [provider]: key };
      return { ...state, providerKeys: newKeys, apiKey: newKeys[state.activeProvider] || '' };
    }

    case 'SET_ACTIVE_PROVIDER':
      return { ...state, activeProvider: action.payload, apiKey: state.providerKeys[action.payload] || '' };

    case 'SET_ACTIVE_MODEL': {
      const { provider: prov, model } = action.payload;
      return { ...state, activeModels: { ...state.activeModels, [prov]: model } };
    }

    case 'SET_GRADING_MODEL': {
      const { provider: prov, model } = action.payload;
      return { ...state, gradingModels: { ...state.gradingModels, [prov]: model } };
    }

    case 'SET_CUSTOM_BASE_URL':
      return { ...state, customBaseUrl: action.payload };

    case 'SET_CUSTOM_MODEL_NAME':
      return { ...state, customModelName: action.payload };

    case 'SET_COMPAT_PRESET':
      return { ...state, compatPreset: action.payload };

    case 'SET_FETCHED_MODELS': {
      const { provider, models } = action.payload;
      return {
        ...state,
        fetchedModels: {
          ...state.fetchedModels,
          [provider]: { models, fetchedAt: Date.now() },
        },
      };
    }

    default:
      return undefined;
  }
}
