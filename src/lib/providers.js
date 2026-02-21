/**
 * Provider registry for multi-LLM support.
 * Each provider defines its id, display name, key placeholder, default model,
 * available models, and (for openai_compatible) presets.
 */

export const PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    keyPlaceholder: 'sk-ant-api03-...',
    defaultModel: 'claude-sonnet-4-20250514',
    defaultGradingModel: 'claude-haiku-4-20250414',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-20250414', label: 'Claude Haiku 4' },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    keyPlaceholder: 'sk-...',
    defaultModel: 'gpt-4o',
    defaultGradingModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    keyPlaceholder: 'AIza...',
    defaultModel: 'gemini-2.5-pro',
    defaultGradingModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
  },
  openai_compatible: {
    id: 'openai_compatible',
    name: 'OpenAI-Compatible',
    keyPlaceholder: 'API key (if required)',
    defaultModel: '',
    defaultGradingModel: null,
    models: [],
    presets: [
      { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
      { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai', defaultModel: 'llama-3.3-70b-versatile' },
      { id: 'custom', name: 'Custom endpoint', baseUrl: '', defaultModel: '' },
    ],
  },
};

export const DEFAULT_PROVIDER = 'anthropic';

export function getProvider(id) {
  return PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER];
}
