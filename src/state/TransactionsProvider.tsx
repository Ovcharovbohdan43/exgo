import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadTransactions, saveTransactions } from '../services/storage';
import { Transaction, TransactionType } from '../types';

type TransactionsContextValue = {
  transactions: Transaction[];
  hydrated: boolean;
  addTransaction: (input: {
    amount: number;
    type: TransactionType;
    category?: string;
    createdAt?: string;
  }) => Promise<void>;
  resetTransactions: () => Promise<void>;
};

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

export const TransactionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await loadTransactions();
      if (stored) setTransactions(stored);
      setHydrated(true);
    })();
  }, []);

  const addTransaction: TransactionsContextValue['addTransaction'] = async ({
    amount,
    type,
    category,
    createdAt,
  }) => {
    const tx: Transaction = {
      id: uuidv4(),
      amount,
      type,
      category,
      createdAt: createdAt ?? new Date().toISOString(),
    };
    const next = [...transactions, tx];
    setTransactions(next);
    try {
      await saveTransactions(next);
    } catch {
      // swallow for now; surface later via UI toast/logging
    }
  };

  const resetTransactions = async () => {
    setTransactions([]);
    try {
      await saveTransactions([]);
    } catch {
      // swallow for now; surface later via UI toast/logging
    }
  };

  const value = useMemo(
    () => ({
      transactions,
      hydrated,
      addTransaction,
      resetTransactions,
    }),
    [transactions, hydrated],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
};

export const useTransactions = () => {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
};
