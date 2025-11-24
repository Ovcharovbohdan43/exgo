import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { TransactionsProvider, useTransactions } from '../TransactionsProvider';
import * as storage from '../../services/storage';
import { Transaction } from '../../types';

// Mock storage
jest.mock('../../services/storage');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TransactionsProvider>{children}</TransactionsProvider>
);

describe('TransactionsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide empty array initially', () => {
    (storage.loadTransactions as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useTransactions(), { wrapper });

    expect(result.current.transactions).toEqual([]);
  });

  it('should load transactions from storage', async () => {
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 100,
        category: 'Food',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    (storage.loadTransactions as jest.Mock).mockResolvedValue(mockTransactions);

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.transactions).toEqual(mockTransactions);
  });

  it('should add transaction', async () => {
    (storage.loadTransactions as jest.Mock).mockResolvedValue(null);
    (storage.saveTransactions as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    await act(async () => {
      await result.current.addTransaction({
        type: 'expense',
        amount: 50,
        category: 'Food',
      });
    });

    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].amount).toBe(50);
    expect(result.current.transactions[0].type).toBe('expense');
    expect(result.current.transactions[0].id).toBe('mock-uuid');
    expect(storage.saveTransactions).toHaveBeenCalled();
  });

  it('should add createdAt if not provided', async () => {
    (storage.loadTransactions as jest.Mock).mockResolvedValue(null);
    (storage.saveTransactions as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    const beforeTime = new Date().toISOString();

    await act(async () => {
      await result.current.addTransaction({
        type: 'income',
        amount: 1000,
      });
    });

    const afterTime = new Date().toISOString();

    expect(result.current.transactions[0].createdAt).toBeDefined();
    expect(result.current.transactions[0].createdAt >= beforeTime).toBe(true);
    expect(result.current.transactions[0].createdAt <= afterTime).toBe(true);
  });

  it('should handle hydration errors', async () => {
    (storage.loadTransactions as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.code).toBe('HYDRATION_ERROR');
    // Should fallback to empty array
    expect(result.current.transactions).toEqual([]);
  });

  it('should handle save errors', async () => {
    (storage.loadTransactions as jest.Mock).mockResolvedValue(null);
    (storage.saveTransactions as jest.Mock).mockRejectedValue(new Error('Save error'));

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    await act(async () => {
      try {
        await result.current.addTransaction({
          type: 'expense',
          amount: 50,
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.code).toBe('SAVE_ERROR');
    // State should still be updated in memory
    expect(result.current.transactions).toHaveLength(1);
  });

  it('should reset transactions', async () => {
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amount: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    (storage.loadTransactions as jest.Mock).mockResolvedValue(mockTransactions);
    (storage.saveTransactions as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    await act(async () => {
      await result.current.resetTransactions();
    });

    expect(result.current.transactions).toEqual([]);
    expect(storage.saveTransactions).toHaveBeenCalledWith([]);
  });

  it('should retry hydration', async () => {
    (storage.loadTransactions as jest.Mock)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce([
        {
          id: '1',
          type: 'expense',
          amount: 100,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]);

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.error).toBeTruthy();

    await act(async () => {
      await result.current.retryHydration();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(result.current.transactions).toHaveLength(1);
  });
});


