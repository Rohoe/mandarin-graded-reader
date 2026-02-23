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
    defaultGradingModel: 'claude-haiku-4-5-20251001',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
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

// ── Model label formatting ────────────────────────────────────

/**
 * Converts a raw model ID into a human-readable label.
 * E.g. "claude-sonnet-4-20250514" → "Claude Sonnet 4"
 *      "gpt-4o-mini" → "GPT 4o Mini"
 *      "gemini-2.5-pro" → "Gemini 2.5 Pro"
 */
export function formatModelLabel(id) {
  // Strip date suffixes like -20250514 or -20251001
  let label = id.replace(/-\d{8}$/, '');
  // Replace hyphens with spaces and capitalize each word
  label = label.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  // Fix common abbreviations
  label = label.replace(/\bGpt\b/g, 'GPT').replace(/\bGpt(\d)/g, 'GPT$1');
  return label;
}

// ── Fetch live models from provider APIs ──────────────────────

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetches available models from a provider's API.
 * Returns [{ id, label }] on success, or null on failure.
 */
export async function fetchProviderModels(providerId, apiKey, baseUrl) {
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    switch (providerId) {
      case 'anthropic':
        return await fetchAnthropicModels(apiKey, controller.signal);
      case 'openai':
        return await fetchOpenAIModels(apiKey, null, controller.signal);
      case 'gemini':
        return await fetchGeminiModels(apiKey, controller.signal);
      case 'openai_compatible':
        return await fetchOpenAIModels(apiKey, baseUrl, controller.signal);
      default:
        return null;
    }
  } catch (err) {
    console.warn(`[fetchProviderModels] Failed for ${providerId}:`, err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchAnthropicModels(apiKey, signal) {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const models = (data.data || [])
    .filter(m => m.id.startsWith('claude-'))
    .sort((a, b) => a.id.localeCompare(b.id));
  return models.map(m => ({ id: m.id, label: formatModelLabel(m.id) }));
}

async function fetchOpenAIModels(apiKey, baseUrl, signal) {
  const url = `${baseUrl || 'https://api.openai.com'}/v1/models`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const chatPrefixes = ['gpt-4', 'gpt-3.5', 'o1', 'o3', 'o4', 'chatgpt'];
  const models = (data.data || [])
    .filter(m => baseUrl || chatPrefixes.some(p => m.id.startsWith(p)))
    .sort((a, b) => a.id.localeCompare(b.id));
  return models.map(m => ({ id: m.id, label: formatModelLabel(m.id) }));
}

async function fetchGeminiModels(apiKey, signal) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const models = (data.models || [])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => {
      // Model names come as "models/gemini-2.5-pro" — extract just the ID part
      const id = m.name.replace(/^models\//, '');
      return { id, label: m.displayName || formatModelLabel(id) };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return models;
}
