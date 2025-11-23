import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadTransactions, saveTransactions, loadCurrentMonth, saveCurrentMonth } from '../services/storage';
import { Transaction, TransactionType } from '../types';
import { getMonthKey, getPreviousMonthKey, getNextMonthKey } from '../utils/month';
import { useSettings } from './SettingsProvider';

export type TransactionsError = {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
};

type TransactionsContextValue = {
  transactionsByMonth: Record<string, Transaction[]>; // All transactions grouped by month
  currentMonth: string; // Current selected month key (YYYY-MM)
  transactions: Transaction[]; // Transactions for current selected month
  hydrated: boolean;
  loading: boolean;
  error: TransactionsError | null;
  setCurrentMonth: (monthKey: string) => Promise<void>;
  addTransaction: (input: {
    amount: number;
    type: TransactionType;
    category?: string;
    createdAt?: string;
  }) => Promise<void>;
  updateTransaction: (id: string, input: {
    amount: number;
    type: TransactionType;
    category?: string;
    createdAt?: string;
  }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  resetTransactions: () => Promise<void>;
  retryHydration: () => Promise<void>;
  hasMonthData: (monthKey: string) => boolean; // Check if month has any transactions
};

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [transactionsByMonth, setTransactionsByMonth] = useState<Record<string, Transaction[]>>({});
  const [currentMonth, setCurrentMonthState] = useState<string>(getMonthKey());
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TransactionsError | null>(null);

  // Get transactions for current selected month
  const transactions = useMemo(() => {
    return transactionsByMonth[currentMonth] || [];
  }, [transactionsByMonth, currentMonth]);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [storedTransactions, storedCurrentMonth] = await Promise.all([
        loadTransactions(),
        loadCurrentMonth(),
      ]);
      
      if (storedTransactions) {
        setTransactionsByMonth(storedTransactions);
      } else {
        setTransactionsByMonth({});
      }
      
      // Set current month from storage, or use firstMonthKey from settings, or default to current month
      let monthKey = storedCurrentMonth;
      if (!monthKey && settings.firstMonthKey) {
        monthKey = settings.firstMonthKey;
        // Save it for future use
        await saveCurrentMonth(monthKey);
      }
      if (!monthKey) {
        monthKey = getMonthKey();
      }
      setCurrentMonthState(monthKey);
      
      setHydrated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError({
        message: errorMessage,
        code: 'HYDRATION_ERROR',
        retry: hydrate,
      });
      // Fallback to empty on error
      setTransactionsByMonth({});
      setCurrentMonthState(getMonthKey());
      setHydrated(true); // Still mark as hydrated to allow app to continue
      console.error('[TransactionsProvider] Hydration error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
  
  // Update currentMonth when firstMonthKey is set (e.g., after onboarding)
  useEffect(() => {
    if (settings.firstMonthKey && hydrated) {
      // If we don't have a stored currentMonth, use firstMonthKey
      loadCurrentMonth().then((stored) => {
        if (!stored && settings.firstMonthKey) {
          setCurrentMonthState(settings.firstMonthKey);
          saveCurrentMonth(settings.firstMonthKey).catch(console.error);
        }
      }).catch(console.error);
    }
  }, [settings.firstMonthKey, hydrated]);

  const persist = useCallback(
    async (next: Record<string, Transaction[]>): Promise<void> => {
      setError(null);
      // Optimistic update: update state immediately for better UX
      setTransactionsByMonth(next);
      try {
        await saveTransactions(next);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save transactions';
        setError({
          message: errorMessage,
          code: 'SAVE_ERROR',
          retry: async () => {
            await persist(next);
          },
        });
        // State is already updated optimistically, so UI stays consistent
        console.error('[TransactionsProvider] Save error:', err);
        throw err; // Re-throw to allow caller to handle
      }
    },
    [],
  );

  const setCurrentMonth: TransactionsContextValue['setCurrentMonth'] = useCallback(
    async (monthKey: string) => {
      setCurrentMonthState(monthKey);
      try {
        await saveCurrentMonth(monthKey);
      } catch (err) {
        console.error('[TransactionsProvider] Failed to save current month:', err);
        // Don't throw, just log - month state is updated optimistically
      }
    },
    [],
  );

  const addTransaction: TransactionsContextValue['addTransaction'] = useCallback(
    async ({ amount, type, category, createdAt }) => {
      const tx: Transaction = {
        id: uuidv4(),
        amount,
        type,
        category,
        createdAt: createdAt ?? new Date().toISOString(),
      };
      
      // Determine which month this transaction belongs to
      const txDate = new Date(tx.createdAt);
      const txMonthKey = getMonthKey(txDate);
      
      // Get current month's transactions or create empty array
      const monthTransactions = transactionsByMonth[txMonthKey] || [];
      const updatedMonthTransactions = [...monthTransactions, tx];
      
      // Update transactions by month
      const next = {
        ...transactionsByMonth,
        [txMonthKey]: updatedMonthTransactions,
      };
      
      await persist(next);
    },
    [transactionsByMonth, persist],
  );

  const updateTransaction: TransactionsContextValue['updateTransaction'] = useCallback(
    async (id: string, { amount, type, category, createdAt }) => {
      // Find which month contains this transaction
      let foundMonthKey: string | null = null;
      for (const [monthKey, monthTransactions] of Object.entries(transactionsByMonth)) {
        if (monthTransactions.some((tx) => tx.id === id)) {
          foundMonthKey = monthKey;
          break;
        }
      }
      
      if (!foundMonthKey) {
        throw new Error(`Transaction ${id} not found`);
      }
      
      // Update transaction in its month
      const monthTransactions = transactionsByMonth[foundMonthKey];
      const updatedMonthTransactions = monthTransactions.map((tx) =>
        tx.id === id
          ? {
              ...tx,
              amount,
              type,
              category,
              createdAt: createdAt ?? tx.createdAt,
            }
          : tx
      );
      
      const next = {
        ...transactionsByMonth,
        [foundMonthKey]: updatedMonthTransactions,
      };
      
      await persist(next);
    },
    [transactionsByMonth, persist],
  );

  const deleteTransaction: TransactionsContextValue['deleteTransaction'] = useCallback(
    async (id: string) => {
      // Find which month contains this transaction
      let foundMonthKey: string | null = null;
      for (const [monthKey, monthTransactions] of Object.entries(transactionsByMonth)) {
        if (monthTransactions.some((tx) => tx.id === id)) {
          foundMonthKey = monthKey;
          break;
        }
      }
      
      if (!foundMonthKey) {
        throw new Error(`Transaction ${id} not found`);
      }
      
      // Remove transaction from its month
      const monthTransactions = transactionsByMonth[foundMonthKey];
      const updatedMonthTransactions = monthTransactions.filter((tx) => tx.id !== id);
      
      const next = {
        ...transactionsByMonth,
        [foundMonthKey]: updatedMonthTransactions,
      };
      
      await persist(next);
    },
    [transactionsByMonth, persist],
  );

  const resetTransactions = useCallback(async () => {
    await persist({});
  }, [persist]);

  const hasMonthData: TransactionsContextValue['hasMonthData'] = useCallback(
    (monthKey: string) => {
      const monthTransactions = transactionsByMonth[monthKey];
      return monthTransactions && monthTransactions.length > 0;
    },
    [transactionsByMonth],
  );


  const retryHydration = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const value = useMemo(
    () => ({
      transactionsByMonth,
      currentMonth,
      transactions,
      hydrated,
      loading,
      error,
      setCurrentMonth,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      resetTransactions,
      retryHydration,
      hasMonthData,
    }),
    [transactionsByMonth, currentMonth, transactions, hydrated, loading, error, setCurrentMonth, addTransaction, updateTransaction, deleteTransaction, resetTransactions, retryHydration, hasMonthData],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
};

export const useTransactions = () => {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
};
