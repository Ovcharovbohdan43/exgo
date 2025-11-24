/**
 * Category Localization Utilities
 * 
 * Provides functions to get localized category names
 */

import i18n from '../i18n';

/**
 * Get localized name for a category
 * @param category - Category name (English key)
 * @returns Localized category name or original if translation not found
 */
export const getLocalizedCategory = (category: string): string => {
  try {
    const translation = i18n.t(`categories.${category}`, { defaultValue: category });
    return translation;
  } catch (error) {
    // Fallback to original category name if translation fails
    return category;
  }
};

/**
 * Get localized names for multiple categories
 * @param categories - Array of category names
 * @returns Array of localized category names
 */
export const getLocalizedCategories = (categories: string[]): string[] => {
  return categories.map(cat => getLocalizedCategory(cat));
};

