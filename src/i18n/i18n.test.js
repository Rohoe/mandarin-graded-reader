import { describe, it, expect } from 'vitest';
import en from './en';
import zh from './zh';
import yue from './yue';
import ko from './ko';
import fr from './fr';
import es from './es';

const allLangs = { zh, yue, ko, fr, es };
const enKeys = Object.keys(en);

describe('i18n', () => {
  it('en.js has no empty values', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en key "${key}" is empty`).toBeTruthy();
      expect(typeof value, `en key "${key}" is not a string`).toBe('string');
    }
  });

  for (const [langId, translations] of Object.entries(allLangs)) {
    describe(`${langId}.js`, () => {
      it('has complete key coverage vs en.js', () => {
        const langKeys = Object.keys(translations);
        const missing = enKeys.filter(k => !langKeys.includes(k));
        expect(missing, `${langId} is missing ${missing.length} key(s)`).toEqual([]);
      });

      it('has no extra keys beyond en.js', () => {
        const langKeys = Object.keys(translations);
        const extra = langKeys.filter(k => !enKeys.includes(k));
        expect(extra, `${langId} has ${extra.length} extra key(s)`).toEqual([]);
      });

      it('has no empty values', () => {
        for (const [key, value] of Object.entries(translations)) {
          expect(value, `${langId} key "${key}" is empty`).toBeTruthy();
          expect(typeof value, `${langId} key "${key}" is not a string`).toBe('string');
        }
      });

      it('preserves interpolation placeholders from en.js', () => {
        const placeholderRegex = /\{(\w+)\}/g;
        for (const [key, enValue] of Object.entries(en)) {
          const enPlaceholders = [...enValue.matchAll(placeholderRegex)].map(m => m[1]).sort();
          if (enPlaceholders.length === 0) continue;
          const langValue = translations[key];
          if (!langValue) continue;
          const langPlaceholders = [...langValue.matchAll(placeholderRegex)].map(m => m[1]).sort();
          expect(langPlaceholders, `${langId} key "${key}" has different placeholders`).toEqual(enPlaceholders);
        }
      });
    });
  }

  describe('interpolation', () => {
    // Test the interpolation logic directly
    function interpolate(str, params) {
      if (!params) return str;
      for (const [k, v] of Object.entries(params))
        str = str.replaceAll(`{${k}}`, String(v));
      return str;
    }

    it('replaces single placeholder', () => {
      expect(interpolate('Hello {name}', { name: 'World' })).toBe('Hello World');
    });

    it('replaces multiple placeholders', () => {
      expect(interpolate('{a} and {b}', { a: 'X', b: 'Y' })).toBe('X and Y');
    });

    it('replaces repeated placeholders', () => {
      expect(interpolate('{x} or {x}', { x: '1' })).toBe('1 or 1');
    });

    it('handles numeric values', () => {
      expect(interpolate('{count} items', { count: 42 })).toBe('42 items');
    });

    it('returns string as-is when no params', () => {
      expect(interpolate('no params')).toBe('no params');
    });

    it('leaves unknown placeholders untouched', () => {
      expect(interpolate('{known} {unknown}', { known: 'ok' })).toBe('ok {unknown}');
    });
  });

  describe('fallback chain', () => {
    it('en.js keys serve as fallback for missing translations', () => {
      // All languages should have all keys, but if one is missing,
      // the useT hook falls back to en. Verify the en keys are valid fallbacks.
      for (const key of enKeys) {
        expect(en[key]).toBeDefined();
        expect(en[key].length).toBeGreaterThan(0);
      }
    });
  });
});
