/**
 * Builds the LLM config object that API functions need from app state.
 */
import { getProvider } from './providers';

export function buildLLMConfig(state) {
  const provider = state.activeProvider || 'anthropic';
  const providerDef = getProvider(provider);
  return {
    provider,
    apiKey: state.providerKeys?.[provider] || '',
    model: (state.activeModels && state.activeModels[provider]) || providerDef.defaultModel,
    baseUrl: provider === 'openai_compatible' ? state.customBaseUrl : null,
  };
}
