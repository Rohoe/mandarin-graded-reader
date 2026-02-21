/**
 * Builds the LLM config object that API functions need from app state.
 */
import { getProvider } from './providers';

const DEFAULT_GEMINI_KEY = import.meta.env.VITE_DEFAULT_GEMINI_KEY || '';

/** Returns true when no provider has a user-supplied key. */
export function hasAnyUserKey(providerKeys) {
  return Object.values(providerKeys || {}).some(k => k);
}

export function buildGradingLLMConfig(state) {
  const base = buildLLMConfig(state);
  const provider = base.provider;
  const providerDef = getProvider(provider);
  const gradingModel = state.gradingModels?.[provider];
  return {
    ...base,
    model: gradingModel || providerDef.defaultGradingModel || base.model,
  };
}

export function buildLLMConfig(state) {
  const userHasKey = hasAnyUserKey(state.providerKeys);

  // Fall back to Gemini with the bundled demo key when no user key exists
  if (!userHasKey && DEFAULT_GEMINI_KEY) {
    return {
      provider: 'gemini',
      apiKey: DEFAULT_GEMINI_KEY,
      model: 'gemini-2.5-flash',
      baseUrl: null,
      usingDefaultKey: true,
    };
  }

  const provider = state.activeProvider || 'anthropic';
  const providerDef = getProvider(provider);
  return {
    provider,
    apiKey: state.providerKeys?.[provider] || '',
    model: (state.activeModels && state.activeModels[provider]) || providerDef.defaultModel,
    baseUrl: provider === 'openai_compatible' ? state.customBaseUrl : null,
    usingDefaultKey: false,
  };
}
