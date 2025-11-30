import { Transaction } from '../types';

interface Totals {
  income: number;
  expenses: number;
  saved: number;
  remaining: number;
  chartRemaining: number;
}

/**
 * Filter transactions for a specific month
 * @param transactions - All transactions
 * @param monthKey - Month key in format YYYY-MM
 */
export const filterByMonth = (transactions: Transaction[], monthKey: string): Transaction[] => {
  const [year, month] = monthKey.split('-').map(Number);
  return transactions.filter((tx) => {
    const txDate = new Date(tx.createdAt);
    return txDate.getFullYear() === year && txDate.getMonth() === month - 1;
  });
};

export const calculateTotals = (transactions: Transaction[], monthlyIncome: number): Totals => {
  // transactions are already filtered for the selected month
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to start of day for accurate date comparison
  
  // Filter out transactions with future dates - they shouldn't affect balance until the date arrives
  // This ensures scheduled transactions don't affect balance until they actually occur
  const monthly = transactions.filter((tx) => {
    const txDate = new Date(tx.createdAt);
    txDate.setHours(0, 0, 0, 0); // Reset time to start of day
    return txDate <= now; // Only include transactions that have occurred (today or earlier)
  });

  // Expenses include both 'expense' and 'credit' transactions
  // Credit transactions are payments made to pay off debt, so they count as expenses
  const expenses = monthly
    .filter((tx) => tx.type === 'expense' || tx.type === 'credit')
    .reduce((sum, tx) => sum + Math.max(tx.amount, 0), 0);

  const saved = monthly
    .filter((tx) => tx.type === 'saved')
    .reduce((sum, tx) => sum + Math.max(tx.amount, 0), 0);

  // Calculate total income: monthly income + income transactions
  const incomeTransactions = monthly
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Math.max(tx.amount, 0), 0);

  const totalIncome = monthlyIncome + incomeTransactions;
  const remaining = totalIncome - (expenses + saved);
  
  return {
    income: totalIncome, // Total income including transactions
    expenses,
    saved,
    remaining,
    chartRemaining: Math.max(remaining, 0),
  };
};

export const categoryBreakdown = (transactions: Transaction[]) => {
  // transactions are already filtered for the selected month
  // Include both 'expense' and 'credit' transactions in breakdown
  // Credit transactions are payments made to pay off debt, so they count as expenses
  const expenses = transactions.filter((tx) => tx.type === 'expense' || tx.type === 'credit');
  const total = expenses.reduce((sum, tx) => sum + tx.amount, 0) || 1;

  return expenses.reduce<Record<string, { amount: number; percent: number }>>((acc, tx) => {
    if (!tx.category) return acc;
    // Normalize credit category to 'Credits' for consistency
    const categoryName = tx.type === 'credit' && tx.category === 'Credit' ? 'Credits' : tx.category;
    const current = acc[categoryName] ?? { amount: 0, percent: 0 };
    const nextAmount = current.amount + tx.amount;
    acc[categoryName] = { amount: nextAmount, percent: (nextAmount / total) * 100 };
    return acc;
  }, {});
};
