/**
 * API key and LLM provider storage.
 *
 * Extracted from storage.js — handles persisting provider keys,
 * active provider/model selection, custom base URLs, grading models,
 * and compatibility presets.
 *
 * API keys are deliberately NOT synced to file or cloud — they stay local only.
 */

import { load, save } from './storageHelpers';

// ── localStorage key constants ───────────────────────────────

const KEYS = {
  API_KEY: 'gradedReader_apiKey',
  PROVIDER_KEYS: 'gradedReader_providerKeys',
  ACTIVE_PROVIDER: 'gradedReader_activeProvider',
  ACTIVE_MODEL: 'gradedReader_activeModel',
  CUSTOM_BASE_URL: 'gradedReader_customBaseUrl',
  CUSTOM_MODEL_NAME: 'gradedReader_customModelName',
  GRADING_MODELS: 'gradedReader_gradingModels',
  COMPAT_PRESET: 'gradedReader_compatPreset',
};

// ── API Key ───────────────────────────────────────────────────
// Deliberately NOT synced to file — key stays local only.

export function saveApiKey(key) {
  save(KEYS.API_KEY, key);
}

export function loadApiKey() {
  return load(KEYS.API_KEY, '');
}

export function clearApiKey() {
  localStorage.removeItem(KEYS.API_KEY);
}

// ── Provider Keys (multi-LLM) ─────────────────────────────────
// Deliberately NOT synced to file or cloud — keys stay local only.

export function loadProviderKeys() {
  let keys = load(KEYS.PROVIDER_KEYS, null);
  if (!keys) {
    // Migrate from old single apiKey if it exists
    const oldKey = load(KEYS.API_KEY, '');
    keys = { anthropic: oldKey || '', openai: '', gemini: '', openai_compatible: '' };
    if (oldKey) {
      save(KEYS.PROVIDER_KEYS, keys);
      localStorage.removeItem(KEYS.API_KEY);
    }
  }
  return keys;
}

export function saveProviderKeys(keys) {
  save(KEYS.PROVIDER_KEYS, keys);
}

// ── Active Provider ──────────────────────────────────────────

export function loadActiveProvider() {
  return load(KEYS.ACTIVE_PROVIDER, 'anthropic');
}

export function saveActiveProvider(id) {
  save(KEYS.ACTIVE_PROVIDER, id);
}

// ── Active Models (per-provider map) ─────────────────────────

export function loadActiveModels() {
  const map = load(KEYS.ACTIVE_MODEL, null);
  if (map && typeof map === 'object' && !Array.isArray(map)) return map;
  // Migrate from old single-string activeModel
  const legacy = typeof map === 'string' ? map : null;
  const fresh = { anthropic: null, openai: null, gemini: null, openai_compatible: null };
  if (legacy) {
    // Assign legacy model to current active provider (best guess)
    const provider = loadActiveProvider();
    fresh[provider] = legacy;
    save(KEYS.ACTIVE_MODEL, fresh);
  }
  return fresh;
}

export function saveActiveModels(map) {
  save(KEYS.ACTIVE_MODEL, map);
}

// ── Custom Base URL ──────────────────────────────────────────

export function loadCustomBaseUrl() {
  return load(KEYS.CUSTOM_BASE_URL, '');
}

export function saveCustomBaseUrl(url) {
  save(KEYS.CUSTOM_BASE_URL, url);
}

// ── Custom Model Name ────────────────────────────────────────

export function loadCustomModelName() {
  return load(KEYS.CUSTOM_MODEL_NAME, '');
}

export function saveCustomModelName(name) {
  save(KEYS.CUSTOM_MODEL_NAME, name);
}

// ── Grading models (per-provider) ─────────────────────────────

export function loadGradingModels() {
  return load(KEYS.GRADING_MODELS, { anthropic: null, openai: null, gemini: null, openai_compatible: null });
}

export function saveGradingModels(map) {
  save(KEYS.GRADING_MODELS, map);
}

// ── Compatibility preset ─────────────────────────────────────

export function loadCompatPreset() {
  return load(KEYS.COMPAT_PRESET, 'deepseek');
}

export function saveCompatPreset(preset) {
  save(KEYS.COMPAT_PRESET, preset);
}
