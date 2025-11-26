import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadNotifications, saveNotifications } from '../services/storage';
import { Notification, NotificationType } from '../types';
import { useSettings } from './SettingsProvider';
import { useTransactions } from './TransactionsProvider';
import { useMiniBudgets } from './MiniBudgetsProvider';
import { getMonthKey, getPreviousMonthKey } from '../utils/month';
import { calculateTotals } from '../modules/calculations';
import i18n from '../i18n';

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  hydrated: boolean;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  checkTriggers: () => Promise<void>; // Check and create notifications based on triggers
  createGoalCompletedNotification: (goalName: string) => Promise<void>; // Create notification for goal completion
  retryHydration: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { transactions, currentMonth, transactionsByMonth } = useTransactions();
  const { getMiniBudgetsByMonth, hydrated: miniBudgetsHydrated, miniBudgetStates } = useMiniBudgets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  // Track last checked transaction IDs to detect new large expenses
  const lastCheckedTransactionIdsRef = useRef<Set<string>>(new Set());
  // Track last checked mini budget IDs to avoid duplicate notifications
  const lastCheckedMiniBudgetIdsRef = useRef<Set<string>>(new Set());

  // Calculate unread count
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // Hydrate notifications from storage
  const hydrate = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await loadNotifications();
      console.log('[NotificationProvider] Loaded notifications from storage:', stored.length);
      setNotifications(stored);
      setHydrated(true);
    } catch (err) {
      console.error('[NotificationProvider] Failed to load notifications:', err);
      setNotifications([]);
      setHydrated(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Persist notifications to storage
  const persist = useCallback(
    async (next: Notification[]): Promise<void> => {
      try {
        await saveNotifications(next);
        console.log('[NotificationProvider] Saved notifications to storage:', next.length);
      } catch (err) {
        console.error('[NotificationProvider] Failed to save notifications:', err);
        throw err;
      }
    },
    [],
  );

  // Mark notification as read
  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        persist(updated).catch(console.error);
        return updated;
      });
    },
    [persist],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persist(updated).catch(console.error);
      return updated;
    });
  }, [persist]);

  // Delete notification
  const deleteNotification = useCallback(
    async (id: string) => {
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        persist(updated).catch(console.error);
        return updated;
      });
    },
    [persist],
  );

  // Create notification for goal completion
  const createGoalCompletedNotification = useCallback(
    async (goalName: string) => {
      const now = new Date();
      const currentMonthKey = getMonthKey(now);
      
      setNotifications((prevNotifications) => {
        // Check if notification for this goal already exists (avoid duplicates)
        const existingNotification = prevNotifications.find(
          (n) => n.type === 'goal_completed' && n.message.includes(goalName)
        );

        if (existingNotification) {
          console.log('[NotificationProvider] Goal completed notification already exists for:', goalName);
          return prevNotifications;
        }

        const newNotification: Notification = {
          id: uuidv4(),
          type: 'goal_completed',
          title: i18n.t('notifications.goalCompleted.title', { defaultValue: 'Goal Completed!' }),
          message: i18n.t('notifications.goalCompleted.message', {
            defaultValue: '{{goalName}} is completed! The ExGo team congratulates you on this achievement! 🎉',
            goalName,
          }),
          createdAt: now.toISOString(),
          read: false,
          monthKey: currentMonthKey,
        };

        const updated = [newNotification, ...prevNotifications];
        persist(updated).catch(console.error);

        console.log('[NotificationProvider] Created goal completed notification:', {
          notification: newNotification,
          goalName,
          currentMonthKey,
        });

        return updated;
      });
    },
    [persist],
  );

  // Check triggers and create notifications
  const checkTriggers = useCallback(async () => {
    if (!settings.monthlyIncome || settings.monthlyIncome <= 0) {
      return; // No income set, skip checks
    }

    const now = new Date();
    const currentMonthKey = getMonthKey(now);
    const currentDay = now.getDate();
    const isFirstWeekOfMonth = currentDay >= 1 && currentDay <= 7; // First week (days 1-7)

    // Get transactions for the current month
    const currentMonthTransactions = transactionsByMonth[currentMonthKey] || [];
    
    // Calculate totals for the current month
    const totals = calculateTotals(currentMonthTransactions, settings.monthlyIncome);

    // Use functional update to check existing notifications with latest state
    setNotifications((prevNotifications) => {
      // Trigger 1: Monthly Start Notifications (First Week)
      // Condition: first week of month (days 1-7) AND Expenses > 30% of monthly income
      // User has full balance at the start of the month, and if they spend more than 30% in the first week, send notification
      const existingFirstWeekNotification = prevNotifications.find(
        (n) => n.type === 'monthly_start_high_spending' && n.monthKey === currentMonthKey,
      );

      if (isFirstWeekOfMonth && !existingFirstWeekNotification) {
        const spendingThreshold = settings.monthlyIncome * 0.3; // 30% of monthly income

        // Check if expenses exceed 30% of monthly income
        if (totals.expenses > spendingThreshold) {
          const newNotification: Notification = {
            id: uuidv4(),
            type: 'monthly_start_high_spending',
            title: i18n.t('notifications.highSpendingAlert.title'),
            message: i18n.t('notifications.highSpendingAlert.message'),
            createdAt: now.toISOString(),
            read: false,
            monthKey: currentMonthKey,
          };

          const updated = [newNotification, ...prevNotifications];
          persist(updated).catch(console.error);

          console.log('[NotificationProvider] Created monthly start notification (first week):', {
            notification: newNotification,
            currentMonthKey,
            currentDay,
            expenses: totals.expenses,
            threshold: spendingThreshold,
            monthlyIncome: settings.monthlyIncome,
            expensesPercentage: (totals.expenses / settings.monthlyIncome) * 100,
          });

          return updated;
        }
      }

      // Trigger 2: Negative Balance Notification
      // Condition: remaining <= 0 (negative balance or zero)
      // Notify user that all funds are exhausted and ask to check if they forgot to add income
      const existingNegativeBalanceNotification = prevNotifications.find(
        (n) => n.type === 'negative_balance' && n.monthKey === currentMonthKey,
      );

      if (!existingNegativeBalanceNotification && totals.remaining <= 0) {
        const newNotification: Notification = {
          id: uuidv4(),
          type: 'negative_balance',
          title: i18n.t('notifications.fundsExhausted.title'),
          message: i18n.t('notifications.fundsExhausted.message'),
          createdAt: now.toISOString(),
          read: false,
          monthKey: currentMonthKey,
        };

        const updated = [newNotification, ...prevNotifications];
        persist(updated).catch(console.error);

        console.log('[NotificationProvider] Created negative balance notification:', {
          notification: newNotification,
          currentMonthKey,
          remaining: totals.remaining,
          expenses: totals.expenses,
          income: totals.income,
          monthlyIncome: settings.monthlyIncome,
        });

        return updated;
      }

      // Trigger 3: Overspending Alert (50% before 15th)
      // Condition: Remaining < 50% before the 15th of the month
      // Meaning: Spending pace is too fast
      const isBefore15th = currentDay < 15;
      const existingOverspending50Notification = prevNotifications.find(
        (n) => n.type === 'overspending_50_percent' && n.monthKey === currentMonthKey,
      );

      if (isBefore15th && !existingOverspending50Notification) {
        const remainingPercentage = (totals.remaining / settings.monthlyIncome) * 100;
        if (remainingPercentage < 50) {
          const newNotification: Notification = {
            id: uuidv4(),
            type: 'overspending_50_percent',
            title: i18n.t('notifications.overspendingAlert.title'),
            message: i18n.t('notifications.overspendingAlert.message'),
            createdAt: now.toISOString(),
            read: false,
            monthKey: currentMonthKey,
          };

          const updated = [newNotification, ...prevNotifications];
          persist(updated).catch(console.error);

          console.log('[NotificationProvider] Created overspending 50% notification:', {
            notification: newNotification,
            currentMonthKey,
            currentDay,
            remaining: totals.remaining,
            remainingPercentage,
            monthlyIncome: settings.monthlyIncome,
          });

          return updated;
        }
      }

      // Trigger 4: Large Expense Spike
      // Condition: expense > 20% of income (unusually large expense)
      // Check for new expense transactions that haven't been checked yet
      const largeExpenseThreshold = settings.monthlyIncome * 0.2; // 20% of income
      const expenseTransactions = currentMonthTransactions.filter((tx) => tx.type === 'expense');
      
      // Find new large expenses that haven't been checked yet
      // Only check transactions that exceed the threshold
      const newLargeExpenses = expenseTransactions.filter(
        (tx) => 
          tx.amount > largeExpenseThreshold && 
          !lastCheckedTransactionIdsRef.current.has(tx.id)
      );

      if (newLargeExpenses.length > 0) {
        // Check for existing notification within last hour (spam protection)
        const oneHourAgo = now.getTime() - 3600000; // 1 hour in milliseconds
        const existingLargeExpenseNotification = prevNotifications.find(
          (n) => 
            n.type === 'large_expense_spike' && 
            n.monthKey === currentMonthKey &&
            new Date(n.createdAt).getTime() > oneHourAgo
        );

        if (!existingLargeExpenseNotification) {
          // Create notification for the largest new expense
          const largestExpense = newLargeExpenses.reduce((max, tx) => 
            tx.amount > max.amount ? tx : max
          );

          const newNotification: Notification = {
            id: uuidv4(),
            type: 'large_expense_spike',
            title: i18n.t('notifications.largeExpenseAlert.title'),
            message: i18n.t('notifications.largeExpenseAlert.message'),
            createdAt: now.toISOString(),
            read: false,
            monthKey: currentMonthKey,
          };

          // Mark all new large expenses as checked to prevent duplicate notifications
          newLargeExpenses.forEach((tx) => {
            lastCheckedTransactionIdsRef.current.add(tx.id);
          });

          const updated = [newNotification, ...prevNotifications];
          persist(updated).catch(console.error);

          console.log('[NotificationProvider] Created large expense spike notification:', {
            notification: newNotification,
            currentMonthKey,
            expenseAmount: largestExpense.amount,
            threshold: largeExpenseThreshold,
            monthlyIncome: settings.monthlyIncome,
            newLargeExpensesCount: newLargeExpenses.length,
            checkedTransactionIds: Array.from(lastCheckedTransactionIdsRef.current),
          });

          return updated;
        } else {
          // Even if notification exists, mark these transactions as checked to prevent future checks
          newLargeExpenses.forEach((tx) => {
            lastCheckedTransactionIdsRef.current.add(tx.id);
          });
          
          console.log('[NotificationProvider] Large expense detected but notification already exists (spam protection):', {
            currentMonthKey,
            newLargeExpensesCount: newLargeExpenses.length,
            lastNotificationTime: existingLargeExpenseNotification.createdAt,
          });
        }
      }

      // Trigger 5: Low Balance Alert (20%)
      // Condition: Remaining < 20% (any time of month)
      // Meaning: Budget almost exhausted
      const existingLowBalance20Notification = prevNotifications.find(
        (n) => n.type === 'low_balance_20_percent' && n.monthKey === currentMonthKey,
      );

      if (!existingLowBalance20Notification) {
        const remainingPercentage = (totals.remaining / settings.monthlyIncome) * 100;
        if (remainingPercentage < 20 && totals.remaining > 0) {
          const newNotification: Notification = {
            id: uuidv4(),
            type: 'low_balance_20_percent',
            title: i18n.t('notifications.lowBalanceWarning.title'),
            message: i18n.t('notifications.lowBalanceWarning.message'),
            createdAt: now.toISOString(),
            read: false,
            monthKey: currentMonthKey,
          };

          const updated = [newNotification, ...prevNotifications];
          persist(updated).catch(console.error);

          console.log('[NotificationProvider] Created low balance 20% notification:', {
            notification: newNotification,
            currentMonthKey,
            remaining: totals.remaining,
            remainingPercentage,
            monthlyIncome: settings.monthlyIncome,
          });

          return updated;
        }
      }

      // Trigger 6: Mini Budget Warnings and Over Budget Alerts
      // Check mini budgets for warning and over states
      if (miniBudgetsHydrated) {
        const miniBudgets = getMiniBudgetsByMonth(currentMonthKey);
        let updatedNotifications = prevNotifications;

        for (const budget of miniBudgets) {
          const notificationKey = `mini_budget_${budget.id}_${currentMonthKey}`;
          
          // Check if notification already exists for this budget
          const existingNotification = prevNotifications.find(
            (n) => 
              (n.type === 'mini_budget_warning' || n.type === 'mini_budget_over') &&
              n.monthKey === currentMonthKey &&
              n.message.includes(budget.name)
          );

          // If notification exists and state hasn't changed, skip
          if (existingNotification) {
            // Check if state changed from warning to over (or vice versa)
            const currentState = budget.state.state;
            const existingState = existingNotification.type === 'mini_budget_over' ? 'over' : 'warning';
            
            // Only skip if state is the same
            if (currentState === existingState) {
              if (!lastCheckedMiniBudgetIdsRef.current.has(notificationKey)) {
                lastCheckedMiniBudgetIdsRef.current.add(notificationKey);
              }
              continue;
            }
            
            // State changed, remove old notification and create new one
            const filteredNotifications = prevNotifications.filter((n) => n.id !== existingNotification.id);
            prevNotifications = filteredNotifications;
            lastCheckedMiniBudgetIdsRef.current.delete(notificationKey);
          } else if (lastCheckedMiniBudgetIdsRef.current.has(notificationKey)) {
            // Already checked but no notification exists - might be state changed back to ok
            // Only skip if state is ok
            if (budget.state.state === 'ok') {
              continue;
            }
            // State changed from ok to warning/over, allow notification
            lastCheckedMiniBudgetIdsRef.current.delete(notificationKey);
          }

          // Check for over budget state
          if (budget.state.state === 'over') {
            const overAmount = budget.state.spentAmount - budget.limitAmount;
            const newNotification: Notification = {
              id: uuidv4(),
              type: 'mini_budget_over',
              title: i18n.t('notifications.miniBudgetOver.title'),
              message: i18n.t('notifications.miniBudgetOver.message', {
                budgetName: budget.name,
                limit: `${settings.currency} ${budget.limitAmount.toFixed(2)}`,
                spent: `${settings.currency} ${budget.state.spentAmount.toFixed(2)}`,
                over: `${settings.currency} ${overAmount.toFixed(2)}`,
              }),
              createdAt: now.toISOString(),
              read: false,
              monthKey: currentMonthKey,
            };

            updatedNotifications = [newNotification, ...updatedNotifications];
            lastCheckedMiniBudgetIdsRef.current.add(notificationKey);
            persist(updatedNotifications).catch(console.error);

            console.log('[NotificationProvider] Created mini budget over notification:', {
              notification: newNotification,
              budgetId: budget.id,
              budgetName: budget.name,
              spent: budget.state.spentAmount,
              limit: budget.limitAmount,
              over: overAmount,
            });

            return updatedNotifications;
          }

          // Check for warning state (spending too fast)
          if (budget.state.state === 'warning') {
            const newNotification: Notification = {
              id: uuidv4(),
              type: 'mini_budget_warning',
              title: i18n.t('notifications.miniBudgetWarning.title'),
              message: i18n.t('notifications.miniBudgetWarning.message', {
                budgetName: budget.name,
                limit: `${settings.currency} ${budget.limitAmount.toFixed(2)}`,
              }),
              createdAt: now.toISOString(),
              read: false,
              monthKey: currentMonthKey,
            };

            updatedNotifications = [newNotification, ...updatedNotifications];
            lastCheckedMiniBudgetIdsRef.current.add(notificationKey);
            persist(updatedNotifications).catch(console.error);

            console.log('[NotificationProvider] Created mini budget warning notification:', {
              notification: newNotification,
              budgetId: budget.id,
              budgetName: budget.name,
              spent: budget.state.spentAmount,
              limit: budget.limitAmount,
              forecast: budget.state.forecast,
            });

            return updatedNotifications;
          }
        }
      }

      // No new notifications, return previous state
      return prevNotifications;
    });
  }, [settings.monthlyIncome, transactionsByMonth, persist, miniBudgetsHydrated, getMiniBudgetsByMonth]);

  // Clear checked transaction IDs and mini budget IDs when month changes
  // This ensures that transactions from previous months don't interfere with new month checks
  useEffect(() => {
    console.log('[NotificationProvider] Month changed, clearing checked transaction IDs:', {
      newMonth: currentMonth,
      previousCheckedCount: lastCheckedTransactionIdsRef.current.size,
      previousMiniBudgetCheckedCount: lastCheckedMiniBudgetIdsRef.current.size,
    });
    lastCheckedTransactionIdsRef.current.clear();
    lastCheckedMiniBudgetIdsRef.current.clear();
  }, [currentMonth]);

  // Track mini budget states changes to trigger notifications
  const miniBudgetStatesKey = useMemo(() => {
    if (!miniBudgetStates || Object.keys(miniBudgetStates).length === 0) {
      return '';
    }
    // Create a key from all budget states to detect changes
    return Object.entries(miniBudgetStates)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, state]) => `${key}:${state.state}:${state.spentAmount.toFixed(2)}`)
      .join('|');
  }, [miniBudgetStates]);

  // Check triggers when transactions, month, or mini budget states change
  useEffect(() => {
    if (hydrated && settings.monthlyIncome > 0) {
      checkTriggers();
    }
  }, [hydrated, currentMonth, transactionsByMonth, settings.monthlyIncome, miniBudgetStatesKey, checkTriggers]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    hydrated,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    checkTriggers,
    createGoalCompletedNotification,
    retryHydration: hydrate,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

