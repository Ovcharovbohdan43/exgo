import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  loadMiniBudgets,
  saveMiniBudgets,
  loadMiniBudgetStates,
  saveMiniBudgetStates,
} from '../services/storage';
import {
  MiniBudget,
  MiniBudgetMonthlyState,
  MiniBudgetWithState,
  MiniBudgetState,
  Transaction,
} from '../types';
import { useSettings } from './SettingsProvider';
import { useTransactions } from './TransactionsProvider';
import { getMonthKey, getPreviousMonthKey } from '../utils/month';
import { logError, addBreadcrumb } from '../services/sentry';

export type MiniBudgetsError = {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
};

type MiniBudgetsContextValue = {
  miniBudgets: MiniBudget[];
  miniBudgetStates: Record<string, MiniBudgetMonthlyState>; // Key: `${budgetId}-${month}`
  hydrated: boolean;
  loading: boolean;
  error: MiniBudgetsError | null;
  getMiniBudgetsByMonth: (month: string) => MiniBudgetWithState[];
  getMiniBudgetByCategory: (categoryId: string, month: string) => MiniBudgetWithState | null;
  createMiniBudget: (input: {
    name: string;
    limitAmount: number;
    linkedCategoryIds: string[];
    note?: string;
    month?: string;
  }) => Promise<MiniBudget>;
  updateMiniBudget: (id: string, input: {
    name?: string;
    limitAmount?: number;
    linkedCategoryIds?: string[];
    note?: string;
    status?: 'active' | 'archived';
  }) => Promise<void>;
  deleteMiniBudget: (id: string) => Promise<void>;
  recalcForMonth: (month: string) => Promise<void>;
  applyExpenseToMiniBudgets: (transaction: Transaction) => Promise<void>;
  revertExpenseFromMiniBudgets: (transaction: Transaction) => Promise<void>;
  retryHydration: () => Promise<void>;
};

const MiniBudgetsContext = createContext<MiniBudgetsContextValue | undefined>(undefined);

/**
 * Calculate days elapsed and days in month
 */
const getDaysInfo = (monthKey: string): { daysElapsed: number; daysInMonth: number } => {
  const [year, month] = monthKey.split('-').map(Number);
  const now = new Date();
  const currentMonthKey = getMonthKey(now);
  
  if (monthKey === currentMonthKey) {
    // Current month: calculate days elapsed
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = now.getDate();
    return { daysElapsed, daysInMonth };
  } else {
    // Past or future month: use full month
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = monthKey < currentMonthKey ? daysInMonth : 0;
    return { daysElapsed, daysInMonth };
  }
};

/**
 * Calculate mini budget state based on spent, limit, pace, and time progress
 * Professional algorithm that considers:
 * - Current spending vs limit
 * - Spending pace vs expected pace
 * - Time progress through the month
 * - Forecast based on current pace
 */
const calculateState = (
  spent: number,
  limit: number,
  pace: number,
  daysInMonth: number,
  daysElapsed: number,
): MiniBudgetState => {
  // 1. Over budget: already exceeded limit
  if (spent >= limit) {
    return 'over';
  }
  
  // 2. Calculate time progress (0.0 to 1.0)
  const timeProgress = daysElapsed > 0 ? Math.min(daysElapsed / daysInMonth, 1.0) : 0;
  
  // 3. Calculate expected spending at this point (proportional to time)
  const expectedSpending = limit * timeProgress;
  
  // 4. Calculate spending ratio (actual vs expected)
  const spendingRatio = expectedSpending > 0 ? spent / expectedSpending : 0;
  
  // 5. Calculate forecast based on current pace
  const forecast = pace * daysInMonth;
  
  // 6. Determine state based on multiple factors
  // Over: already exceeded or forecast significantly exceeds limit
  if (spent >= limit || forecast > limit * 1.05) {
    return 'over';
  }
  
  // Warning: spending pace is too high or forecast suggests exceeding limit
  // Warning triggers if:
  // - Spending is 20%+ above expected for current time
  // - Forecast exceeds limit by more than 5%
  // - Spending ratio > 1.2 (spending 20% faster than expected)
  if (spendingRatio > 1.2 || forecast > limit * 0.95) {
    return 'warning';
  }
  
  // On track: all indicators are good
  return 'ok';
};

/**
 * Calculate monthly state for a mini budget
 */
const calculateMonthlyState = (
  budget: MiniBudget,
  transactions: Transaction[],
  month: string,
): MiniBudgetMonthlyState => {
  // Filter transactions for this month and linked categories
  const monthTransactions = transactions.filter(
    (tx) =>
      tx.type === 'expense' &&
      tx.category &&
      budget.linkedCategoryIds.includes(tx.category) &&
      getMonthKey(new Date(tx.createdAt)) === month,
  );
  
  const spentAmount = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = budget.limitAmount - spentAmount;
  const { daysElapsed, daysInMonth } = getDaysInfo(month);
  const pace = daysElapsed > 0 ? spentAmount / daysElapsed : 0;
  const forecast = pace * daysInMonth;
  const state = calculateState(spentAmount, budget.limitAmount, pace, daysInMonth, daysElapsed);
  
  return {
    budgetId: budget.id,
    month,
    spentAmount,
    remaining,
    pace,
    forecast,
    state,
    daysElapsed,
    daysInMonth,
  };
};

export const MiniBudgetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { transactionsByMonth, currentMonth } = useTransactions();
  const [miniBudgets, setMiniBudgets] = useState<MiniBudget[]>([]);
  const [miniBudgetStates, setMiniBudgetStates] = useState<Record<string, MiniBudgetMonthlyState>>({});
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MiniBudgetsError | null>(null);

  const hasHydratedRef = useRef(false);
  const lastProcessedMonthRef = useRef<string | null>(null);

  // Hydrate from storage
  const hydrate = useCallback(async () => {
    if (hasHydratedRef.current) {
      console.log('[MiniBudgetsProvider] Already hydrated, skipping re-hydration');
      return;
    }

    hasHydratedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const [storedBudgets, storedStates] = await Promise.all([
        loadMiniBudgets(),
        loadMiniBudgetStates(),
      ]);

      console.log('[MiniBudgetsProvider] Loaded from storage:', {
        budgetsCount: storedBudgets.length,
        statesCount: Object.keys(storedStates).length,
      });

      setMiniBudgets(storedBudgets);
      setMiniBudgetStates(storedStates);
      setHydrated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mini budgets';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);

      setError({
        message: errorMessage,
        code: 'LOAD_ERROR',
        retry: hydrate,
      });

      logError(errorObj, {
        component: 'MiniBudgetsProvider',
        operation: 'hydrate',
      });

      setMiniBudgets([]);
      setMiniBudgetStates({});
      setHydrated(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Auto-create mini budgets for new month when month changes
  // This ensures mini budgets are automatically carried over to the next month
  useEffect(() => {
    if (!hydrated || miniBudgets.length === 0) {
      return;
    }

    // Skip if we've already processed this month
    if (lastProcessedMonthRef.current === currentMonth) {
      return;
    }

    // Get previous month
    const previousMonth = getPreviousMonthKey(currentMonth);
    
    // Find active mini budgets from previous month
    const previousMonthBudgets = miniBudgets.filter(
      (b) => b.month === previousMonth && b.status === 'active',
    );

    // Check if current month already has budgets
    const currentMonthBudgets = miniBudgets.filter((b) => b.month === currentMonth && b.status === 'active');

    // Only create new budgets if:
    // 1. Previous month had budgets
    // 2. Current month doesn't have budgets yet
    // 3. Current month is not in the past (only forward months)
    const now = new Date();
    const currentMonthKey = getMonthKey(now);
    const isCurrentOrFutureMonth = currentMonth >= currentMonthKey;

    if (previousMonthBudgets.length > 0 && currentMonthBudgets.length === 0 && isCurrentOrFutureMonth) {
      console.log('[MiniBudgetsProvider] Auto-creating mini budgets for new month:', {
        from: previousMonth,
        to: currentMonth,
        budgetsCount: previousMonthBudgets.length,
      });

      const now = new Date().toISOString();
      const newBudgets: MiniBudget[] = previousMonthBudgets.map((budget) => ({
        ...budget,
        id: uuidv4(), // New ID for new month
        month: currentMonth,
        createdAt: now,
        updatedAt: now,
      }));

      setMiniBudgets((prev) => {
        const updated = [...prev, ...newBudgets];
        persistBudgets(updated).catch((err) => {
          console.error('[MiniBudgetsProvider] Failed to persist auto-created budgets:', err);
        });
        return updated;
      });

      // Calculate initial states for new budgets
      recalcForMonth(currentMonth).catch((err) => {
        console.error(`[MiniBudgetsProvider] Failed to recalc for new month ${currentMonth}:`, err);
      });
    }

    lastProcessedMonthRef.current = currentMonth;
  }, [currentMonth, hydrated, miniBudgets, persistBudgets, recalcForMonth]);

  // Auto-recalculate mini budgets when transactions change
  // Use a more reliable way to detect changes by tracking transaction counts per month
  const transactionsCountByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(transactionsByMonth).forEach((month) => {
      counts[month] = transactionsByMonth[month]?.length || 0;
    });
    return counts;
  }, [transactionsByMonth]);

  useEffect(() => {
    if (!hydrated || miniBudgets.length === 0) {
      return;
    }

    console.log('[MiniBudgetsProvider] Transactions changed, recalculating mini budgets:', {
      transactionCounts: transactionsCountByMonth,
      budgetsCount: miniBudgets.length,
    });

    // Get all unique months from mini budgets
    const months = new Set(miniBudgets.map((b) => b.month));
    
    // Also include months that have transactions (in case budget was just created)
    Object.keys(transactionsByMonth).forEach((month) => {
      if (transactionsByMonth[month] && transactionsByMonth[month].length > 0) {
        months.add(month);
      }
    });
    
    // Recalculate for each month that has budgets or transactions
    months.forEach((month) => {
      recalcForMonth(month).catch((err) => {
        console.error(`[MiniBudgetsProvider] Failed to recalc for month ${month}:`, err);
      });
    });
  }, [transactionsCountByMonth, hydrated, miniBudgets, recalcForMonth, transactionsByMonth]);

  // Persist mini budgets
  const persistBudgets = useCallback(
    async (next: MiniBudget[]): Promise<void> => {
      try {
        await saveMiniBudgets(next);
        console.log('[MiniBudgetsProvider] Saved mini budgets to storage:', next.length);
      } catch (err) {
        console.error('[MiniBudgetsProvider] Failed to save mini budgets:', err);
        throw err;
      }
    },
    [],
  );

  // Persist mini budget states
  const persistStates = useCallback(
    async (next: Record<string, MiniBudgetMonthlyState>): Promise<void> => {
      try {
        await saveMiniBudgetStates(next);
        console.log('[MiniBudgetsProvider] Saved mini budget states to storage');
      } catch (err) {
        console.error('[MiniBudgetsProvider] Failed to save mini budget states:', err);
        throw err;
      }
    },
    [],
  );

  // Recalculate state for a specific month
  const recalcForMonth = useCallback(
    async (month: string) => {
      // Get latest transactions and budgets
      const transactions = transactionsByMonth[month] || [];
      const budgetsForMonth = miniBudgets.filter((b) => b.month === month && b.status === 'active');

      if (budgetsForMonth.length === 0) {
        console.log(`[MiniBudgetsProvider] No budgets for month ${month}, skipping recalc`);
        return;
      }

      console.log(`[MiniBudgetsProvider] Recalculating for month ${month}:`, {
        budgetsCount: budgetsForMonth.length,
        transactionsCount: transactions.length,
        budgetNames: budgetsForMonth.map((b) => b.name),
      });

      // Calculate new states
      setMiniBudgetStates((prevStates) => {
        const newStates: Record<string, MiniBudgetMonthlyState> = { ...prevStates };

        for (const budget of budgetsForMonth) {
          const state = calculateMonthlyState(budget, transactions, month);
          const stateKey = `${budget.id}-${month}`;
          newStates[stateKey] = state;
          
          console.log(`[MiniBudgetsProvider] Updated state for budget ${budget.name}:`, {
            spent: state.spentAmount,
            limit: budget.limitAmount,
            remaining: state.remaining,
            status: state.state,
          });
        }

        // Persist asynchronously
        persistStates(newStates).catch((err) => {
          console.error(`[MiniBudgetsProvider] Failed to persist states for month ${month}:`, err);
        });

        return newStates;
      });
    },
    [miniBudgets, transactionsByMonth, persistStates],
  );

  // Get mini budgets by month with their states
  const getMiniBudgetsByMonth = useCallback(
    (month: string): MiniBudgetWithState[] => {
      const budgetsForMonth = miniBudgets.filter((b) => b.month === month && b.status === 'active');
      return budgetsForMonth.map((budget) => {
        const stateKey = `${budget.id}-${month}`;
        const state = miniBudgetStates[stateKey];
        
        // If state doesn't exist, calculate it on the fly
        if (!state) {
          const transactions = transactionsByMonth[month] || [];
          const calculatedState = calculateMonthlyState(budget, transactions, month);
          return { ...budget, state: calculatedState };
        }
        
        return { ...budget, state };
      });
    },
    [miniBudgets, miniBudgetStates, transactionsByMonth],
  );

  // Get mini budget by category
  const getMiniBudgetByCategory = useCallback(
    (categoryId: string, month: string): MiniBudgetWithState | null => {
      const budgets = getMiniBudgetsByMonth(month);
      // In v1: one category = one budget (first match)
      return budgets.find((b) => b.linkedCategoryIds.includes(categoryId)) || null;
    },
    [getMiniBudgetsByMonth],
  );

  // Create mini budget
  const createMiniBudget = useCallback(
    async (input: {
      name: string;
      limitAmount: number;
      linkedCategoryIds: string[];
      note?: string;
      month?: string;
    }): Promise<MiniBudget> => {
      if (input.limitAmount <= 0) {
        throw new Error('Limit amount must be greater than 0');
      }

      if (input.linkedCategoryIds.length === 0) {
        throw new Error('At least one category must be selected');
      }

      const month = input.month || getMonthKey();
      const now = new Date().toISOString();

      const newBudget: MiniBudget = {
        id: uuidv4(),
        name: input.name,
        month,
        currency: settings.currency,
        limitAmount: input.limitAmount,
        linkedCategoryIds: input.linkedCategoryIds,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        note: input.note,
      };

      const updated = [...miniBudgets, newBudget];
      setMiniBudgets(updated);
      await persistBudgets(updated);

      // Calculate initial state
      await recalcForMonth(month);

      addBreadcrumb('Mini budget created', 'user', 'info', {
        budgetId: newBudget.id,
        name: newBudget.name,
        limitAmount: newBudget.limitAmount,
        categoriesCount: newBudget.linkedCategoryIds.length,
      });

      return newBudget;
    },
    [miniBudgets, settings.currency, persistBudgets, recalcForMonth],
  );

  // Update mini budget
  const updateMiniBudget = useCallback(
    async (
      id: string,
      input: {
        name?: string;
        limitAmount?: number;
        linkedCategoryIds?: string[];
        note?: string;
        status?: 'active' | 'archived';
      },
    ): Promise<void> => {
      const budget = miniBudgets.find((b) => b.id === id);
      if (!budget) {
        throw new Error('Mini budget not found');
      }

      if (input.limitAmount !== undefined && input.limitAmount <= 0) {
        throw new Error('Limit amount must be greater than 0');
      }

      if (input.linkedCategoryIds !== undefined && input.linkedCategoryIds.length === 0) {
        throw new Error('At least one category must be selected');
      }

      const updated: MiniBudget = {
        ...budget,
        ...input,
        updatedAt: new Date().toISOString(),
      };

      const updatedList = miniBudgets.map((b) => (b.id === id ? updated : b));
      setMiniBudgets(updatedList);
      await persistBudgets(updatedList);

      // Recalculate state if categories or limit changed
      if (input.linkedCategoryIds !== undefined || input.limitAmount !== undefined) {
        await recalcForMonth(budget.month);
      }
    },
    [miniBudgets, persistBudgets, recalcForMonth],
  );

  // Delete mini budget
  const deleteMiniBudget = useCallback(
    async (id: string): Promise<void> => {
      const budget = miniBudgets.find((b) => b.id === id);
      if (!budget) {
        throw new Error('Mini budget not found');
      }

      const updated = miniBudgets.filter((b) => b.id !== id);
      setMiniBudgets(updated);
      await persistBudgets(updated);

      // Remove associated states
      const updatedStates = { ...miniBudgetStates };
      Object.keys(updatedStates).forEach((key) => {
        if (key.startsWith(`${id}-`)) {
          delete updatedStates[key];
        }
      });
      setMiniBudgetStates(updatedStates);
      await persistStates(updatedStates);
    },
    [miniBudgets, miniBudgetStates, persistBudgets, persistStates],
  );

  // Apply expense to mini budgets
  const applyExpenseToMiniBudgets = useCallback(
    async (transaction: Transaction): Promise<void> => {
      if (transaction.type !== 'expense' || !transaction.category) {
        return;
      }

      const month = getMonthKey(new Date(transaction.createdAt));
      const budgets = getMiniBudgetsByMonth(month);
      const affectedBudgets = budgets.filter((b) => b.linkedCategoryIds.includes(transaction.category!));

      if (affectedBudgets.length === 0) {
        return;
      }

      // In v1: one category = one budget (use first match)
      const budget = affectedBudgets[0];
      await recalcForMonth(month);
    },
    [getMiniBudgetsByMonth, recalcForMonth],
  );

  // Revert expense from mini budgets
  const revertExpenseFromMiniBudgets = useCallback(
    async (transaction: Transaction): Promise<void> => {
      if (transaction.type !== 'expense' || !transaction.category) {
        return;
      }

      const month = getMonthKey(new Date(transaction.createdAt));
      await recalcForMonth(month);
    },
    [recalcForMonth],
  );

  const value: MiniBudgetsContextValue = {
    miniBudgets,
    miniBudgetStates,
    hydrated,
    loading,
    error,
    getMiniBudgetsByMonth,
    getMiniBudgetByCategory,
    createMiniBudget,
    updateMiniBudget,
    deleteMiniBudget,
    recalcForMonth,
    applyExpenseToMiniBudgets,
    revertExpenseFromMiniBudgets,
    retryHydration: hydrate,
  };

  return <MiniBudgetsContext.Provider value={value}>{children}</MiniBudgetsContext.Provider>;
};

export const useMiniBudgets = (): MiniBudgetsContextValue => {
  const context = useContext(MiniBudgetsContext);
  if (context === undefined) {
    throw new Error('useMiniBudgets must be used within a MiniBudgetsProvider');
  }
  return context;
};

