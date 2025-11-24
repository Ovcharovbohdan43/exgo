/**
 * Accessibility Utilities
 * 
 * Provides constants and helpers for accessibility features.
 * Ensures consistent hit targets and accessibility labels across the app.
 * 
 * @module utils/accessibility
 */

/**
 * Minimum hit target size (44x44 points) as recommended by Apple HIG and Material Design
 * https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/
 * https://material.io/design/usability/accessibility.html#layout-and-typography
 */
export const MIN_HIT_SLOP = {
  top: 12,
  bottom: 12,
  left: 12,
  right: 12,
};

/**
 * Standard hit slop for buttons
 */
export const BUTTON_HIT_SLOP = MIN_HIT_SLOP;

/**
 * Hit slop for small interactive elements (icons, etc.)
 */
export const SMALL_HIT_SLOP = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
};

/**
 * Hit slop for large interactive elements
 */
export const LARGE_HIT_SLOP = {
  top: 16,
  bottom: 16,
  left: 16,
  right: 16,
};

/**
 * Creates an accessibility label for a transaction
 */
export const getTransactionAccessibilityLabel = (
  type: 'expense' | 'income' | 'saved',
  category: string,
  amount: number,
  currency: string,
  date: string
): string => {
  const typeLabel = type === 'expense' ? 'Expense' : type === 'income' ? 'Income' : 'Saved';
  const amountLabel = `${type === 'expense' ? '-' : '+'}${amount} ${currency}`;
  const dateObj = new Date(date);
  const dateLabel = dateObj.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  
  return `${typeLabel}, ${category}, ${amountLabel}, ${dateLabel}`;
};

/**
 * Creates an accessibility hint for a button
 */
export const getButtonAccessibilityHint = (action: string): string => {
  return `Double tap to ${action.toLowerCase()}`;
};


