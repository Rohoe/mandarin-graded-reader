import { describe, it, expect } from 'vitest';
import { PROVIDERS, getProvider, DEFAULT_PROVIDER } from './providers';

describe('PROVIDERS registry', () => {
  it('has all four providers', () => {
    expect(Object.keys(PROVIDERS)).toEqual(['anthropic', 'openai', 'gemini', 'openai_compatible']);
  });

  it('each provider has required fields', () => {
    for (const [id, provider] of Object.entries(PROVIDERS)) {
      expect(provider.id).toBe(id);
      expect(provider.name).toBeTruthy();
      expect(provider.keyPlaceholder).toBeTruthy();
      expect(typeof provider.defaultModel).toBe('string');
      expect(Array.isArray(provider.models)).toBe(true);
    }
  });

  it('openai_compatible has presets', () => {
    const compat = PROVIDERS.openai_compatible;
    expect(compat.presets).toBeTruthy();
    expect(compat.presets.length).toBeGreaterThanOrEqual(3);
    const presetIds = compat.presets.map(p => p.id);
    expect(presetIds).toContain('deepseek');
    expect(presetIds).toContain('groq');
    expect(presetIds).toContain('custom');
  });
});

describe('getProvider', () => {
  it('returns correct provider by id', () => {
    expect(getProvider('anthropic').name).toBe('Anthropic (Claude)');
    expect(getProvider('openai').name).toBe('OpenAI');
    expect(getProvider('gemini').name).toBe('Google Gemini');
  });

  it('falls back to anthropic for unknown id', () => {
    const result = getProvider('nonexistent');
    expect(result.id).toBe('anthropic');
  });
});

describe('DEFAULT_PROVIDER', () => {
  it('is anthropic', () => {
    expect(DEFAULT_PROVIDER).toBe('anthropic');
  });
});
