/**
 * Development utility to reset app state
 * This clears AsyncStorage and forces app to show onboarding again
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'settings';
const TRANSACTIONS_KEY = 'transactions';

/**
 * Clears all app data from AsyncStorage
 * Use this to reset the app to initial state (show onboarding)
 */
export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([SETTINGS_KEY, TRANSACTIONS_KEY]);
    console.log('✅ All app data cleared. Restart the app to see onboarding.');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Failed to clear data:', error);
    return Promise.reject(error);
  }
};

/**
 * Clears only settings (useful for testing onboarding)
 */
export const clearSettings = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
    console.log('✅ Settings cleared. Restart the app to see onboarding.');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Failed to clear settings:', error);
    return Promise.reject(error);
  }
};

