import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadTransactions, saveTransactions } from '../services/storage';
import { Transaction, TransactionType } from '../types';

export type TransactionsError = {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
};

type TransactionsContextValue = {
  transactions: Transaction[];
  hydrated: boolean;
  loading: boolean;
  error: TransactionsError | null;
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
};

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TransactionsError | null>(null);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const stored = await loadTransactions();
      if (stored) {
        setTransactions(stored);
      } else {
        setTransactions([]);
      }
      setHydrated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError({
        message: errorMessage,
        code: 'HYDRATION_ERROR',
        retry: hydrate,
      });
      // Fallback to empty array on error
      setTransactions([]);
      setHydrated(true); // Still mark as hydrated to allow app to continue
      console.error('[TransactionsProvider] Hydration error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const persist = useCallback(
    async (next: Transaction[]): Promise<void> => {
      setError(null);
      // Optimistic update: update state immediately for better UX
      setTransactions(next);
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

  const addTransaction: TransactionsContextValue['addTransaction'] = useCallback(
    async ({ amount, type, category, createdAt }) => {
      const tx: Transaction = {
        id: uuidv4(),
        amount,
        type,
        category,
        createdAt: createdAt ?? new Date().toISOString(),
      };
      const next = [...transactions, tx];
      await persist(next);
    },
    [transactions, persist],
  );

  const updateTransaction: TransactionsContextValue['updateTransaction'] = useCallback(
    async (id: string, { amount, type, category, createdAt }) => {
      const next = transactions.map((tx) =>
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
      await persist(next);
    },
    [transactions, persist],
  );

  const deleteTransaction: TransactionsContextValue['deleteTransaction'] = useCallback(
    async (id: string) => {
      const next = transactions.filter((tx) => tx.id !== id);
      await persist(next);
    },
    [transactions, persist],
  );

  const resetTransactions = useCallback(async () => {
    await persist([]);
  }, [persist]);

  const retryHydration = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const value = useMemo(
    () => ({
      transactions,
      hydrated,
      loading,
      error,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      resetTransactions,
      retryHydration,
    }),
    [transactions, hydrated, loading, error, addTransaction, updateTransaction, deleteTransaction, resetTransactions, retryHydration],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
};

export const useTransactions = () => {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
};
