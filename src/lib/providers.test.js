import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PROVIDERS, getProvider, DEFAULT_PROVIDER, formatModelLabel, fetchProviderModels } from './providers';

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

// ── formatModelLabel ─────────────────────────────────────────

describe('formatModelLabel', () => {
  it.each([
    ['claude-sonnet-4-20250514',   'Claude Sonnet 4'],
    ['claude-haiku-4-5-20251001',  'Claude Haiku 4 5'],
    ['gpt-4o-mini',                'GPT 4o Mini'],
    ['gpt-4o',                     'GPT 4o'],
    ['gpt-4.1',                    'GPT 4.1'],
    ['gpt-4.1-mini',               'GPT 4.1 Mini'],
    ['gemini-2.5-pro',             'Gemini 2.5 Pro'],
    ['deepseek-chat',              'Deepseek Chat'],
  ])('formats "%s" as "%s"', (input, expected) => {
    expect(formatModelLabel(input)).toBe(expected);
  });
});

// ── fetchProviderModels ──────────────────────────────────────

describe('fetchProviderModels', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no API key is provided', async () => {
    const result = await fetchProviderModels('anthropic', '', undefined);
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))));
    const result = await fetchProviderModels('anthropic', 'sk-test', undefined);
    expect(result).toBeNull();
  });

  it('returns null for unknown provider', async () => {
    const result = await fetchProviderModels('unknown', 'sk-test', undefined);
    expect(result).toBeNull();
  });

  it('fetches and formats Anthropic models', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 'claude-sonnet-4-20250514' },
          { id: 'claude-haiku-4-5-20251001' },
          { id: 'not-claude-model' },
        ],
      }),
    })));
    const result = await fetchProviderModels('anthropic', 'sk-test', undefined);
    expect(result).toHaveLength(2); // filters to claude- models only
    expect(result[0].id).toContain('claude-');
    expect(result[0].label).toBeTruthy();
  });

  it('fetches and formats OpenAI models', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: 'gpt-4o' },
          { id: 'gpt-4o-mini' },
          { id: 'whisper-1' }, // should be filtered out
        ],
      }),
    })));
    const result = await fetchProviderModels('openai', 'sk-test', undefined);
    expect(result).toHaveLength(2); // whisper filtered
    expect(result.every(m => m.id.startsWith('gpt-'))).toBe(true);
  });

  it('returns null when API returns non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 401 })));
    const result = await fetchProviderModels('anthropic', 'sk-test', undefined);
    expect(result).toBeNull();
  });
});
