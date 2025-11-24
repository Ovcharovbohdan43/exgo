import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, UserSettings, Notification } from '../types';

const SETTINGS_KEY = 'settings';
const TRANSACTIONS_KEY = 'transactions';
const CURRENT_MONTH_KEY = 'currentMonth'; // Store current selected month
const NOTIFICATIONS_KEY = 'notifications';

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
    typeof settings.isOnboarded === 'boolean' &&
    (settings.firstMonthKey === undefined || typeof settings.firstMonthKey === 'string') &&
    (settings.language === undefined || (settings.language === 'en' || settings.language === 'uk')) &&
    (settings.enableBiometric === undefined || typeof settings.enableBiometric === 'boolean') &&
    (settings.enablePIN === undefined || typeof settings.enablePIN === 'boolean') &&
    (settings.pin === undefined || typeof settings.pin === 'string')
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
 * @deprecated Use loadTransactions() which returns Record<string, Transaction[]>
 * This function is kept for backward compatibility during migration
 */
export const loadTransactionsLegacy = async (): Promise<Transaction[] | null> => {
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
 * Now supports monthly structure: Record<string, Transaction[]>
 */
export const saveTransactions = async (
  transactionsByMonth: Record<string, Transaction[]>,
): Promise<void> => {
  try {
    // Validate all transactions in all months
    for (const [monthKey, transactions] of Object.entries(transactionsByMonth)) {
      if (!validateTransactions(transactions)) {
        throw new Error(`Invalid transactions structure for month ${monthKey}`);
      }
    }
    await withRetry(() =>
      AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactionsByMonth)),
    );
  } catch (error) {
    console.error('[Storage] Failed to save transactions:', error);
    throw error;
  }
};

/**
 * Load transactions from AsyncStorage with retry
 * Returns monthly structure: Record<string, Transaction[]>
 */
export const loadTransactions = async (): Promise<Record<string, Transaction[]> | null> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(TRANSACTIONS_KEY));
    
    if (!raw) return null;
    
    const parsed = safeParse<Record<string, Transaction[]>>(raw);
    
    if (!parsed || typeof parsed !== 'object') {
      // Try to parse as old format (array) and migrate
      const oldFormat = safeParse<Transaction[]>(raw);
      if (oldFormat && validateTransactions(oldFormat)) {
        // Migrate old format to new format
        const { getMonthKey } = require('../utils/month');
        const migrated: Record<string, Transaction[]> = {};
        for (const tx of oldFormat) {
          const monthKey = getMonthKey(new Date(tx.createdAt));
          if (!migrated[monthKey]) {
            migrated[monthKey] = [];
          }
          migrated[monthKey].push(tx);
        }
        // Save migrated data
        await saveTransactions(migrated);
        return migrated;
      }
      return null;
    }
    
    // Validate all months
    for (const [monthKey, transactions] of Object.entries(parsed)) {
      if (!validateTransactions(transactions)) {
        console.warn(`[Storage] Invalid transactions for month ${monthKey}, skipping`);
        delete parsed[monthKey];
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('[Storage] Failed to load transactions:', error);
    throw error;
  }
};

/**
 * Load current selected month from storage
 */
export const loadCurrentMonth = async (): Promise<string | null> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(CURRENT_MONTH_KEY));
    return raw || null;
  } catch (error) {
    console.error('[Storage] Failed to load current month:', error);
    return null;
  }
};

/**
 * Save current selected month to storage
 */
export const saveCurrentMonth = async (monthKey: string): Promise<void> => {
  try {
    await withRetry(() => AsyncStorage.setItem(CURRENT_MONTH_KEY, monthKey));
  } catch (error) {
    console.error('[Storage] Failed to save current month:', error);
    throw error;
  }
};

/**
 * Validate Notification array
 */
const validateNotifications = (data: unknown): data is Notification[] => {
  if (!Array.isArray(data)) return false;
  return data.every((notif) => {
    return (
      typeof notif === 'object' &&
      notif !== null &&
      typeof (notif as Notification).id === 'string' &&
      typeof (notif as Notification).type === 'string' &&
      typeof (notif as Notification).title === 'string' &&
      typeof (notif as Notification).message === 'string' &&
      typeof (notif as Notification).createdAt === 'string' &&
      typeof (notif as Notification).read === 'boolean'
    );
  });
};

/**
 * Load notifications from AsyncStorage
 */
export const loadNotifications = async (): Promise<Notification[]> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(NOTIFICATIONS_KEY));
    const parsed = safeParse<Notification[]>(raw);
    
    if (parsed && validateNotifications(parsed)) {
      return parsed;
    }
    
    return [];
  } catch (error) {
    console.error('[Storage] Failed to load notifications:', error);
    return [];
  }
};

/**
 * Save notifications to AsyncStorage
 */
export const saveNotifications = async (notifications: Notification[]): Promise<void> => {
  try {
    if (!validateNotifications(notifications)) {
      throw new Error('Invalid notifications structure');
    }
    await withRetry(() =>
      AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications)),
    );
  } catch (error) {
    console.error('[Storage] Failed to save notifications:', error);
    throw error;
  }
};

/**
 * Reset all storage (clear all keys)
 */
export const resetStorage = async (): Promise<void> => {
  try {
    await withRetry(() =>
      AsyncStorage.multiRemove([SETTINGS_KEY, TRANSACTIONS_KEY, NOTIFICATIONS_KEY, CURRENT_MONTH_KEY]),
    );
  } catch (error) {
    console.error('[Storage] Failed to reset storage:', error);
    throw error;
  }
};
