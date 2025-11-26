/**
 * i18n Configuration
 * 
 * Internationalization setup using i18next
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import uk from './locales/uk.json';

export type SupportedLanguage = 'en' | 'uk';

export const supportedLanguages: { code: SupportedLanguage; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'uk', name: 'Українська' },
];

const resources = {
  en: {
    translation: en,
  },
  uk: {
    translation: uk,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    compatibilityJSON: 'v3', // For React Native compatibility
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;

/**
 * Change language
 */
export const changeLanguage = (lang: SupportedLanguage) => {
  i18n.changeLanguage(lang);
};

/**
 * Get current language
 * Handles cases where i18n.language might be 'uk-UA' or 'en-US' instead of 'uk' or 'en'
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  const lang = i18n.language || 'en';
  
  // Handle locale codes like 'uk-UA', 'en-US', etc.
  if (lang.startsWith('uk')) {
    return 'uk';
  }
  if (lang.startsWith('en')) {
    return 'en';
  }
  
  // Fallback to 'en' if language is not recognized
  return 'en';
};

