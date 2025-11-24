/**
 * Month utility functions for working with monthly data
 */

import { getCurrentLanguage } from '../i18n';

/**
 * Get month key in format YYYY-MM (e.g., "2024-11")
 */
export const getMonthKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Parse month key to Date object
 */
export const parseMonthKey = (monthKey: string): Date => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

/**
 * Get previous month key
 */
export const getPreviousMonthKey = (monthKey: string): string => {
  const date = parseMonthKey(monthKey);
  date.setMonth(date.getMonth() - 1);
  return getMonthKey(date);
};

/**
 * Get next month key
 */
export const getNextMonthKey = (monthKey: string): string => {
  const date = parseMonthKey(monthKey);
  date.setMonth(date.getMonth() + 1);
  return getMonthKey(date);
};

/**
 * Format month key to readable string (e.g., "November 2024")
 * Uses current i18n language for localization
 */
export const formatMonthName = (monthKey: string): string => {
  const date = parseMonthKey(monthKey);
  const currentLang = getCurrentLanguage();
  // Map language codes to locale codes
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'uk': 'uk-UA',
  };
  const locale = localeMap[currentLang] || 'en-US';
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

/**
 * Format month key to short string (e.g., "Nov 2024")
 * Uses current i18n language for localization
 */
export const formatMonthShort = (monthKey: string): string => {
  const date = parseMonthKey(monthKey);
  const currentLang = getCurrentLanguage();
  // Map language codes to locale codes
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'uk': 'uk-UA',
  };
  const locale = localeMap[currentLang] || 'en-US';
  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
};

/**
 * Check if month key is current month
 */
export const isCurrentMonth = (monthKey: string): boolean => {
  return monthKey === getMonthKey();
};

/**
 * Check if month key is in the future
 */
export const isFutureMonth = (monthKey: string): boolean => {
  const date = parseMonthKey(monthKey);
  const now = new Date();
  return date > new Date(now.getFullYear(), now.getMonth(), 1);
};

/**
 * Check if month key is within last 12 months
 */
export const isWithinLastYear = (monthKey: string): boolean => {
  const date = parseMonthKey(monthKey);
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  return date >= oneYearAgo;
};


