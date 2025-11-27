import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadGamification, saveGamification } from '../services/storage';
import { GamificationState, StreakState, Badge, BadgeTier, BadgeCategory, Challenge, ChallengeType, ChallengeStatus, LevelState } from '../types';
import { useTransactions } from './TransactionsProvider';
import { useGoals } from './GoalsProvider';
import { useMiniBudgets } from './MiniBudgetsProvider';
import { useCreditProducts } from './CreditProductsProvider';
import { useSettings } from './SettingsProvider';
import { logError, addBreadcrumb } from '../services/sentry';
import { getMonthKey } from '../utils/month';

// XP values for different actions
const XP_VALUES = {
  TRANSACTION_LOGGED: 10,
  GOAL_CHECKPOINT_50: 50,
  GOAL_CHECKPOINT_80: 75,
  GOAL_COMPLETED: 100,
  BUDGET_UNDER_LIMIT: 25,
  DEBT_ON_TIME: 30,
  CHALLENGE_COMPLETED: 150,
};

// XP required per level (linear progression: level * 100)
const getXPForLevel = (level: number): number => {
  return level * 100;
};

// Initialize default badges
const initializeBadges = (): Badge[] => {
  return [
    // Logging badges
    { id: 'logging_7', name: 'Week Warrior', tier: 'bronze', category: 'logging', unlockedAt: null, progress: 0, target: 7, description: 'Log transactions for 7 consecutive days' },
    { id: 'logging_30', name: 'Monthly Logger', tier: 'silver', category: 'logging', unlockedAt: null, progress: 0, target: 30, description: 'Log transactions for 30 days' },
    { id: 'logging_100', name: 'Centurion', tier: 'gold', category: 'logging', unlockedAt: null, progress: 0, target: 100, description: 'Log transactions for 100 days' },
    
    // Goal badges
    { id: 'goal_50', name: 'Halfway Hero', tier: 'bronze', category: 'goals', unlockedAt: null, progress: 0, target: 50, description: 'Reach 50% of any goal' },
    { id: 'goal_80', name: 'Almost There', tier: 'silver', category: 'goals', unlockedAt: null, progress: 0, target: 80, description: 'Reach 80% of any goal' },
    { id: 'goal_100', name: 'Goal Master', tier: 'gold', category: 'goals', unlockedAt: null, progress: 0, target: 100, description: 'Complete any goal' },
    
    // Budget badges
    { id: 'budget_1', name: 'Budget Keeper', tier: 'bronze', category: 'budgets', unlockedAt: null, progress: 0, target: 1, description: 'Stay under budget for 1 month' },
    { id: 'budget_3', name: 'Budget Master', tier: 'silver', category: 'budgets', unlockedAt: null, progress: 0, target: 3, description: 'Stay under budget for 3 months' },
    { id: 'budget_6', name: 'Budget Legend', tier: 'gold', category: 'budgets', unlockedAt: null, progress: 0, target: 6, description: 'Stay under budget for 6 months' },
    
    // Debt badges
    { id: 'debt_3', name: 'On-Time Payer', tier: 'bronze', category: 'debts', unlockedAt: null, progress: 0, target: 3, description: 'Make on-time payments for 3 months' },
    { id: 'debt_6', name: 'Reliable Payer', tier: 'silver', category: 'debts', unlockedAt: null, progress: 0, target: 6, description: 'Make on-time payments for 6 months' },
    { id: 'debt_12', name: 'Debt Free Champion', tier: 'gold', category: 'debts', unlockedAt: null, progress: 0, target: 12, description: 'Make on-time payments for 12 months' },
    
    // Consistency badges
    { id: 'consistency_1', name: 'Steady Saver', tier: 'bronze', category: 'consistency', unlockedAt: null, progress: 0, target: 1, description: 'No overspending for 1 month' },
    { id: 'consistency_3', name: 'Consistent Saver', tier: 'silver', category: 'consistency', unlockedAt: null, progress: 0, target: 3, description: 'No overspending for 3 months' },
    { id: 'consistency_6', name: 'Financial Discipline', tier: 'gold', category: 'consistency', unlockedAt: null, progress: 0, target: 6, description: 'No overspending for 6 months' },
  ];
};

// Initialize default gamification state
const initializeGamificationState = (): GamificationState => {
  return {
    streak: {
      current: 0,
      best: 0,
      skipTokens: 0,
      lastDate: null,
    },
    badges: initializeBadges(),
    challenges: [],
    level: {
      xp: 0,
      level: 1,
    },
    lastUpdated: new Date().toISOString(),
  };
};

export type GamificationError = {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
};

type GamificationContextValue = {
  streak: StreakState;
  badges: Badge[];
  challenges: Challenge[];
  level: LevelState;
  hydrated: boolean;
  loading: boolean;
  error: GamificationError | null;
  // Methods
  addXP: (amount: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  checkBadgeProgress: () => Promise<void>;
  unlockBadge: (badgeId: string) => Promise<void>;
  createChallenge: (challenge: Omit<Challenge, 'id' | 'status' | 'progress'>) => Promise<Challenge>;
  updateChallengeProgress: (challengeId: string, progress: number) => Promise<void>;
  completeChallenge: (challengeId: string) => Promise<void>;
  retryHydration: () => Promise<void>;
};

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // These hooks must be called unconditionally (React rules)
  // They will throw if providers are not available, which is expected
  const { transactionsByMonth, currentMonth } = useTransactions();
  const { goals } = useGoals();
  const { miniBudgets, miniBudgetStates } = useMiniBudgets();
  const { creditProducts } = useCreditProducts();
  
  // Settings is optional - handle gracefully if SettingsProvider is not available
  let settings: any = null;
  if (useSettings) {
    try {
      const settingsData = useSettings();
      settings = settingsData.settings;
    } catch (e) {
      // SettingsProvider not available - this is OK, we'll use defaults
      console.warn('[GamificationProvider] SettingsProvider not available, using defaults');
    }
  }
  
  const [gamificationState, setGamificationState] = useState<GamificationState>(initializeGamificationState());
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GamificationError | null>(null);
  
  const hasHydratedRef = useRef(false);
  const lastProcessedTransactionDateRef = useRef<string | null>(null);

  // Persist gamification state
  const persist = useCallback(async (state: GamificationState): Promise<void> => {
    setError(null);
    try {
      await saveGamification(state);
      addBreadcrumb('Gamification state saved', 'storage', 'info', {
        streak: state.streak.current,
        badgesUnlocked: state.badges.filter(b => b.unlockedAt !== null).length,
        level: state.level.level,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save gamification state';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      
      setError({
        message: errorMessage,
        code: 'SAVE_ERROR',
        retry: async () => {
          await persist(state);
        },
      });
      
      logError(errorObj, {
        component: 'GamificationProvider',
        operation: 'persist',
        errorCode: 'SAVE_ERROR',
      });
      throw err;
    }
  }, []);

  // Hydrate from storage
  const hydrate = useCallback(async () => {
    if (hasHydratedRef.current) {
      console.log('[GamificationProvider] Already hydrated, skipping re-hydration');
      return;
    }

    hasHydratedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const stored = await loadGamification();
      
      if (stored) {
        console.log('[GamificationProvider] Loaded from storage:', {
          streak: stored.streak.current,
          badgesUnlocked: stored.badges.filter(b => b.unlockedAt !== null).length,
          level: stored.level.level,
        });
        setGamificationState(stored);
      } else {
        console.log('[GamificationProvider] No stored state, initializing default');
        const initialState = initializeGamificationState();
        setGamificationState(initialState);
        await persist(initialState);
      }
      
      setHydrated(true);
      const loadedState = stored || initializeGamificationState();
      addBreadcrumb('Gamification state loaded', 'storage', 'info', {
        streak: loadedState.streak.current,
        badgesUnlocked: loadedState.badges.filter(b => b.unlockedAt !== null).length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load gamification state';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      
      setError({
        message: errorMessage,
        code: 'HYDRATION_ERROR',
        retry: hydrate,
      });
      
      setGamificationState(initializeGamificationState());
      setHydrated(true);
      console.error('[GamificationProvider] Hydration error:', err);
      
      logError(errorObj, {
        component: 'GamificationProvider',
        operation: 'hydrate',
        errorCode: 'HYDRATION_ERROR',
      });
    } finally {
      setLoading(false);
    }
  }, [persist, gamificationState.streak.current, gamificationState.badges]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Calculate level from XP
  const calculateLevel = useCallback((xp: number): number => {
    let level = 1;
    let requiredXP = getXPForLevel(level);
    
    while (xp >= requiredXP) {
      level++;
      requiredXP = getXPForLevel(level);
    }
    
    return level - 1;
  }, []);

  // Add XP and update level
  const addXP = useCallback(async (amount: number) => {
    setGamificationState((prev) => {
      const newXP = prev.level.xp + amount;
      const newLevel = calculateLevel(newXP);
      
      const updated = {
        ...prev,
        level: {
          xp: newXP,
          level: newLevel,
        },
        lastUpdated: new Date().toISOString(),
      };
      
      persist(updated).catch(console.error);
      return updated;
    });
  }, [calculateLevel, persist]);

  // Update streak when transaction is logged
  const updateStreak = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    setGamificationState((prev) => {
      const lastDate = prev.streak.lastDate;
      
      // If already logged today, don't update
      if (lastDate === today) {
        return prev;
      }
      
      let newStreak = prev.streak.current;
      let newSkipTokens = prev.streak.skipTokens;
      
      if (lastDate) {
        const lastDateObj = new Date(lastDate);
        const todayObj = new Date(today);
        const daysDiff = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day
          newStreak += 1;
        } else if (daysDiff > 1) {
          // Streak broken
          if (newSkipTokens > 0 && daysDiff === 2) {
            // Use skip token
            newSkipTokens -= 1;
            newStreak += 1;
          } else {
            // Reset streak
            newStreak = 1;
          }
        }
        // daysDiff === 0 means same day, already handled above
      } else {
        // First transaction ever
        newStreak = 1;
      }
      
      // Award skip token every 14 days
      if (newStreak > 0 && newStreak % 14 === 0 && newStreak > prev.streak.current) {
        newSkipTokens += 1;
      }
      
      const updated = {
        ...prev,
        streak: {
          current: newStreak,
          best: Math.max(prev.streak.best, newStreak),
          skipTokens: newSkipTokens,
          lastDate: today,
        },
        lastUpdated: new Date().toISOString(),
      };
      
      persist(updated).catch(console.error);
      return updated;
    });
  }, [persist]);

  // Check and update badge progress
  const checkBadgeProgress = useCallback(async () => {
    setGamificationState((prev) => {
      const updatedBadges = prev.badges.map((badge) => {
        // Skip if already unlocked
        if (badge.unlockedAt !== null) {
          return badge;
        }
        
        let newProgress = badge.progress;
        
        switch (badge.category) {
          case 'logging':
            // Use streak current for logging badges
            newProgress = prev.streak.current;
            break;
            
          case 'goals':
            // Check goal progress percentages
            const goalProgress = goals
              .filter(g => g.status === 'active')
              .map(g => Math.floor((g.currentAmount / g.targetAmount) * 100))
              .sort((a, b) => b - a)[0] || 0;
            
            if (badge.id === 'goal_50') {
              newProgress = goalProgress >= 50 ? 50 : goalProgress;
            } else if (badge.id === 'goal_80') {
              newProgress = goalProgress >= 80 ? 80 : goalProgress;
            } else if (badge.id === 'goal_100') {
              newProgress = goalProgress >= 100 ? 100 : goalProgress;
            }
            break;
            
          case 'budgets':
            // Count months under budget
            // This is simplified - in real implementation, track monthly budget status
            // For now, use a placeholder
            break;
            
          case 'debts':
            // Count on-time payments
            // This is simplified - in real implementation, track payment history
            break;
            
          case 'consistency':
            // Count months without overspending
            // This is simplified - in real implementation, track monthly spending vs budget
            break;
        }
        
        return {
          ...badge,
          progress: newProgress,
        };
      });
      
      const updated = {
        ...prev,
        badges: updatedBadges,
        lastUpdated: new Date().toISOString(),
      };
      
      persist(updated).catch(console.error);
      return updated;
    });
  }, [goals, persist]);

  // Unlock a badge
  const unlockBadge = useCallback(async (badgeId: string) => {
    setGamificationState((prev) => {
      const updatedBadges = prev.badges.map((badge) => {
        if (badge.id === badgeId && badge.unlockedAt === null) {
          return {
            ...badge,
            unlockedAt: new Date().toISOString(),
            progress: badge.target,
          };
        }
        return badge;
      });
      
      const updated = {
        ...prev,
        badges: updatedBadges,
        lastUpdated: new Date().toISOString(),
      };
      
      persist(updated).catch(console.error);
      return updated;
    });
    
    // Award XP for badge unlock
    await addXP(50);
  }, [addXP, persist]);

  // Create a challenge
  const createChallenge = useCallback(async (challengeData: Omit<Challenge, 'id' | 'status' | 'progress'>): Promise<Challenge> => {
    const newChallenge: Challenge = {
      id: uuidv4(),
      ...challengeData,
      status: 'active',
      progress: 0,
    };
    
    setGamificationState((prev) => {
      // Only allow one active challenge at a time
      const updatedChallenges = prev.challenges.map(c => 
        c.status === 'active' ? { ...c, status: 'expired' as ChallengeStatus } : c
      );
      
      const updated = {
        ...prev,
        challenges: [...updatedChallenges, newChallenge],
        lastUpdated: new Date().toISOString(),
      };
      
      persist(updated).catch(console.error);
      return updated;
    });
    
    return newChallenge;
  }, [persist]);

  // Update challenge progress
  const updateChallengeProgress = useCallback(async (challengeId: string, progress: number) => {
    setGamificationState((prev) => {
      const updatedChallenges = prev.challenges.map((challenge) => {
        if (challenge.id === challengeId && challenge.status === 'active') {
          return {
            ...challenge,
            progress: Math.min(progress, challenge.target),
          };
        }
        return challenge;
      });
      
      const updated = {
        ...prev,
        challenges: updatedChallenges,
        lastUpdated: new Date().toISOString(),
      };
      
      persist(updated).catch(console.error);
      return updated;
    });
  }, [persist]);

  // Complete a challenge
  const completeChallenge = useCallback(async (challengeId: string) => {
    setGamificationState((prev) => {
      const updatedChallenges = prev.challenges.map((challenge) => {
        if (challenge.id === challengeId && challenge.status === 'active') {
          return {
            ...challenge,
            status: 'completed',
            progress: challenge.target,
          };
        }
        return challenge;
      });
      
      const updated = {
        ...prev,
        challenges: updatedChallenges,
        lastUpdated: new Date().toISOString(),
      };
      
      persist(updated).catch(console.error);
      return updated;
    });
    
    // Award XP for challenge completion
    await addXP(XP_VALUES.CHALLENGE_COMPLETED);
  }, [addXP, persist]);

  // Check for badge unlocks when progress changes
  useEffect(() => {
    if (!hydrated) return;
    
    gamificationState.badges.forEach((badge) => {
      if (badge.unlockedAt === null && badge.progress >= badge.target) {
        unlockBadge(badge.id);
      }
    });
  }, [gamificationState.badges, hydrated, unlockBadge]);

  // Check for challenge completion
  useEffect(() => {
    if (!hydrated) return;
    
    const now = new Date();
    gamificationState.challenges.forEach((challenge) => {
      if (challenge.status === 'active') {
        const endDate = new Date(challenge.end);
        
        if (now > endDate) {
          if (challenge.progress >= challenge.target) {
            completeChallenge(challenge.id);
          } else {
            // Challenge expired without completion
            setGamificationState((prev) => {
              const updatedChallenges = prev.challenges.map((c) => 
                c.id === challenge.id ? { ...c, status: 'expired' as ChallengeStatus } : c
              );
              
              const updated = {
                ...prev,
                challenges: updatedChallenges,
                lastUpdated: new Date().toISOString(),
              };
              
              persist(updated).catch(console.error);
              return updated;
            });
          }
        }
      }
    });
  }, [gamificationState.challenges, hydrated, completeChallenge, persist]);

  const retryHydration = useCallback(async () => {
    hasHydratedRef.current = false;
    await hydrate();
  }, [hydrate]);

  const value = useMemo(
    () => ({
      streak: gamificationState.streak,
      badges: gamificationState.badges,
      challenges: gamificationState.challenges,
      level: gamificationState.level,
      hydrated,
      loading,
      error,
      addXP,
      updateStreak,
      checkBadgeProgress,
      unlockBadge,
      createChallenge,
      updateChallengeProgress,
      completeChallenge,
      retryHydration,
    }),
    [
      gamificationState,
      hydrated,
      loading,
      error,
      addXP,
      updateStreak,
      checkBadgeProgress,
      unlockBadge,
      createChallenge,
      updateChallengeProgress,
      completeChallenge,
      retryHydration,
    ],
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
};

export const useGamification = () => {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error('useGamification must be used within GamificationProvider');
  }
  return ctx;
};

