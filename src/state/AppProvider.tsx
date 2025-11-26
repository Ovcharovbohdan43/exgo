import React from 'react';
import { TransactionsProvider } from './TransactionsProvider';
import { NotificationProvider } from './NotificationProvider';
import { MiniBudgetsProvider } from './MiniBudgetsProvider';
import { CreditProductsProvider } from './CreditProductsProvider';
import { GoalsProvider } from './GoalsProvider';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TransactionsProvider>
    <MiniBudgetsProvider>
      <CreditProductsProvider>
        <GoalsProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </GoalsProvider>
      </CreditProductsProvider>
    </MiniBudgetsProvider>
  </TransactionsProvider>
);
