/**
 * Native (explanation) language registry.
 * Simpler than target language configs — just identity + locale.
 */

const NATIVE_LANGUAGES = {
  en: { id: 'en', name: 'English', locale: 'en', shortLabel: 'EN' },
  zh: { id: 'zh', name: '中文 (Simplified)', locale: 'zh-CN', shortLabel: '中文' },
  yue: { id: 'yue', name: '粵語', locale: 'yue', shortLabel: '粵語' },
  ko: { id: 'ko', name: '한국어', locale: 'ko', shortLabel: '한국' },
  fr: { id: 'fr', name: 'Français', locale: 'fr', shortLabel: 'FR' },
  es: { id: 'es', name: 'Español', locale: 'es', shortLabel: 'ES' },
};

export function getNativeLang(id) {
  return NATIVE_LANGUAGES[id] || NATIVE_LANGUAGES.en;
}

export function getAllNativeLanguages() {
  return Object.values(NATIVE_LANGUAGES);
}

export const DEFAULT_NATIVE_LANG = 'en';
