import React from 'react';
import { Alert } from 'react-native';
import { TransactionsProvider } from './TransactionsProvider';
import { NotificationProvider, useNotifications } from './NotificationProvider';
import { MiniBudgetsProvider } from './MiniBudgetsProvider';
import { CreditProductsProvider } from './CreditProductsProvider';
import { GoalsProvider } from './GoalsProvider';
import { ConfettiProvider, useConfetti } from './ConfettiProvider';
import { Goal } from '../types';
import { useTranslation } from 'react-i18next';

const GoalsProviderWithCallbacks: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showConfetti } = useConfetti();
  const { createGoalCompletedNotification } = useNotifications();
  const { t } = useTranslation();

  const handleGoalCompleted = React.useCallback(async (goal: Goal) => {
    // Show confetti animation
    showConfetti();
    
    // Create notification in the notification system
    await createGoalCompletedNotification(goal.name);
    
    // Show alert as well for immediate feedback
    Alert.alert(
      t('goals.completedTitle', { defaultValue: 'Goal Completed!' }),
      t('goals.completedMessage', { 
        defaultValue: '{{goalName}} is completed! The ExGo team congratulates you on this achievement! 🎉',
        goalName: goal.name 
      }),
      [{ text: t('alerts.ok', { defaultValue: 'OK' }) }]
    );
  }, [showConfetti, createGoalCompletedNotification, t]);

  return (
    <GoalsProvider onGoalCompleted={handleGoalCompleted}>
      {children}
    </GoalsProvider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TransactionsProvider>
    <MiniBudgetsProvider>
      <CreditProductsProvider>
        <ConfettiProvider>
          <NotificationProvider>
            <GoalsProviderWithCallbacks>
              {children}
            </GoalsProviderWithCallbacks>
          </NotificationProvider>
        </ConfettiProvider>
      </CreditProductsProvider>
    </MiniBudgetsProvider>
  </TransactionsProvider>
);
