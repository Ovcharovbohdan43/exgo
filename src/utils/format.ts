/**
 * Format a number as currency using Intl.NumberFormat
 * @param value - The numeric value to format
 * @param currency - Currency code (e.g., 'USD', 'GBP', 'EUR'). Defaults to 'USD' if not provided.
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, currency = 'USD'): string => {
  return Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
};

/**
 * Get currency symbol for a given currency code
 * @param currency - Currency code (e.g., 'USD', 'GBP', 'EUR')
 * @returns Currency symbol (e.g., '$', '£', '€')
 */
export const getCurrencySymbol = (currency: string): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(0)
      .replace(/[\d\s.,]/g, '')
      .trim();
  } catch {
    // Fallback to currency code if formatting fails
    return currency;
  }
};
