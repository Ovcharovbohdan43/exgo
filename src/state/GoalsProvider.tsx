import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadGoals, saveGoals } from '../services/storage';
import { Goal, GoalStatus } from '../types';
import { useSettings } from './SettingsProvider';
import { useTransactions } from './TransactionsProvider';
import { logError, addBreadcrumb } from '../services/sentry';

export type GoalsError = {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
};

type GoalsContextValue = {
  goals: Goal[];
  hydrated: boolean;
  loading: boolean;
  error: GoalsError | null;
  getActiveGoals: () => Goal[];
  getGoalById: (id: string) => Goal | null;
  createGoal: (input: {
    name: string;
    targetAmount: number;
    emoji?: string;
    note?: string;
  }) => Promise<Goal>;
  updateGoal: (id: string, input: {
    name?: string;
    targetAmount?: number;
    emoji?: string;
    status?: GoalStatus;
    note?: string;
  }) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  recalculateGoalProgress: (goalId: string) => Promise<void>;
  recalculateAllGoalsProgress: () => Promise<void>;
  retryHydration: () => Promise<void>;
};

const GoalsContext = createContext<GoalsContextValue | undefined>(undefined);

/**
 * Calculate current amount saved for a goal based on related transactions
 */
const calculateGoalCurrentAmount = (
  goalId: string,
  transactionsByMonth: Record<string, import('../types').Transaction[]>
): number => {
  let total = 0;
  
  // Sum all saved transactions linked to this goal across all months
  for (const transactions of Object.values(transactionsByMonth)) {
    for (const tx of transactions) {
      if (tx.type === 'saved' && tx.goalId === goalId) {
        total += tx.amount;
      }
    }
  }
  
  return total;
};

/**
 * Update goal status based on current amount
 */
const updateGoalStatus = (goal: Goal): Goal => {
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  
  if (isCompleted && goal.status === 'active') {
    return {
      ...goal,
      status: 'completed' as GoalStatus,
      completedAt: goal.completedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (!isCompleted && goal.status === 'completed') {
    return {
      ...goal,
      status: 'active' as GoalStatus,
      completedAt: undefined,
      updatedAt: new Date().toISOString(),
    };
  }
  
  return goal;
};

export const GoalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { transactionsByMonth } = useTransactions();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GoalsError | null>(null);
  const hasHydratedRef = useRef(false);

  const hydrate = useCallback(async () => {
    if (hasHydratedRef.current) {
      console.log('[GoalsProvider] Already hydrated, skipping re-hydration');
      return;
    }
    
    hasHydratedRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const stored = await loadGoals();
      console.log('[GoalsProvider] Loaded from storage:', { goalsCount: stored.length });
      
      // Recalculate current amounts for all goals
      const recalculated = stored.map((goal) => {
        const currentAmount = calculateGoalCurrentAmount(goal.id, transactionsByMonth);
        const updatedGoal = { ...goal, currentAmount };
        return updateGoalStatus(updatedGoal);
      });
      
      setGoals(recalculated);
      
      // Save recalculated goals if they changed
      const needsSave = recalculated.some((goal, index) => 
        goal.currentAmount !== stored[index]?.currentAmount || 
        goal.status !== stored[index]?.status
      );
      
      if (needsSave) {
        await saveGoals(recalculated);
      }
      
      setHydrated(true);
      addBreadcrumb('Goals loaded from storage', 'storage', 'info', {
        goalsCount: recalculated.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load goals';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      
      setError({
        message: errorMessage,
        code: 'LOAD_ERROR',
        retry: hydrate,
      });
      
      console.error('[GoalsProvider] Load error:', err);
      logError(errorObj, {
        component: 'GoalsProvider',
        operation: 'hydrate',
        errorCode: 'LOAD_ERROR',
      });
      
      setHydrated(true); // Set hydrated even on error to allow app to continue
    } finally {
      setLoading(false);
    }
  }, [transactionsByMonth]);

  // Initial hydration
  useEffect(() => {
    if (!hydrated && !loading) {
      hydrate();
    }
  }, [hydrated, loading, hydrate]);

  // Recalculate goals when transactions change
  useEffect(() => {
    if (hydrated && goals.length > 0) {
      recalculateAllGoalsProgress();
    }
  }, [transactionsByMonth, hydrated]);

  const recalculateGoalProgress = useCallback(async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const currentAmount = calculateGoalCurrentAmount(goalId, transactionsByMonth);
    const updatedGoal = updateGoalStatus({
      ...goal,
      currentAmount,
    });

    const updated = goals.map((g) => (g.id === goalId ? updatedGoal : g));
    setGoals(updated);

    try {
      await saveGoals(updated);
      console.log('[GoalsProvider] Recalculated goal progress:', { goalId, currentAmount });
    } catch (err) {
      console.error('[GoalsProvider] Failed to save recalculated goal:', err);
    }
  }, [goals, transactionsByMonth]);

  const recalculateAllGoalsProgress = useCallback(async () => {
    if (goals.length === 0) return;

    const recalculated = goals.map((goal) => {
      const currentAmount = calculateGoalCurrentAmount(goal.id, transactionsByMonth);
      const updatedGoal = { ...goal, currentAmount };
      return updateGoalStatus(updatedGoal);
    });

    setGoals(recalculated);

    try {
      await saveGoals(recalculated);
      console.log('[GoalsProvider] Recalculated all goals progress');
    } catch (err) {
      console.error('[GoalsProvider] Failed to save recalculated goals:', err);
    }
  }, [goals, transactionsByMonth]);

  const getActiveGoals = useCallback(() => {
    return goals.filter((goal) => goal.status === 'active');
  }, [goals]);

  const getGoalById = useCallback((id: string) => {
    return goals.find((goal) => goal.id === id) || null;
  }, [goals]);

  const createGoal = useCallback(async (input: {
    name: string;
    targetAmount: number;
    emoji?: string;
    note?: string;
  }): Promise<Goal> => {
    const now = new Date().toISOString();
    const newGoal: Goal = {
      id: uuidv4(),
      name: input.name,
      targetAmount: input.targetAmount,
      currentAmount: 0,
      currency: settings.currency,
      emoji: input.emoji,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      note: input.note,
    };

    const updated = [...goals, newGoal];
    setGoals(updated);

    try {
      await saveGoals(updated);
      addBreadcrumb('Goal created', 'storage', 'info', {
        goalId: newGoal.id,
        goalName: newGoal.name,
      });
      return newGoal;
    } catch (err) {
      // Rollback on error
      setGoals(goals);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal';
      throw new Error(errorMessage);
    }
  }, [goals, settings.currency]);

  const updateGoal = useCallback(async (id: string, input: {
    name?: string;
    targetAmount?: number;
    emoji?: string;
    status?: GoalStatus;
    note?: string;
  }): Promise<void> => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) {
      throw new Error(`Goal with id ${id} not found`);
    }

    const updatedGoal: Goal = {
      ...goal,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate current amount if goal is being updated
    const currentAmount = calculateGoalCurrentAmount(id, transactionsByMonth);
    updatedGoal.currentAmount = currentAmount;

    // Update status based on current amount
    const finalGoal = updateGoalStatus(updatedGoal);

    const updated = goals.map((g) => (g.id === id ? finalGoal : g));
    setGoals(updated);

    try {
      await saveGoals(updated);
      addBreadcrumb('Goal updated', 'storage', 'info', {
        goalId: id,
      });
    } catch (err) {
      // Rollback on error
      setGoals(goals);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update goal';
      throw new Error(errorMessage);
    }
  }, [goals, transactionsByMonth]);

  const deleteGoal = useCallback(async (id: string): Promise<void> => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);

    try {
      await saveGoals(updated);
      addBreadcrumb('Goal deleted', 'storage', 'info', {
        goalId: id,
      });
    } catch (err) {
      // Rollback on error
      setGoals(goals);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete goal';
      throw new Error(errorMessage);
    }
  }, [goals]);

  const retryHydration = useCallback(async () => {
    hasHydratedRef.current = false;
    await hydrate();
  }, [hydrate]);

  const value: GoalsContextValue = useMemo(
    () => ({
      goals,
      hydrated,
      loading,
      error,
      getActiveGoals,
      getGoalById,
      createGoal,
      updateGoal,
      deleteGoal,
      recalculateGoalProgress,
      recalculateAllGoalsProgress,
      retryHydration,
    }),
    [
      goals,
      hydrated,
      loading,
      error,
      getActiveGoals,
      getGoalById,
      createGoal,
      updateGoal,
      deleteGoal,
      recalculateGoalProgress,
      recalculateAllGoalsProgress,
      retryHydration,
    ],
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
};

export const useGoals = (): GoalsContextValue => {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
};

