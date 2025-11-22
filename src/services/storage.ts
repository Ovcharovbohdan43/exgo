import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, UserSettings } from '../types';

const SETTINGS_KEY = 'settings';
const TRANSACTIONS_KEY = 'transactions';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/**
 * Retry wrapper for async operations
 */
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  delay = RETRY_DELAY_MS,
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
};

/**
 * Safely parse JSON with fallback to null
 */
const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('[Storage] Failed to parse JSON:', error);
    return null;
  }
};

/**
 * Validate UserSettings structure
 */
const validateSettings = (data: unknown): data is UserSettings => {
  if (!data || typeof data !== 'object') return false;
  const settings = data as Partial<UserSettings>;
  return (
    typeof settings.currency === 'string' &&
    typeof settings.monthlyIncome === 'number' &&
    typeof settings.isOnboarded === 'boolean'
  );
};

/**
 * Validate Transaction array
 */
const validateTransactions = (data: unknown): data is Transaction[] => {
  if (!Array.isArray(data)) return false;
  return data.every((tx) => {
    return (
      typeof tx === 'object' &&
      tx !== null &&
      typeof (tx as Transaction).id === 'string' &&
      typeof (tx as Transaction).amount === 'number' &&
      ['expense', 'income', 'saved'].includes((tx as Transaction).type) &&
      typeof (tx as Transaction).createdAt === 'string'
    );
  });
};

/**
 * Load settings from AsyncStorage with retry and validation
 */
export const loadSettings = async (): Promise<UserSettings | null> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(SETTINGS_KEY));
    const parsed = safeParse<UserSettings>(raw);
    
    if (parsed && validateSettings(parsed)) {
      return parsed;
    }
    
    if (parsed) {
      console.warn('[Storage] Invalid settings structure, using defaults');
    }
    
    return null;
  } catch (error) {
    console.error('[Storage] Failed to load settings:', error);
    throw error;
  }
};

/**
 * Save settings to AsyncStorage with retry
 */
export const saveSettings = async (settings: UserSettings): Promise<void> => {
  try {
    if (!validateSettings(settings)) {
      throw new Error('Invalid settings structure');
    }
    await withRetry(() => AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)));
  } catch (error) {
    console.error('[Storage] Failed to save settings:', error);
    throw error;
  }
};

/**
 * Load transactions from AsyncStorage with retry and validation
 */
export const loadTransactions = async (): Promise<Transaction[] | null> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(TRANSACTIONS_KEY));
    const parsed = safeParse<Transaction[]>(raw);
    
    if (parsed && validateTransactions(parsed)) {
      return parsed;
    }
    
    if (parsed) {
      console.warn('[Storage] Invalid transactions structure, using defaults');
    }
    
    return null;
  } catch (error) {
    console.error('[Storage] Failed to load transactions:', error);
    throw error;
  }
};

/**
 * Save transactions to AsyncStorage with retry
 */
export const saveTransactions = async (transactions: Transaction[]): Promise<void> => {
  try {
    if (!validateTransactions(transactions)) {
      throw new Error('Invalid transactions structure');
    }
    await withRetry(() =>
      AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions)),
    );
  } catch (error) {
    console.error('[Storage] Failed to save transactions:', error);
    throw error;
  }
};

/**
 * Reset all storage (clear both keys)
 */
export const resetStorage = async (): Promise<void> => {
  try {
    await withRetry(() => AsyncStorage.multiRemove([SETTINGS_KEY, TRANSACTIONS_KEY]));
  } catch (error) {
    console.error('[Storage] Failed to reset storage:', error);
    throw error;
  }
};
