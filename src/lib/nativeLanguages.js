/**
 * Native (explanation) language registry.
 * Simpler than target language configs — just identity + locale.
 */

const NATIVE_LANGUAGES = {
  en: { id: 'en', name: 'English', locale: 'en' },
  zh: { id: 'zh', name: '中文 (Simplified)', locale: 'zh-CN' },
  ko: { id: 'ko', name: '한국어', locale: 'ko' },
  fr: { id: 'fr', name: 'Français', locale: 'fr' },
  es: { id: 'es', name: 'Español', locale: 'es' },
  ja: { id: 'ja', name: '日本語', locale: 'ja' },
};

export function getNativeLang(id) {
  return NATIVE_LANGUAGES[id] || NATIVE_LANGUAGES.en;
}

export function getAllNativeLanguages() {
  return Object.values(NATIVE_LANGUAGES);
}

export const DEFAULT_NATIVE_LANG = 'en';
