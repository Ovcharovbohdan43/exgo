import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadTransactions, saveTransactions, loadCurrentMonth, saveCurrentMonth } from '../services/storage';
import { Transaction, TransactionType } from '../types';
import { getMonthKey, getPreviousMonthKey, getNextMonthKey } from '../utils/month';
import { useSettings } from './SettingsProvider';
import { calculateTotals } from '../modules/calculations';
import { logError, addBreadcrumb } from '../services/sentry';

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
    creditProductId?: string;
    createdAt?: string;
  }) => Promise<void>;
  updateTransaction: (id: string, input: {
    amount: number;
    type: TransactionType;
    category?: string;
    creditProductId?: string;
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
      
      addBreadcrumb('Transactions loaded from storage', 'storage', 'info', {
        monthKey,
        transactionsCount: Object.keys(storedTransactions || {}).length,
        allMonths: storedTransactions ? Object.keys(storedTransactions) : [],
      });
      
      setHydrated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      
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
      
      // Log to Sentry
      logError(errorObj, {
        component: 'TransactionsProvider',
        operation: 'hydrate',
        errorCode: 'HYDRATION_ERROR',
      });
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
        addBreadcrumb('Transactions saved to storage', 'storage', 'info', {
          totalMonths: Object.keys(next).length,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save transactions';
        const errorObj = err instanceof Error ? err : new Error(errorMessage);
        
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
        
        // Log to Sentry
        const monthCounts = Object.fromEntries(
          Object.entries(next).map(([key, txs]) => [key, txs.length])
        );
        logError(errorObj, {
          component: 'TransactionsProvider',
          operation: 'persist',
          errorCode: 'SAVE_ERROR',
          monthCounts,
          totalMonths: Object.keys(next).length,
        });
        
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
        const errorObj = err instanceof Error ? err : new Error('Failed to sync with storage');
        logError(errorObj, {
          component: 'TransactionsProvider',
          operation: 'setCurrentMonth-sync',
          monthKey,
        }, 'warning');
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
        addBreadcrumb('Current month saved', 'storage', 'info', { monthKey });
      } catch (err) {
        console.error('[TransactionsProvider] Failed to save current month:', err);
        const errorObj = err instanceof Error ? err : new Error('Failed to save current month');
        logError(errorObj, {
          component: 'TransactionsProvider',
          operation: 'saveCurrentMonth',
          monthKey,
        }, 'warning');
        // Don't throw, just log - month state is updated optimistically
      }
    },
    [],
  );

  const addTransaction: TransactionsContextValue['addTransaction'] = useCallback(
    async ({ amount, type, category, creditProductId, createdAt }) => {
      const tx: Transaction = {
        id: uuidv4(),
        amount,
        type,
        category,
        creditProductId,
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
    async (id: string, { amount, type, category, creditProductId, createdAt }) => {
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
                creditProductId,
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
        const deletedTransaction = monthTransactions.find((tx) => tx.id === id);
        const updatedMonthTransactions = monthTransactions.filter((tx) => tx.id !== id);
        
        // Track transaction deletion
        if (deletedTransaction) {
          const { trackTransactionDeleted } = require('../services/analytics');
          trackTransactionDeleted({
            type: deletedTransaction.type,
            amount: deletedTransaction.amount,
            category: deletedTransaction.category,
            month: foundMonthKey,
          });
        }
        
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

  // Track if we've already processed balance carryover for the current month
  const balanceCarryoverProcessedRef = useRef<Set<string>>(new Set());

  // Remove carryover transactions from actual current month (should not have carryover)
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const now = new Date();
    const actualCurrentMonthKey = getMonthKey(now); // Real current month based on system date
    const currentMonthTransactions = transactionsByMonth[actualCurrentMonthKey] || [];

    // Find and remove any carryover transactions from current month
    const carryoverTransactions = currentMonthTransactions.filter(
      (tx) => tx.type === 'income' && tx.category === 'Remaining from last month'
    );

    if (carryoverTransactions.length > 0) {
      console.log('[TransactionsProvider] Removing carryover transactions from current month:', {
        actualCurrentMonthKey,
        carryoverCount: carryoverTransactions.length,
        carryoverIds: carryoverTransactions.map((tx) => tx.id),
      });

      setTransactionsByMonth((prev) => {
        const currentMonthTxs = prev[actualCurrentMonthKey] || [];
        const filteredTxs = currentMonthTxs.filter(
          (tx) => !(tx.type === 'income' && tx.category === 'Remaining from last month')
        );

        const next = {
          ...prev,
          [actualCurrentMonthKey]: filteredTxs,
        };

        // Persist the updated transactions
        persist(next).catch(console.error);

        return next;
      });
    }
  }, [hydrated, transactionsByMonth, persist]);

  // Auto-carryover remaining balance from previous month to new month
  // Only applies when switching to a NEW month (not the current active month)
  useEffect(() => {
    if (!hydrated || !settings.monthlyIncome || settings.monthlyIncome <= 0) {
      return;
    }

    const now = new Date();
    const actualCurrentMonthKey = getMonthKey(now); // Real current month based on system date
    const selectedMonthKey = currentMonth; // Month user is viewing

    // Only process carryover for months that are NOT the actual current month
    // This prevents applying carryover to the month user is currently working in
    if (selectedMonthKey === actualCurrentMonthKey) {
      return;
    }

    // Only process for future months (months after the actual current month)
    // This ensures we only carryover when moving forward, not backward
    const selectedDate = new Date(selectedMonthKey + '-01');
    const actualCurrentDate = new Date(actualCurrentMonthKey + '-01');
    if (selectedDate <= actualCurrentDate) {
      return;
    }

    // Check if we've already processed carryover for this selected month
    if (balanceCarryoverProcessedRef.current.has(selectedMonthKey)) {
      return;
    }

    // Get previous month key (month before the selected month)
    const previousMonthKey = getPreviousMonthKey(selectedMonthKey);
    const previousMonthTransactions = transactionsByMonth[previousMonthKey] || [];

    // Calculate remaining balance from previous month
    const previousTotals = calculateTotals(previousMonthTransactions, settings.monthlyIncome);

    // Only carryover if there's a positive remaining balance
    if (previousTotals.remaining > 0) {
      // Check if carryover transaction already exists in selected month
      const selectedMonthTransactions = transactionsByMonth[selectedMonthKey] || [];
      const hasCarryoverTransaction = selectedMonthTransactions.some(
        (tx) => tx.type === 'income' && tx.category === 'Remaining from last month'
      );

      if (!hasCarryoverTransaction) {
        // Parse selected month to get the first day
        const [year, month] = selectedMonthKey.split('-').map(Number);
        const firstDayOfSelectedMonth = new Date(year, month - 1, 1, 12, 0, 0, 0);

        // Create income transaction for the carryover amount
        const carryoverTransaction: Transaction = {
          id: uuidv4(),
          type: 'income',
          amount: previousTotals.remaining,
          category: 'Remaining from last month',
          createdAt: firstDayOfSelectedMonth.toISOString(),
        };

        // Add the carryover transaction
        setTransactionsByMonth((prev) => {
          const selectedMonthTxs = prev[selectedMonthKey] || [];
          const updatedMonthTxs = [carryoverTransaction, ...selectedMonthTxs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          const next = {
            ...prev,
            [selectedMonthKey]: updatedMonthTxs,
          };

          // Persist the new transaction
          persist(next).catch(console.error);

          console.log('[TransactionsProvider] Created balance carryover transaction:', {
            selectedMonthKey,
            actualCurrentMonthKey,
            previousMonthKey,
            carryoverAmount: previousTotals.remaining,
            transactionId: carryoverTransaction.id,
          });

          return next;
        });

        // Mark this month as processed
        balanceCarryoverProcessedRef.current.add(selectedMonthKey);
      } else {
        // Already has carryover transaction, just mark as processed
        balanceCarryoverProcessedRef.current.add(selectedMonthKey);
      }
    } else {
      // No balance to carryover, but mark as processed to avoid re-checking
      balanceCarryoverProcessedRef.current.add(selectedMonthKey);
    }
  }, [hydrated, currentMonth, transactionsByMonth, settings.monthlyIncome, persist]);

  // Clear processed months when switching to a different month (for testing/debugging)
  useEffect(() => {
    // Keep only current and previous month in the processed set to avoid memory leaks
    const now = new Date();
    const currentMonthKey = getMonthKey(now);
    const previousMonthKey = getPreviousMonthKey(currentMonthKey);
    
    balanceCarryoverProcessedRef.current.forEach((monthKey) => {
      if (monthKey !== currentMonthKey && monthKey !== previousMonthKey) {
        balanceCarryoverProcessedRef.current.delete(monthKey);
      }
    });
  }, [currentMonth]);

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
