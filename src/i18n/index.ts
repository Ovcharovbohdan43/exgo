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
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || 'en';
};

