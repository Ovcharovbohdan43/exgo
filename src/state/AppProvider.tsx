import React from 'react';
import { SettingsProvider } from './SettingsProvider';
import { TransactionsProvider } from './TransactionsProvider';
import { NotificationProvider } from './NotificationProvider';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SettingsProvider>
    <TransactionsProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </TransactionsProvider>
  </SettingsProvider>
);
