import { renderHook } from '@testing-library/react-native';
import {
  useMonthlyTotals,
  useCategoryBreakdown,
  useCurrentMonthTransactions,
  useTransactionsByType,
  useLastTransaction,
} from '../selectors';
import { Transaction } from '../../types';

// Mock calculations module
jest.mock('../../modules/calculations', () => ({
  calculateTotals: jest.fn((transactions, income) => ({
    expenses: 100,
    saved: 50,
    income,
    remaining: income - 150,
  })),
  categoryBreakdown: jest.fn((transactions) => ({
    Food: { amount: 50, percent: 50 },
    Transport: { amount: 50, percent: 50 },
  })),
}));

describe('Selectors', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'expense',
      amount: 50,
      category: 'Food',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'expense',
      amount: 50,
      category: 'Transport',
      createdAt: new Date().toISOString(),
    },
  ];

  describe('useMonthlyTotals', () => {
    it('should calculate totals', () => {
      const { result } = renderHook(() => useMonthlyTotals(mockTransactions, 1000));

      expect(result.current).toEqual({
        expenses: 100,
        saved: 50,
        income: 1000,
        remaining: 850,
      });
    });

    it('should memoize result', () => {
      const { result, rerender } = renderHook(
        (props: { transactions: Transaction[]; income: number }) =>
          useMonthlyTotals(props.transactions, props.income),
        {
          initialProps: { transactions: mockTransactions, income: 1000 },
        },
      );

      const firstResult = result.current;
      rerender({ transactions: mockTransactions, income: 1000 });
      expect(result.current).toBe(firstResult); // Same reference
    });
  });

  describe('useCategoryBreakdown', () => {
    it('should calculate breakdown', () => {
      const { result } = renderHook(() => useCategoryBreakdown(mockTransactions));

      expect(result.current).toEqual({
        Food: { amount: 50, percent: 50 },
        Transport: { amount: 50, percent: 50 },
      });
    });
  });

  describe('useCurrentMonthTransactions', () => {
    it('should filter current month transactions', () => {
      const currentMonthTx: Transaction = {
        id: '1',
        type: 'expense',
        amount: 100,
        createdAt: new Date().toISOString(),
      };

      const lastMonthTx: Transaction = {
        id: '2',
        type: 'expense',
        amount: 50,
        createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { result } = renderHook(() =>
        useCurrentMonthTransactions([currentMonthTx, lastMonthTx]),
      );

      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe('1');
    });
  });

  describe('useTransactionsByType', () => {
    it('should filter by type', () => {
      const transactions: Transaction[] = [
        { id: '1', type: 'expense', amount: 100, createdAt: new Date().toISOString() },
        { id: '2', type: 'income', amount: 1000, createdAt: new Date().toISOString() },
        { id: '3', type: 'expense', amount: 50, createdAt: new Date().toISOString() },
      ];

      const { result } = renderHook(() => useTransactionsByType(transactions, 'expense'));

      expect(result.current).toHaveLength(2);
      expect(result.current.every((tx) => tx.type === 'expense')).toBe(true);
    });
  });

  describe('useLastTransaction', () => {
    it('should return last transaction by date', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amount: 100,
          createdAt: new Date(Date.now() - 1000).toISOString(),
        },
        {
          id: '2',
          type: 'income',
          amount: 1000,
          createdAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() => useLastTransaction(transactions));

      expect(result.current?.id).toBe('2');
    });

    it('should return null for empty array', () => {
      const { result } = renderHook(() => useLastTransaction([]));

      expect(result.current).toBeNull();
    });
  });
});

