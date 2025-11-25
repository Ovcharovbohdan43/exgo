import React from 'react';
import { TransactionsProvider } from './TransactionsProvider';
import { NotificationProvider } from './NotificationProvider';
import { MiniBudgetsProvider } from './MiniBudgetsProvider';
import { CreditProductsProvider } from './CreditProductsProvider';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TransactionsProvider>
    <MiniBudgetsProvider>
      <CreditProductsProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </CreditProductsProvider>
    </MiniBudgetsProvider>
  </TransactionsProvider>
);
