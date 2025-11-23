import { CustomCategory } from '../types';

/**
 * Mapping of expense categories to emojis
 */
export const CATEGORY_EMOJIS: Record<string, string> = {
  'Groceries': '🛒',
  'Fuel': '⛽',
  'Rent': '🏠',
  'Utilities': '💡',
  'Transport & Public Transit': '🚌',
  'Dining Out & Cafes': '🍽️',
  'Entertainment & Leisure': '🎬',
  'Shopping & Clothing': '🛍️',
  'Health & Pharmacy': '💊',
  'Kids & Family': '👨‍👩‍👧‍👦',
  'Subscriptions & Services': '📱',
  'Education & Courses': '📚',
  'Other / Miscellaneous': '📦',
  'Income': '💰',
  'Savings': '💾',
};

/**
 * Get emoji for a category
 * @param category - Category name
 * @param customCategories - Optional array of custom categories with emojis
 * @returns Emoji string or empty string if not found
 */
export const getCategoryEmoji = (
  category: string | null | undefined,
  customCategories?: CustomCategory[]
): string => {
  if (!category) return '';
  
  // Check custom categories first
  if (customCategories) {
    const customCategory = customCategories.find((cat) => cat.name === category);
    if (customCategory) {
      return customCategory.emoji;
    }
  }
  
  // Fall back to default emojis
  return CATEGORY_EMOJIS[category] || '📦';
};

