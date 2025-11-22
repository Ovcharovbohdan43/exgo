import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSettings,
  saveSettings,
  loadTransactions,
  saveTransactions,
  resetStorage,
} from '../storage';
import { UserSettings, Transaction } from '../../types';

// Declare global for TypeScript
declare const global: any;

describe('Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadSettings', () => {
    it('should load valid settings', async () => {
      const mockSettings: UserSettings = {
        currency: 'USD',
        monthlyIncome: 1000,
        isOnboarded: true,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const result = await loadSettings();

      expect(result).toEqual(mockSettings);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('settings');
    });

    it('should return null for missing data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await loadSettings();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await loadSettings();

      expect(result).toBeNull();
    });

    it('should return null for invalid structure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ invalid: 'data' }),
      );

      const result = await loadSettings();

      expect(result).toBeNull();
    });

    it('should retry on failure', async () => {
      // Mock setTimeout to execute immediately
      const originalSetTimeout = (global as any).setTimeout;
      (global as any).setTimeout = jest.fn((fn: () => void) => {
        fn();
        return 1 as any;
      }) as any;

      const mockSettings = { currency: 'USD', monthlyIncome: 1000, isOnboarded: false };
      
      (AsyncStorage.getItem as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(JSON.stringify(mockSettings));

      const result = await loadSettings();

      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockSettings);

      // Restore original setTimeout
      (global as any).setTimeout = originalSetTimeout;
    });
  });

  describe('saveSettings', () => {
    it('should save valid settings', async () => {
      const settings: UserSettings = {
        currency: 'EUR',
        monthlyIncome: 2000,
        isOnboarded: true,
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveSettings(settings);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'settings',
        JSON.stringify(settings),
      );
    });

    it('should throw on invalid settings', async () => {
      const invalidSettings = { invalid: 'data' } as unknown as UserSettings;

      await expect(saveSettings(invalidSettings)).rejects.toThrow();
    });

    it('should retry on failure', async () => {
      // Mock setTimeout to execute immediately
      const originalSetTimeout = (global as any).setTimeout;
      (global as any).setTimeout = jest.fn((fn: () => void) => {
        fn();
        return 1 as any;
      }) as any;

      const settings: UserSettings = {
        currency: 'USD',
        monthlyIncome: 1000,
        isOnboarded: false,
      };

      (AsyncStorage.setItem as jest.Mock)
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce(undefined);

      await saveSettings(settings);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);

      // Restore original setTimeout
      (global as any).setTimeout = originalSetTimeout;
    });
  });

  describe('loadTransactions', () => {
    it('should load valid transactions', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          type: 'expense',
          amount: 100,
          category: 'Food',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockTransactions));

      const result = await loadTransactions();

      expect(result).toEqual(mockTransactions);
    });

    it('should return null for invalid structure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([{ invalid: 'transaction' }]),
      );

      const result = await loadTransactions();

      expect(result).toBeNull();
    });
  });

  describe('saveTransactions', () => {
    it('should save valid transactions', async () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          type: 'income',
          amount: 1000,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await saveTransactions(transactions);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'transactions',
        JSON.stringify(transactions),
      );
    });

    it('should throw on invalid transactions', async () => {
      const invalidTransactions = [{ invalid: 'data' }] as unknown as Transaction[];

      await expect(saveTransactions(invalidTransactions)).rejects.toThrow();
    });
  });

  describe('resetStorage', () => {
    it('should clear all storage keys', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);

      await resetStorage();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['settings', 'transactions']);
    });
  });
});

