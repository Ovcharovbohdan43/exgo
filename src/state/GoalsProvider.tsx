import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadGoals, saveGoals } from '../services/storage';
import { Goal, GoalStatus } from '../types';
import { useSettings } from './SettingsProvider';
import { useTransactions } from './TransactionsProvider';
import { logError, addBreadcrumb } from '../services/sentry';

// Conditional import for gamification
let useGamification: (() => { addXP: (amount: number) => Promise<void>; checkBadgeProgress: () => Promise<void> }) | null = null;
try {
  const gamificationModule = require('./GamificationProvider');
  useGamification = gamificationModule.useGamification;
} catch (e) {
  // GamificationProvider not available
}

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
  recalculateAllGoalsProgress: () => Promise<Goal[]>;
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
  let foundCount = 0;
  
  // Sum all saved transactions linked to this goal across all months
  for (const transactions of Object.values(transactionsByMonth)) {
    for (const tx of transactions) {
      if (tx.type === 'saved' && tx.goalId === goalId) {
        total += tx.amount;
        foundCount++;
        console.log(`[GoalsProvider] Found saved transaction for goal ${goalId}: amount=${tx.amount}, total=${total}`);
      }
    }
  }
  
  console.log(`[GoalsProvider] Calculated currentAmount for goal ${goalId}: ${total} (found ${foundCount} transactions)`);
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

export const GoalsProvider: React.FC<{ 
  children: React.ReactNode;
  onGoalCompleted?: (goal: Goal) => void;
}> = ({ children, onGoalCompleted }) => {
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

  // Create a memoized hash of saved transactions to track changes
  const savedTransactionsHash = useMemo(() => {
    const savedTxs = Object.keys(transactionsByMonth)
      .sort()
      .flatMap(month => 
        (transactionsByMonth[month] || [])
          .filter(tx => tx.type === 'saved' && tx.goalId)
          .map(tx => ({ month, id: tx.id, goalId: tx.goalId, amount: tx.amount }))
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    
    return JSON.stringify(savedTxs);
  }, [transactionsByMonth]);
  
  // Track previous hash to detect changes
  const prevHashRef = useRef<string>('');
  
  // Track if we have goals to avoid unnecessary recalculations
  const hasGoalsRef = useRef(false);
  useEffect(() => {
    hasGoalsRef.current = goals.length > 0;
  }, [goals.length]);
  
  // Recalculate goals when saved transactions change
  useEffect(() => {
    if (!hydrated) {
      console.log('[GoalsProvider] Not hydrated yet, skipping recalculation');
      return;
    }
    
    // Check if we have goals using ref to avoid dependency issues
    if (!hasGoalsRef.current) {
      console.log('[GoalsProvider] No goals, skipping recalculation');
      return;
    }
    
    // Only recalculate if saved transactions actually changed
    if (prevHashRef.current === savedTransactionsHash) {
      console.log('[GoalsProvider] Saved transactions hash unchanged, skipping recalculation');
      return;
    }
    
    console.log('[GoalsProvider] Saved transactions changed, recalculating goals progress');
    console.log('[GoalsProvider] Hash:', savedTransactionsHash.substring(0, 200));
    prevHashRef.current = savedTransactionsHash;
    
    recalculateAllGoalsProgress().then(async (newlyCompleted) => {
      console.log('[GoalsProvider] Recalculation complete, newly completed:', newlyCompleted.length);
      
      // Trigger gamification updates for completed goals
      if (newlyCompleted.length > 0 && gamification) {
        try {
          for (const goal of newlyCompleted) {
            const progress = Math.floor((goal.currentAmount / goal.targetAmount) * 100);
            
            // Award XP based on progress milestones
            if (progress >= 50 && progress < 80) {
              await gamification.addXP(50); // GOAL_CHECKPOINT_50
            } else if (progress >= 80 && progress < 100) {
              await gamification.addXP(75); // GOAL_CHECKPOINT_80
            } else if (progress >= 100) {
              await gamification.addXP(100); // GOAL_COMPLETED
            }
          }
          await gamification.checkBadgeProgress();
        } catch (e) {
          console.warn('[GoalsProvider] Gamification update failed:', e);
        }
      }
      
      // Trigger callbacks for newly completed goals
      if (newlyCompleted.length > 0 && onGoalCompleted) {
        newlyCompleted.forEach((goal) => {
          console.log('[GoalsProvider] Triggering onGoalCompleted for:', goal.name);
          onGoalCompleted(goal);
        });
      }
    });
  }, [savedTransactionsHash, hydrated, recalculateAllGoalsProgress, onGoalCompleted]);

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

  const recalculateAllGoalsProgress = useCallback(async (): Promise<Goal[]> => {
    // Use functional update to get latest goals state
    return new Promise<Goal[]>((resolve) => {
      setGoals((currentGoals) => {
        if (currentGoals.length === 0) {
          console.log('[GoalsProvider] No goals to recalculate');
          resolve([]);
          return currentGoals;
        }

        console.log('[GoalsProvider] Recalculating all goals progress, goals count:', currentGoals.length);
        
        // Track which goals were just completed
        const previouslyCompleted = new Set(currentGoals.filter(g => g.status === 'completed').map(g => g.id));

        const recalculated = currentGoals.map((goal) => {
          const currentAmount = calculateGoalCurrentAmount(goal.id, transactionsByMonth);
          console.log(`[GoalsProvider] Goal ${goal.name}: currentAmount=${currentAmount}, targetAmount=${goal.targetAmount}, previous=${goal.currentAmount}`);
          const updatedGoal = { ...goal, currentAmount };
          return updateGoalStatus(updatedGoal);
        });

        // Find newly completed goals
        const newlyCompleted = recalculated.filter(
          (goal) => goal.status === 'completed' && !previouslyCompleted.has(goal.id)
        );

        // Check if any goals actually changed
        const hasChanges = recalculated.some((goal, index) => {
          const oldGoal = currentGoals[index];
          return goal.currentAmount !== oldGoal.currentAmount || goal.status !== oldGoal.status;
        });

        // Always update state to ensure UI is in sync
        console.log('[GoalsProvider] Updating goals state, hasChanges:', hasChanges, 'newlyCompleted:', newlyCompleted.length);
        
        // Save asynchronously
        saveGoals(recalculated).then(() => {
          console.log('[GoalsProvider] Recalculated all goals progress and saved');
        }).catch((err) => {
          console.error('[GoalsProvider] Failed to save recalculated goals:', err);
        });
        
        // Resolve promise with newly completed goals
        resolve(newlyCompleted);
        
        return recalculated;
      });
    });
  }, [transactionsByMonth]);

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

    // Update status based on current amount, but preserve explicitly set status
    let finalGoal: Goal;
    if (input.status !== undefined) {
      // If status is explicitly set, use it (but still update completedAt if needed)
      finalGoal = {
        ...updatedGoal,
        status: input.status,
        completedAt: input.status === 'completed' 
          ? (updatedGoal.completedAt || new Date().toISOString())
          : undefined,
      };
    } else {
      // Otherwise, auto-update status based on current amount
      finalGoal = updateGoalStatus(updatedGoal);
    }

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

