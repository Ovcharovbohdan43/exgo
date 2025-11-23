import { useMemo } from 'react';
import { Transaction, UserSettings } from '../types';
import { calculateTotals, categoryBreakdown } from '../modules/calculations';
import { filterByMonth } from '../modules/calculations';

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
 * Memoized selector for transactions filtered by month
 * @param transactions - All transactions
 * @param monthKey - Month key in format YYYY-MM
 */
export const useTransactionsByMonth = (transactions: Transaction[], monthKey: string) => {
  return useMemo(() => {
    return filterByMonth(transactions, monthKey);
  }, [transactions, monthKey]);
};

/**
 * @deprecated Use useTransactionsByMonth instead
 * Kept for backward compatibility
 */
export const useCurrentMonthTransactions = (transactions: Transaction[]) => {
  return useMemo(() => {
    // Return transactions as-is since they're already filtered by month in provider
    return transactions;
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
    const sorted = [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    
    console.log('[useRecentTransactions] Computing recent transactions:', {
      inputCount: transactions.length,
      outputCount: sorted.length,
      transactionIds: sorted.map(tx => tx.id),
      limit,
    });
    
    return sorted;
  }, [transactions, limit]);
};

