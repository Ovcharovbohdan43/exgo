export const formatCurrency = (value: number, currency = 'USD'): string => {
  return Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
};
