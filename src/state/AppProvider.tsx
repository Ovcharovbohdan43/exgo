import React from 'react';
import { TransactionsProvider } from './TransactionsProvider';
import { NotificationProvider } from './NotificationProvider';
import { MiniBudgetsProvider } from './MiniBudgetsProvider';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TransactionsProvider>
    <MiniBudgetsProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </MiniBudgetsProvider>
  </TransactionsProvider>
);
