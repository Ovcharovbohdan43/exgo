import React from 'react';
import { TransactionsProvider } from './TransactionsProvider';
import { NotificationProvider } from './NotificationProvider';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TransactionsProvider>
    <NotificationProvider>{children}</NotificationProvider>
  </TransactionsProvider>
);
