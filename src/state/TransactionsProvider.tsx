import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  // Always sort by date (newest first) to ensure correct order
  const transactions = useMemo(() => {
    const monthTransactions = transactionsByMonth[currentMonth] || [];
    // Sort by date and time (newest first) to ensure correct display order
    const sorted = [...monthTransactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    console.log('[TransactionsProvider] Computing transactions for current month:', {
      currentMonth,
      transactionsCount: monthTransactions.length,
      sortedCount: sorted.length,
      transactionIds: sorted.map(tx => tx.id),
      firstFewDates: sorted.slice(0, 3).map(tx => ({
        id: tx.id,
        date: tx.createdAt,
      })),
    });
    return sorted;
  }, [transactionsByMonth, currentMonth]);

  const hasHydratedRef = useRef(false);
  
  const hydrate = useCallback(async () => {
    // Only hydrate once on mount
    if (hasHydratedRef.current) {
      console.log('[TransactionsProvider] Already hydrated, skipping re-hydration');
      return;
    }
    
    hasHydratedRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const [storedTransactions, storedCurrentMonth] = await Promise.all([
        loadTransactions(),
        loadCurrentMonth(),
      ]);
      
      console.log('[TransactionsProvider] Loading from storage:', {
        storedMonths: storedTransactions ? Object.keys(storedTransactions) : [],
        storedCurrentMonth,
        firstMonthKey: settings.firstMonthKey,
      });
      
      if (storedTransactions) {
        // Sort transactions within each month by date (newest first)
        const sortedByMonth: Record<string, Transaction[]> = {};
        for (const [monthKey, monthTxs] of Object.entries(storedTransactions)) {
          sortedByMonth[monthKey] = [...monthTxs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        
        console.log('[TransactionsProvider] Setting transactionsByMonth from storage (sorted):', {
          storedMonths: Object.keys(sortedByMonth),
          storedCounts: Object.fromEntries(
            Object.entries(sortedByMonth).map(([key, txs]) => [key, txs.length])
          ),
        });
        setTransactionsByMonth(sortedByMonth);
      } else {
        console.log('[TransactionsProvider] No stored transactions, setting empty object');
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
      
      console.log('[TransactionsProvider] Hydrated:', {
        monthKey,
        storedCurrentMonth,
        firstMonthKey: settings.firstMonthKey,
        transactionsCount: Object.keys(storedTransactions || {}).length,
        allMonths: storedTransactions ? Object.keys(storedTransactions) : [],
      });
      
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
  }, [settings.firstMonthKey]);

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
      
      // Log what we're about to persist
      setTransactionsByMonth((prev) => {
        const prevMonths = Object.keys(prev);
        const nextMonths = Object.keys(next);
        const removedMonths = prevMonths.filter(m => !nextMonths.includes(m));
        const addedMonths = nextMonths.filter(m => !prevMonths.includes(m));
        
        if (removedMonths.length > 0) {
          console.warn('[TransactionsProvider] WARNING: Months will be removed during persist:', {
            removedMonths,
            prevMonths,
            nextMonths,
          });
        }
        
        console.log('[TransactionsProvider] Persisting transactions:', {
          months: nextMonths,
          monthCounts: Object.fromEntries(
            Object.entries(next).map(([key, txs]) => [key, txs.length])
          ),
          addedMonths,
          removedMonths,
          prevMonthCounts: Object.fromEntries(
            Object.entries(prev).map(([key, txs]) => [key, txs.length])
          ),
        });
        
        // Always use next (the new value) instead of prev
        // This ensures we don't lose updates that happened between addTransaction and persist
        return next;
      });
      
      try {
        await saveTransactions(next);
        console.log('[TransactionsProvider] Transactions saved successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save transactions';
        setError({
          message: errorMessage,
          code: 'SAVE_ERROR',
          retry: async () => {
            await persist(next);
          },
        });
        // Revert optimistic update on error - but use functional update to get current state
        setTransactionsByMonth((prev) => {
          console.error('[TransactionsProvider] Save error, reverting state');
          return prev; // Keep current state on error
        });
        console.error('[TransactionsProvider] Save error:', err);
        throw err; // Re-throw to allow caller to handle
      }
    },
    [],
  );

  const setCurrentMonth: TransactionsContextValue['setCurrentMonth'] = useCallback(
    async (monthKey: string) => {
      // Get current state values for logging
      let prevMonthValue: string;
      let availableMonthsValue: string[];
      
      setCurrentMonthState((prevMonth) => {
        prevMonthValue = prevMonth;
        return monthKey;
      });
      
      // Sync with storage to ensure we have the latest data for all months
      // This is important because data might have been saved in another session
      // or after a reload. Storage is the source of truth.
      // Use Promise.race to prevent blocking if storage is slow
      try {
        const syncPromise = loadTransactions();
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), 500) // 500ms timeout
        );
        
        const storedTransactions = await Promise.race([syncPromise, timeoutPromise]);
        
        if (storedTransactions) {
          // Use stored data as the source of truth
          // This ensures we always have the latest data from storage
          setTransactionsByMonth(storedTransactions);
          
          availableMonthsValue = Object.keys(storedTransactions);
          console.log('[TransactionsProvider] Setting current month (synced with storage):', {
            from: prevMonthValue!,
            to: monthKey,
            availableMonths: availableMonthsValue,
            transactionsByMonthKeys: Object.keys(storedTransactions),
            transactionsByMonthCounts: Object.fromEntries(
              Object.entries(storedTransactions).map(([key, txs]) => [key, txs.length])
            ),
            storedMonths: Object.keys(storedTransactions),
          });
        } else {
          // No stored data or timeout, just log current state
          setTransactionsByMonth((prevTransactions) => {
            availableMonthsValue = Object.keys(prevTransactions);
            console.log('[TransactionsProvider] Setting current month (no stored data or timeout):', {
              from: prevMonthValue!,
              to: monthKey,
              availableMonths: availableMonthsValue,
              transactionsByMonthKeys: Object.keys(prevTransactions),
              transactionsByMonthCounts: Object.fromEntries(
                Object.entries(prevTransactions).map(([key, txs]) => [key, txs.length])
              ),
            });
            return prevTransactions;
          });
        }
      } catch (err) {
        console.error('[TransactionsProvider] Failed to sync with storage:', err);
        // Continue with current state if sync fails - don't block month switching
        setTransactionsByMonth((prevTransactions) => {
          availableMonthsValue = Object.keys(prevTransactions);
          console.log('[TransactionsProvider] Setting current month (sync failed, using current state):', {
            from: prevMonthValue!,
            to: monthKey,
            availableMonths: availableMonthsValue,
          });
          return prevTransactions;
        });
      }
      
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
      
      // Use functional update to ensure we have the latest state
      let next: Record<string, Transaction[]>;
      setTransactionsByMonth((prev) => {
        console.log('[TransactionsProvider] Adding transaction:', {
          txMonthKey,
          currentMonth,
          txDate: tx.createdAt,
          availableMonths: Object.keys(prev),
          prevMonthTransactionsCount: prev[txMonthKey]?.length || 0,
        });
        
        // Get current month's transactions or create empty array
        const monthTransactions = prev[txMonthKey] || [];
        // Add new transaction at the beginning (newest first)
        // Then sort to ensure correct order (newest first)
        const updatedMonthTransactions = [tx, ...monthTransactions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        console.log('[TransactionsProvider] Transaction array updated:', {
          txMonthKey,
          oldCount: monthTransactions.length,
          newCount: updatedMonthTransactions.length,
          transactionId: tx.id,
        });
        
        // Update transactions by month - preserve all existing months
        next = {
          ...prev,
          [txMonthKey]: updatedMonthTransactions,
        };
        
        console.log('[TransactionsProvider] Next state prepared:', {
          txMonthKey,
          nextMonthTransactionsCount: next[txMonthKey]?.length || 0,
          allMonths: Object.keys(next),
        });
        
        return next;
      });
      
      // Wait for state update, then persist
      console.log('[TransactionsProvider] About to persist, next state:', {
        txMonthKey,
        nextMonthTransactionsCount: next![txMonthKey]?.length || 0,
      });
      await persist(next!);
      
      // Automatically switch to the month where transaction was added
      // This ensures user sees the transaction immediately after adding it
      // Note: If transaction is added to currentMonth (which is the normal case),
      // this condition will be false and no switch will occur
      // Use currentMonth from state, not from closure
      const currentMonthValue = currentMonth;
      if (txMonthKey !== currentMonthValue) {
        console.log('[TransactionsProvider] Transaction added to different month, switching:', {
          txMonthKey,
          currentMonth: currentMonthValue,
        });
        await setCurrentMonth(txMonthKey);
      } else {
        console.log('[TransactionsProvider] Transaction added to current month:', currentMonthValue);
        // Verify that state was updated correctly
        // Force a check by reading current state
        setTransactionsByMonth((currentState) => {
          const monthTxs = currentState[txMonthKey] || [];
          console.log('[TransactionsProvider] Final state verification after add:', {
            txMonthKey,
            currentMonth: currentMonthValue,
            monthTransactionsCount: monthTxs.length,
            transactionIds: monthTxs.map(tx => tx.id),
            hasNewTransaction: monthTxs.some(tx => tx.id === tx.id),
          });
          return currentState; // Return unchanged to trigger re-render check
        });
      }
    },
    [persist, setCurrentMonth, currentMonth],
  );

  const updateTransaction: TransactionsContextValue['updateTransaction'] = useCallback(
    async (id: string, { amount, type, category, createdAt }) => {
      // Use functional update to ensure we have the latest state
      let next: Record<string, Transaction[]>;
      let foundMonthKey: string | null = null;
      
      setTransactionsByMonth((prev) => {
        // Find which month contains this transaction
        for (const [monthKey, monthTransactions] of Object.entries(prev)) {
          if (monthTransactions.some((tx) => tx.id === id)) {
            foundMonthKey = monthKey;
            break;
          }
        }
        
        if (!foundMonthKey) {
          throw new Error(`Transaction ${id} not found`);
        }
        
        // Update transaction in its month
        const monthTransactions = prev[foundMonthKey];
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
        
        // Preserve all existing months
        next = {
          ...prev,
          [foundMonthKey]: updatedMonthTransactions,
        };
        
        return next;
      });
      
      await persist(next!);
    },
    [persist],
  );

  const deleteTransaction: TransactionsContextValue['deleteTransaction'] = useCallback(
    async (id: string) => {
      // Use functional update to ensure we have the latest state
      let next: Record<string, Transaction[]>;
      let foundMonthKey: string | null = null;
      
      setTransactionsByMonth((prev) => {
        // Find which month contains this transaction
        for (const [monthKey, monthTransactions] of Object.entries(prev)) {
          if (monthTransactions.some((tx) => tx.id === id)) {
            foundMonthKey = monthKey;
            break;
          }
        }
        
        if (!foundMonthKey) {
          throw new Error(`Transaction ${id} not found`);
        }
        
        // Remove transaction from its month
        const monthTransactions = prev[foundMonthKey];
        const updatedMonthTransactions = monthTransactions.filter((tx) => tx.id !== id);
        
        // Preserve all existing months (even if empty after deletion)
        next = {
          ...prev,
          [foundMonthKey]: updatedMonthTransactions,
        };
        
        return next;
      });
      
      await persist(next!);
    },
    [persist],
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
