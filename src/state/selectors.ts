import { useMemo } from 'react';
import { Transaction, UserSettings } from '../types';
import { calculateTotals, categoryBreakdown } from '../modules/calculations';

/**
 * Memoized selector for monthly totals
 */
export const useMonthlyTotals = (
  transactions: Transaction[],
  monthlyIncome: number,
) => {
  return useMemo(() => {
    return calculateTotals(transactions, monthlyIncome);
  }, [transactions, monthlyIncome]);
};

/**
 * Memoized selector for category breakdown
 */
export const useCategoryBreakdown = (transactions: Transaction[]) => {
  return useMemo(() => {
    return categoryBreakdown(transactions);
  }, [transactions]);
};

/**
 * Memoized selector for current month transactions
 */
export const useCurrentMonthTransactions = (transactions: Transaction[]) => {
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((tx) => {
      const txDate = new Date(tx.createdAt);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
  }, [transactions]);
};

/**
 * Memoized selector for transactions by type
 */
export const useTransactionsByType = (
  transactions: Transaction[],
  type: Transaction['type'],
) => {
  return useMemo(() => {
    return transactions.filter((tx) => tx.type === type);
  }, [transactions, type]);
};

/**
 * Memoized selector for last transaction
 */
export const useLastTransaction = (transactions: Transaction[]) => {
  return useMemo(() => {
    if (transactions.length === 0) return null;
    return [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [transactions]);
};

/**
 * Memoized selector for recent transactions (sorted by date, newest first)
 */
export const useRecentTransactions = (
  transactions: Transaction[],
  limit: number = 5,
) => {
  return useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [transactions, limit]);
};

