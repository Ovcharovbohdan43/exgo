import React from 'react';
import { SettingsProvider } from './SettingsProvider';
import { TransactionsProvider } from './TransactionsProvider';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SettingsProvider>
    <TransactionsProvider>{children}</TransactionsProvider>
  </SettingsProvider>
);
