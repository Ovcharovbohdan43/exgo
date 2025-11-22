import { Transaction } from '../types';
import { isCurrentMonth } from '../utils/date';

interface Totals {
  income: number;
  expenses: number;
  saved: number;
  remaining: number;
  chartRemaining: number;
}

export const filterCurrentMonth = (transactions: Transaction[]): Transaction[] =>
  transactions.filter((tx) => isCurrentMonth(tx.createdAt));

export const calculateTotals = (transactions: Transaction[], monthlyIncome: number): Totals => {
  const monthly = filterCurrentMonth(transactions);

  const expenses = monthly
    .filter((tx) => tx.type === 'expense')
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
  const expenses = filterCurrentMonth(transactions).filter((tx) => tx.type === 'expense');
  const total = expenses.reduce((sum, tx) => sum + tx.amount, 0) || 1;

  return expenses.reduce<Record<string, { amount: number; percent: number }>>((acc, tx) => {
    if (!tx.category) return acc;
    const current = acc[tx.category] ?? { amount: 0, percent: 0 };
    const nextAmount = current.amount + tx.amount;
    acc[tx.category] = { amount: nextAmount, percent: (nextAmount / total) * 100 };
    return acc;
  }, {});
};
