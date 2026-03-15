import { useAppSelector } from '../context/useAppSelector';
import en from './en';
import zh from './zh';
import yue from './yue';
import ko from './ko';
import fr from './fr';
import es from './es';

const translations = { en, zh, yue, ko, fr, es };

/**
 * Hook that returns a translation function `t(key, params)`.
 * Reads `nativeLang` from app state; falls back English -> raw key.
 * Simple `{param}` interpolation for dynamic values.
 */
export function useT() {
  const nativeLang = useAppSelector(s => s.nativeLang);
  const lang = translations[nativeLang] || translations.en;
  return function t(key, params) {
    let str = lang[key] ?? en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params))
        str = str.replaceAll(`{${k}}`, String(v));
    }
    return str;
  };
}

/**
 * Non-hook helper for use outside React components (e.g. in event handlers
 * that already have the nativeLang value).
 */
export function getT(nativeLang) {
  const lang = translations[nativeLang] || translations.en;
  return function t(key, params) {
    let str = lang[key] ?? en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params))
        str = str.replaceAll(`{${k}}`, String(v));
    }
    return str;
  };
}
