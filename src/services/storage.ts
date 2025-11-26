import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, UserSettings, Notification, MiniBudget, MiniBudgetMonthlyState, CreditProduct, Goal } from '../types';

const SETTINGS_KEY = 'settings';
const TRANSACTIONS_KEY = 'transactions';
const CURRENT_MONTH_KEY = 'currentMonth'; // Store current selected month
const NOTIFICATIONS_KEY = 'notifications';
const MINI_BUDGETS_KEY = 'miniBudgets';
const MINI_BUDGETS_STATE_KEY = 'miniBudgetMonthlyState';
const CREDIT_PRODUCTS_KEY = 'creditProducts';
const GOALS_KEY = 'goals';

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
    if (typeof tx !== 'object' || tx === null) return false;
    
    const transaction = tx as Transaction;
    
    // Required fields
    if (typeof transaction.id !== 'string') return false;
    if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) return false;
    if (typeof transaction.type !== 'string') return false;
    if (!['expense', 'income', 'saved', 'credit'].includes(transaction.type)) return false;
    if (typeof transaction.createdAt !== 'string') return false;
    
    // Optional fields - allow undefined, null, or string
    if (transaction.category !== undefined && transaction.category !== null && typeof transaction.category !== 'string') return false;
    if (transaction.creditProductId !== undefined && transaction.creditProductId !== null && typeof transaction.creditProductId !== 'string') return false;
    if (transaction.paidByCreditProductId !== undefined && transaction.paidByCreditProductId !== null && typeof transaction.paidByCreditProductId !== 'string') return false;
    if (transaction.goalId !== undefined && transaction.goalId !== null && typeof transaction.goalId !== 'string') return false;
    
    return true;
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
 * Validate MiniBudget array
 */
const validateMiniBudgets = (data: unknown): data is MiniBudget[] => {
  if (!Array.isArray(data)) return false;
  return data.every((budget) => {
    return (
      typeof budget === 'object' &&
      budget !== null &&
      typeof (budget as MiniBudget).id === 'string' &&
      typeof (budget as MiniBudget).name === 'string' &&
      typeof (budget as MiniBudget).month === 'string' &&
      typeof (budget as MiniBudget).currency === 'string' &&
      typeof (budget as MiniBudget).limitAmount === 'number' &&
      Array.isArray((budget as MiniBudget).linkedCategoryIds) &&
      typeof (budget as MiniBudget).status === 'string' &&
      typeof (budget as MiniBudget).createdAt === 'string' &&
      typeof (budget as MiniBudget).updatedAt === 'string'
    );
  });
};

/**
 * Validate MiniBudgetMonthlyState record
 */
const validateMiniBudgetStates = (data: unknown): data is Record<string, MiniBudgetMonthlyState> => {
  if (!data || typeof data !== 'object') return false;
  const states = data as Record<string, unknown>;
  return Object.values(states).every((state) => {
    return (
      typeof state === 'object' &&
      state !== null &&
      typeof (state as MiniBudgetMonthlyState).budgetId === 'string' &&
      typeof (state as MiniBudgetMonthlyState).month === 'string' &&
      typeof (state as MiniBudgetMonthlyState).spentAmount === 'number' &&
      typeof (state as MiniBudgetMonthlyState).remaining === 'number' &&
      typeof (state as MiniBudgetMonthlyState).pace === 'number' &&
      typeof (state as MiniBudgetMonthlyState).forecast === 'number' &&
      typeof (state as MiniBudgetMonthlyState).state === 'string' &&
      typeof (state as MiniBudgetMonthlyState).daysElapsed === 'number' &&
      typeof (state as MiniBudgetMonthlyState).daysInMonth === 'number'
    );
  });
};

/**
 * Load mini budgets from AsyncStorage
 */
export const loadMiniBudgets = async (): Promise<MiniBudget[]> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(MINI_BUDGETS_KEY));
    const parsed = safeParse<MiniBudget[]>(raw);
    
    if (parsed && validateMiniBudgets(parsed)) {
      return parsed;
    }
    
    return [];
  } catch (error) {
    console.error('[Storage] Failed to load mini budgets:', error);
    return [];
  }
};

/**
 * Save mini budgets to AsyncStorage
 */
export const saveMiniBudgets = async (budgets: MiniBudget[]): Promise<void> => {
  try {
    if (!validateMiniBudgets(budgets)) {
      throw new Error('Invalid mini budgets structure');
    }
    await withRetry(() =>
      AsyncStorage.setItem(MINI_BUDGETS_KEY, JSON.stringify(budgets)),
    );
  } catch (error) {
    console.error('[Storage] Failed to save mini budgets:', error);
    throw error;
  }
};

/**
 * Load mini budget monthly states from AsyncStorage
 */
export const loadMiniBudgetStates = async (): Promise<Record<string, MiniBudgetMonthlyState>> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(MINI_BUDGETS_STATE_KEY));
    const parsed = safeParse<Record<string, MiniBudgetMonthlyState>>(raw);
    
    if (parsed && validateMiniBudgetStates(parsed)) {
      return parsed;
    }
    
    return {};
  } catch (error) {
    console.error('[Storage] Failed to load mini budget states:', error);
    return {};
  }
};

/**
 * Save mini budget monthly states to AsyncStorage
 */
export const saveMiniBudgetStates = async (states: Record<string, MiniBudgetMonthlyState>): Promise<void> => {
  try {
    if (!validateMiniBudgetStates(states)) {
      throw new Error('Invalid mini budget states structure');
    }
    await withRetry(() =>
      AsyncStorage.setItem(MINI_BUDGETS_STATE_KEY, JSON.stringify(states)),
    );
  } catch (error) {
    console.error('[Storage] Failed to save mini budget states:', error);
    throw error;
  }
};

/**
 * Validate CreditProduct array
 */
const validateCreditProducts = (data: unknown): data is CreditProduct[] => {
  if (!Array.isArray(data)) return false;
  return data.every((product) => {
    if (typeof product !== 'object' || product === null) return false;
    
    const p = product as CreditProduct;
    
    // Required fields
    if (typeof p.id !== 'string') return false;
    if (typeof p.name !== 'string') return false;
    if (typeof p.principal !== 'number' || isNaN(p.principal)) return false;
    if (typeof p.remainingBalance !== 'number' || isNaN(p.remainingBalance)) return false;
    if (typeof p.apr !== 'number' || isNaN(p.apr)) return false;
    if (typeof p.dailyInterestRate !== 'number' || isNaN(p.dailyInterestRate)) return false;
    if (typeof p.creditType !== 'string') return false;
    if (typeof p.accruedInterest !== 'number' || isNaN(p.accruedInterest)) return false;
    if (typeof p.totalPaid !== 'number' || isNaN(p.totalPaid)) return false;
    if (typeof p.status !== 'string') return false;
    if (typeof p.startDate !== 'string') return false;
    if (typeof p.createdAt !== 'string') return false;
    if (typeof p.updatedAt !== 'string') return false;
    
    // lastInterestCalculationDate is required but may be missing in old data
    // We'll migrate it in loadCreditProducts if missing
    
    return true;
  });
};

/**
 * Load credit products from AsyncStorage
 * Migrates old data to include lastInterestCalculationDate if missing
 */
export const loadCreditProducts = async (): Promise<CreditProduct[]> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(CREDIT_PRODUCTS_KEY));
    const parsed = safeParse<CreditProduct[]>(raw);
    
    if (parsed && validateCreditProducts(parsed)) {
      // Migrate old data: add lastInterestCalculationDate if missing
      const migrated = parsed.map((product) => {
        if (!product.lastInterestCalculationDate) {
          // Use updatedAt or startDate as fallback
          return {
            ...product,
            lastInterestCalculationDate: product.updatedAt || product.startDate,
          };
        }
        return product;
      });
      
      return migrated;
    }
    
    return [];
  } catch (error) {
    console.error('[Storage] Failed to load credit products:', error);
    return [];
  }
};

/**
 * Save credit products to AsyncStorage
 */
export const saveCreditProducts = async (products: CreditProduct[]): Promise<void> => {
  try {
    if (!validateCreditProducts(products)) {
      throw new Error('Invalid credit products structure');
    }
    await withRetry(() =>
      AsyncStorage.setItem(CREDIT_PRODUCTS_KEY, JSON.stringify(products)),
    );
  } catch (error) {
    console.error('[Storage] Failed to save credit products:', error);
    throw error;
  }
};

/**
 * Validate Goal array
 */
const validateGoals = (data: unknown): data is Goal[] => {
  if (!Array.isArray(data)) return false;
  return data.every((goal) => {
    if (typeof goal !== 'object' || goal === null) return false;
    
    const g = goal as Goal;
    
    // Required fields
    if (typeof g.id !== 'string') return false;
    if (typeof g.name !== 'string') return false;
    if (typeof g.targetAmount !== 'number' || isNaN(g.targetAmount)) return false;
    if (typeof g.currentAmount !== 'number' || isNaN(g.currentAmount)) return false;
    if (typeof g.currency !== 'string') return false;
    if (typeof g.status !== 'string') return false;
    if (!['active', 'completed', 'archived'].includes(g.status)) return false;
    if (typeof g.createdAt !== 'string') return false;
    if (typeof g.updatedAt !== 'string') return false;
    
    // Optional fields
    if (g.emoji !== undefined && g.emoji !== null && typeof g.emoji !== 'string') return false;
    if (g.completedAt !== undefined && g.completedAt !== null && typeof g.completedAt !== 'string') return false;
    if (g.note !== undefined && g.note !== null && typeof g.note !== 'string') return false;
    
    return true;
  });
};

/**
 * Load goals from AsyncStorage
 */
export const loadGoals = async (): Promise<Goal[]> => {
  try {
    const raw = await withRetry(() => AsyncStorage.getItem(GOALS_KEY));
    const parsed = safeParse<Goal[]>(raw);
    
    if (parsed && validateGoals(parsed)) {
      return parsed;
    }
    
    return [];
  } catch (error) {
    console.error('[Storage] Failed to load goals:', error);
    return [];
  }
};

/**
 * Save goals to AsyncStorage
 */
export const saveGoals = async (goals: Goal[]): Promise<void> => {
  try {
    if (!validateGoals(goals)) {
      throw new Error('Invalid goals structure');
    }
    await withRetry(() =>
      AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals)),
    );
  } catch (error) {
    console.error('[Storage] Failed to save goals:', error);
    throw error;
  }
};

/**
 * Reset all storage (clear all keys)
 */
export const resetStorage = async (): Promise<void> => {
  try {
    await withRetry(() =>
      AsyncStorage.multiRemove([
        SETTINGS_KEY,
        TRANSACTIONS_KEY,
        NOTIFICATIONS_KEY,
        CURRENT_MONTH_KEY,
        MINI_BUDGETS_KEY,
        MINI_BUDGETS_STATE_KEY,
        CREDIT_PRODUCTS_KEY,
        GOALS_KEY,
      ]),
    );
  } catch (error) {
    console.error('[Storage] Failed to reset storage:', error);
    throw error;
  }
};
