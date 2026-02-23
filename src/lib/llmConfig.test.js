import { describe, it, expect, vi } from 'vitest';
import { buildLLMConfig, hasAnyUserKey } from './llmConfig';

// Mock the providers module
vi.mock('./providers', () => ({
  getProvider: (id) => {
    const providers = {
      anthropic: { id: 'anthropic', defaultModel: 'claude-sonnet-4-20250514' },
      openai: { id: 'openai', defaultModel: 'gpt-4o' },
      gemini: { id: 'gemini', defaultModel: 'gemini-2.5-pro' },
      openai_compatible: { id: 'openai_compatible', defaultModel: '' },
    };
    return providers[id] || providers.anthropic;
  },
}));

// ── hasAnyUserKey ────────────────────────────────────────────

describe('hasAnyUserKey', () => {
  it('returns false for empty keys', () => {
    expect(hasAnyUserKey({ anthropic: '', openai: '', gemini: '', openai_compatible: '' })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(hasAnyUserKey(null)).toBe(false);
    expect(hasAnyUserKey(undefined)).toBe(false);
  });

  it('returns true when one key is set', () => {
    expect(hasAnyUserKey({ anthropic: 'sk-test', openai: '', gemini: '', openai_compatible: '' })).toBe(true);
  });

  it('returns true when multiple keys are set', () => {
    expect(hasAnyUserKey({ anthropic: 'sk-test', openai: 'sk-other', gemini: '', openai_compatible: '' })).toBe(true);
  });
});

// ── buildLLMConfig ──────────────────────────────────────────

describe('buildLLMConfig', () => {
  it('routes to active provider with key', () => {
    const state = {
      providerKeys: { anthropic: 'sk-ant-test', openai: '', gemini: '', openai_compatible: '' },
      activeProvider: 'anthropic',
      activeModels: { anthropic: null },
    };
    const config = buildLLMConfig(state);
    expect(config.provider).toBe('anthropic');
    expect(config.apiKey).toBe('sk-ant-test');
    expect(config.model).toBe('claude-sonnet-4-20250514');
    expect(config.baseUrl).toBeNull();
    expect(config.usingDefaultKey).toBe(false);
  });

  it('uses model override when set', () => {
    const state = {
      providerKeys: { anthropic: 'sk-test', openai: '', gemini: '', openai_compatible: '' },
      activeProvider: 'anthropic',
      activeModels: { anthropic: 'claude-haiku-4-5-20251001' },
    };
    const config = buildLLMConfig(state);
    expect(config.model).toBe('claude-haiku-4-5-20251001');
  });

  it('includes baseUrl for openai_compatible provider', () => {
    const state = {
      providerKeys: { anthropic: '', openai: '', gemini: '', openai_compatible: 'sk-test' },
      activeProvider: 'openai_compatible',
      activeModels: { openai_compatible: 'deepseek-chat' },
      customBaseUrl: 'https://api.deepseek.com',
    };
    const config = buildLLMConfig(state);
    expect(config.provider).toBe('openai_compatible');
    expect(config.baseUrl).toBe('https://api.deepseek.com');
  });

  it('does not include baseUrl for non-compatible providers', () => {
    const state = {
      providerKeys: { anthropic: 'sk-test', openai: '', gemini: '', openai_compatible: '' },
      activeProvider: 'anthropic',
      activeModels: { anthropic: null },
      customBaseUrl: 'https://example.com',
    };
    const config = buildLLMConfig(state);
    expect(config.baseUrl).toBeNull();
  });

  it('defaults to anthropic when activeProvider is missing', () => {
    const state = {
      providerKeys: { anthropic: 'sk-test', openai: '', gemini: '', openai_compatible: '' },
      activeModels: {},
    };
    const config = buildLLMConfig(state);
    expect(config.provider).toBe('anthropic');
  });

  it('returns empty apiKey when no key is set for active provider', () => {
    const state = {
      providerKeys: { anthropic: '', openai: 'sk-openai', gemini: '', openai_compatible: '' },
      activeProvider: 'anthropic',
      activeModels: {},
    };
    const config = buildLLMConfig(state);
    expect(config.apiKey).toBe('');
  });
});
