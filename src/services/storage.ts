import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, UserSettings } from '../types';

const SETTINGS_KEY = 'settings';
const TRANSACTIONS_KEY = 'transactions';

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const loadSettings = async (): Promise<UserSettings | null> => {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return safeParse<UserSettings>(raw);
};

export const saveSettings = async (settings: UserSettings): Promise<void> => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadTransactions = async (): Promise<Transaction[] | null> => {
  const raw = await AsyncStorage.getItem(TRANSACTIONS_KEY);
  return safeParse<Transaction[]>(raw);
};

export const saveTransactions = async (transactions: Transaction[]): Promise<void> => {
  await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
};

export const resetStorage = async (): Promise<void> => {
  await AsyncStorage.multiRemove([SETTINGS_KEY, TRANSACTIONS_KEY]);
};
