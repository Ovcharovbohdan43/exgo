import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadNotifications, saveNotifications } from '../services/storage';
import { Notification, NotificationType } from '../types';
import { useSettings } from './SettingsProvider';
import { useTransactions } from './TransactionsProvider';
import { getMonthKey, getPreviousMonthKey } from '../utils/month';
import { calculateTotals } from '../modules/calculations';

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  hydrated: boolean;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  checkTriggers: () => Promise<void>; // Check and create notifications based on triggers
  retryHydration: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { transactions, currentMonth, transactionsByMonth } = useTransactions();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  // Track last checked transaction IDs to detect new large expenses
  const lastCheckedTransactionIdsRef = useRef<Set<string>>(new Set());

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
            title: 'High Spending Alert',
            message:
              'We noticed high spending activity at the start of the month. Keep an eye on your budget to stay on track.',
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
          title: 'Funds Exhausted',
          message:
            'All available funds have been exhausted. Please check if everything is okay. If you forgot to add any income, please add it so the app can work correctly.',
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
            title: 'Overspending Alert',
            message:
              "You've used more than half of your monthly budget. Consider slowing down your spending pace.",
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
            title: 'Large Expense Alert',
            message:
              'A large expense was recorded. Make sure this fits your monthly plan.',
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
            title: 'Low Balance Warning',
            message:
              'Your remaining balance is getting low. Stay cautious with your upcoming expenses.',
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

      // No new notifications, return previous state
      return prevNotifications;
    });
  }, [settings.monthlyIncome, transactionsByMonth, persist]);

  // Clear checked transaction IDs when month changes
  // This ensures that transactions from previous months don't interfere with new month checks
  useEffect(() => {
    console.log('[NotificationProvider] Month changed, clearing checked transaction IDs:', {
      newMonth: currentMonth,
      previousCheckedCount: lastCheckedTransactionIdsRef.current.size,
    });
    lastCheckedTransactionIdsRef.current.clear();
  }, [currentMonth]);

  // Check triggers when transactions or month changes
  useEffect(() => {
    if (hydrated && settings.monthlyIncome > 0) {
      checkTriggers();
    }
  }, [hydrated, currentMonth, transactionsByMonth, settings.monthlyIncome, checkTriggers]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    hydrated,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    checkTriggers,
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

