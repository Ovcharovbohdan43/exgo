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
 * @returns Emoji string or empty string if not found
 */
export const getCategoryEmoji = (category: string | null | undefined): string => {
  if (!category) return '';
  return CATEGORY_EMOJIS[category] || '📦';
};

