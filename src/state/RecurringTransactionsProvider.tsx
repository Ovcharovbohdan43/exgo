import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadRecurringTransactions, saveRecurringTransactions } from '../services/storage';
import { RecurringTransaction, RecurringTransactionStatus, RecurringFrequency, RecurringTransactionType, Transaction, TransactionType, UpcomingTransaction } from '../types';
import { useSettings } from './SettingsProvider';
import { useTransactions } from './TransactionsProvider';
import { logError, addBreadcrumb } from '../services/sentry';

export type RecurringTransactionsError = {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
};

type RecurringTransactionsContextValue = {
  recurringTransactions: RecurringTransaction[];
  upcomingTransactions: UpcomingTransaction[];
  hydrated: boolean;
  loading: boolean;
  error: RecurringTransactionsError | null;
  getRecurringTransactionById: (id: string) => RecurringTransaction | null;
  getActiveRecurringTransactions: () => RecurringTransaction[];
  createRecurringTransaction: (input: {
    name: string;
    type: TransactionType;
    recurringType: RecurringTransactionType;
    amount: number;
    category?: string;
    frequency: RecurringFrequency;
    startDate: string; // ISO string
    endDate?: string; // ISO string
    creditProductId?: string;
    paidByCreditProductId?: string;
    goalId?: string;
    note?: string;
  }) => Promise<RecurringTransaction>;
  updateRecurringTransaction: (id: string, input: {
    name?: string;
    amount?: number;
    category?: string;
    frequency?: RecurringFrequency;
    startDate?: string;
    endDate?: string;
    status?: RecurringTransactionStatus;
    creditProductId?: string;
    paidByCreditProductId?: string;
    goalId?: string;
    note?: string;
  }) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  pauseRecurringTransaction: (id: string) => Promise<void>;
  resumeRecurringTransaction: (id: string) => Promise<void>;
  processRecurringTransactions: () => Promise<Transaction[]>;
  retryHydration: () => Promise<void>;
};

const RecurringTransactionsContext = createContext<RecurringTransactionsContextValue | undefined>(undefined);

/**
 * Calculate next due date based on frequency
 */
const calculateNextDueDate = (
  currentDate: string, // ISO string
  frequency: RecurringFrequency,
  startDate: string // ISO string
): string => {
  const current = new Date(currentDate);
  const start = new Date(startDate);
  
  switch (frequency) {
    case 'daily':
      current.setDate(current.getDate() + 1);
      break;
    case 'weekly':
      current.setDate(current.getDate() + 7);
      break;
    case 'biweekly':
      current.setDate(current.getDate() + 14);
      break;
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      // Handle edge case: if start date is 31st and next month has fewer days
      const startDay = start.getDate();
      const maxDaysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      if (startDay > maxDaysInMonth) {
        current.setDate(maxDaysInMonth);
      } else {
        current.setDate(startDay);
      }
      break;
    case 'yearly':
      current.setFullYear(current.getFullYear() + 1);
      break;
  }
  
  return current.toISOString();
};

/**
 * Check if a date is within 3 days from now
 */
const isWithin3Days = (date: string): boolean => {
  const targetDate = new Date(date);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 3;
};

/**
 * Calculate days until a date
 */
const daysUntil = (date: string): number => {
  const targetDate = new Date(date);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const RecurringTransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { addTransaction, transactionsByMonth } = useTransactions();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<RecurringTransactionsError | null>(null);
  const hasHydratedRef = useRef(false);
  const lastProcessedDateRef = useRef<string | null>(null);

  // Persist recurring transactions
  const persist = useCallback(async (transactions: RecurringTransaction[]): Promise<void> => {
    setError(null);
    try {
      await saveRecurringTransactions(transactions);
      addBreadcrumb('Recurring transactions saved', 'storage', 'info', {
        count: transactions.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save recurring transactions';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      
      setError({
        message: errorMessage,
        code: 'SAVE_ERROR',
        retry: async () => {
          await persist(transactions);
        },
      });
      
      logError(errorObj, {
        component: 'RecurringTransactionsProvider',
        operation: 'persist',
        errorCode: 'SAVE_ERROR',
      });
      throw err;
    }
  }, []);

  // Hydrate from storage
  const hydrate = useCallback(async () => {
    if (hasHydratedRef.current) {
      console.log('[RecurringTransactionsProvider] Already hydrated, skipping re-hydration');
      return;
    }

    hasHydratedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const stored = await loadRecurringTransactions();
      console.log('[RecurringTransactionsProvider] Loaded from storage:', { count: stored?.length || 0 });
      
      if (stored) {
        setRecurringTransactions(stored);
      } else {
        setRecurringTransactions([]);
      }
      
      setHydrated(true);
      addBreadcrumb('Recurring transactions loaded from storage', 'storage', 'info', {
        count: stored?.length || 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recurring transactions';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      
      setError({
        message: errorMessage,
        code: 'HYDRATION_ERROR',
        retry: hydrate,
      });
      
      setRecurringTransactions([]);
      setHydrated(true);
      console.error('[RecurringTransactionsProvider] Hydration error:', err);
      
      logError(errorObj, {
        component: 'RecurringTransactionsProvider',
        operation: 'hydrate',
        errorCode: 'HYDRATION_ERROR',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Calculate upcoming transactions (within 3 days)
  const upcomingTransactions = useMemo(() => {
    const now = new Date();
    const upcoming: UpcomingTransaction[] = [];
    
    recurringTransactions.forEach((rt) => {
      if (rt.status !== 'active') return;
      
      // Check if endDate has passed
      if (rt.endDate) {
        const endDate = new Date(rt.endDate);
        if (endDate < now) return;
      }
      
      // Check if startDate is in the future
      const startDate = new Date(rt.startDate);
      if (startDate > now) {
        // Use startDate as the first due date
        if (isWithin3Days(rt.startDate)) {
          upcoming.push({
            id: `upcoming-${rt.id}-${rt.startDate}`,
            recurringTransactionId: rt.id,
            name: rt.name,
            type: rt.type,
            amount: rt.amount,
            category: rt.category,
            scheduledDate: rt.startDate,
            daysUntil: daysUntil(rt.startDate),
            creditProductId: rt.creditProductId,
            paidByCreditProductId: rt.paidByCreditProductId,
            goalId: rt.goalId,
          });
        }
      } else {
        // Check if nextDueDate is within 3 days
        if (isWithin3Days(rt.nextDueDate)) {
          upcoming.push({
            id: `upcoming-${rt.id}-${rt.nextDueDate}`,
            recurringTransactionId: rt.id,
            name: rt.name,
            type: rt.type,
            amount: rt.amount,
            category: rt.category,
            scheduledDate: rt.nextDueDate,
            daysUntil: daysUntil(rt.nextDueDate),
            creditProductId: rt.creditProductId,
            paidByCreditProductId: rt.paidByCreditProductId,
            goalId: rt.goalId,
          });
        }
      }
    });
    
    // Sort by scheduled date (earliest first)
    return upcoming.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }, [recurringTransactions]);

  // Process recurring transactions (create actual transactions for due dates)
  const processRecurringTransactions = useCallback(async (): Promise<Transaction[]> => {
    const now = new Date();
    const createdTransactions: Transaction[] = [];
    
    const updatedRecurring = recurringTransactions.map((rt) => {
      if (rt.status !== 'active') return rt;
      
      // Check if endDate has passed
      if (rt.endDate) {
        const endDate = new Date(rt.endDate);
        if (endDate < now) {
          return { ...rt, status: 'completed' as RecurringTransactionStatus };
        }
      }
      
      // Check if we need to create a transaction
      const nextDueDate = new Date(rt.nextDueDate);
      
      // Only process if the due date has passed (or is today)
      if (nextDueDate <= now) {
        // Create transaction
        const transaction: Transaction = {
          id: uuidv4(),
          type: rt.type,
          amount: rt.amount,
          category: rt.category,
          creditProductId: rt.creditProductId,
          paidByCreditProductId: rt.paidByCreditProductId,
          goalId: rt.goalId,
          createdAt: rt.nextDueDate, // Use the due date as the transaction date
          recurringTransactionId: rt.id,
        };
        
        createdTransactions.push(transaction);
        
        // Calculate next due date
        const newNextDueDate = calculateNextDueDate(rt.nextDueDate, rt.frequency, rt.startDate);
        
        // Check if we've reached the end date
        if (rt.endDate && new Date(newNextDueDate) > new Date(rt.endDate)) {
          return {
            ...rt,
            status: 'completed' as RecurringTransactionStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        
        return {
          ...rt,
          nextDueDate: newNextDueDate,
          updatedAt: new Date().toISOString(),
        };
      }
      
      return rt;
    });
    
    // Update recurring transactions if any were modified
    if (updatedRecurring.some((rt, index) => rt !== recurringTransactions[index])) {
      setRecurringTransactions(updatedRecurring);
      await persist(updatedRecurring);
    }
    
    // Add created transactions
    for (const transaction of createdTransactions) {
      await addTransaction(transaction);
    }
    
    return createdTransactions;
  }, [recurringTransactions, addTransaction, persist]);

  // Process recurring transactions on app start and daily
  useEffect(() => {
    if (!hydrated) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Only process once per day
    if (lastProcessedDateRef.current === today) {
      return;
    }
    
    lastProcessedDateRef.current = today;
    
    // Process recurring transactions
    processRecurringTransactions().catch((err) => {
      console.error('[RecurringTransactionsProvider] Error processing recurring transactions:', err);
    });
  }, [hydrated, processRecurringTransactions]);

  const getRecurringTransactionById = useCallback((id: string) => {
    return recurringTransactions.find((rt) => rt.id === id) || null;
  }, [recurringTransactions]);

  const getActiveRecurringTransactions = useCallback(() => {
    return recurringTransactions.filter((rt) => rt.status === 'active');
  }, [recurringTransactions]);

  const createRecurringTransaction = useCallback(async (input: {
    name: string;
    type: TransactionType;
    recurringType: RecurringTransactionType;
    amount: number;
    category?: string;
    frequency: RecurringFrequency;
    startDate: string;
    endDate?: string;
    creditProductId?: string;
    paidByCreditProductId?: string;
    goalId?: string;
    note?: string;
  }): Promise<RecurringTransaction> => {
    console.log('[RecurringTransactionsProvider] Creating recurring transaction:', {
      name: input.name,
      type: input.type,
      amount: input.amount,
      category: input.category,
      frequency: input.frequency,
      startDate: input.startDate,
    });
    
    const now = new Date().toISOString();
    const nextDueDate = input.startDate;
    
    const newRecurring: RecurringTransaction = {
      id: uuidv4(),
      name: input.name,
      type: input.type,
      recurringType: input.recurringType,
      amount: input.amount,
      category: input.category,
      frequency: input.frequency,
      startDate: input.startDate,
      nextDueDate: nextDueDate,
      endDate: input.endDate,
      creditProductId: input.creditProductId,
      paidByCreditProductId: input.paidByCreditProductId,
      goalId: input.goalId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      note: input.note,
    };

    const updated = [...recurringTransactions, newRecurring];
    setRecurringTransactions(updated);

    try {
      await persist(updated);
      console.log('[RecurringTransactionsProvider] Recurring transaction created successfully:', {
        id: newRecurring.id,
        name: newRecurring.name,
        totalRecurringTransactions: updated.length,
      });
      addBreadcrumb('Recurring transaction created', 'storage', 'info', {
        recurringTransactionId: newRecurring.id,
        name: newRecurring.name,
      });
      return newRecurring;
    } catch (err) {
      setRecurringTransactions(recurringTransactions);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create recurring transaction';
      throw new Error(errorMessage);
    }
  }, [recurringTransactions, persist]);

  const updateRecurringTransaction = useCallback(async (id: string, input: {
    name?: string;
    amount?: number;
    category?: string;
    frequency?: RecurringFrequency;
    startDate?: string;
    endDate?: string;
    status?: RecurringTransactionStatus;
    creditProductId?: string;
    paidByCreditProductId?: string;
    goalId?: string;
    note?: string;
  }): Promise<void> => {
    const updated = recurringTransactions.map((rt) => {
      if (rt.id !== id) return rt;
      
      const updates: Partial<RecurringTransaction> = {
        ...input,
        updatedAt: new Date().toISOString(),
      };
      
      // Recalculate nextDueDate if frequency or startDate changed
      if (input.frequency || input.startDate) {
        const newFrequency = input.frequency || rt.frequency;
        const newStartDate = input.startDate || rt.startDate;
        updates.nextDueDate = calculateNextDueDate(rt.nextDueDate, newFrequency, newStartDate);
      }
      
      return { ...rt, ...updates };
    });

    setRecurringTransactions(updated);

    try {
      await persist(updated);
      addBreadcrumb('Recurring transaction updated', 'storage', 'info', {
        recurringTransactionId: id,
      });
    } catch (err) {
      setRecurringTransactions(recurringTransactions);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update recurring transaction';
      throw new Error(errorMessage);
    }
  }, [recurringTransactions, persist]);

  const deleteRecurringTransaction = useCallback(async (id: string): Promise<void> => {
    const updated = recurringTransactions.filter((rt) => rt.id !== id);
    setRecurringTransactions(updated);

    try {
      await persist(updated);
      addBreadcrumb('Recurring transaction deleted', 'storage', 'info', {
        recurringTransactionId: id,
      });
    } catch (err) {
      setRecurringTransactions(recurringTransactions);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete recurring transaction';
      throw new Error(errorMessage);
    }
  }, [recurringTransactions, persist]);

  const pauseRecurringTransaction = useCallback(async (id: string): Promise<void> => {
    await updateRecurringTransaction(id, { status: 'paused' });
  }, [updateRecurringTransaction]);

  const resumeRecurringTransaction = useCallback(async (id: string): Promise<void> => {
    await updateRecurringTransaction(id, { status: 'active' });
  }, [updateRecurringTransaction]);

  const retryHydration = useCallback(async () => {
    hasHydratedRef.current = false;
    await hydrate();
  }, [hydrate]);

  const value: RecurringTransactionsContextValue = useMemo(
    () => ({
      recurringTransactions,
      upcomingTransactions,
      hydrated,
      loading,
      error,
      getRecurringTransactionById,
      getActiveRecurringTransactions,
      createRecurringTransaction,
      updateRecurringTransaction,
      deleteRecurringTransaction,
      pauseRecurringTransaction,
      resumeRecurringTransaction,
      processRecurringTransactions,
      retryHydration,
    }),
    [
      recurringTransactions,
      upcomingTransactions,
      hydrated,
      loading,
      error,
      getRecurringTransactionById,
      getActiveRecurringTransactions,
      createRecurringTransaction,
      updateRecurringTransaction,
      deleteRecurringTransaction,
      pauseRecurringTransaction,
      resumeRecurringTransaction,
      processRecurringTransactions,
      retryHydration,
    ],
  );

  return (
    <RecurringTransactionsContext.Provider value={value}>
      {children}
    </RecurringTransactionsContext.Provider>
  );
};

export const useRecurringTransactions = (): RecurringTransactionsContextValue => {
  const ctx = useContext(RecurringTransactionsContext);
  if (!ctx) {
    throw new Error('useRecurringTransactions must be used within RecurringTransactionsProvider');
  }
  return ctx;
};

