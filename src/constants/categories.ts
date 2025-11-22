export const EXPENSE_CATEGORIES = [
  'Groceries',
  'Fuel',
  'Rent',
  'Utilities',
  'Transport & Public Transit',
  'Dining Out & Cafes',
  'Entertainment & Leisure',
  'Shopping & Clothing',
  'Health & Pharmacy',
  'Kids & Family',
  'Subscriptions & Services',
  'Education & Courses',
  'Other / Miscellaneous',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
