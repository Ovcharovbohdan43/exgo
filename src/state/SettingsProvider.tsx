import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { loadSettings, saveSettings } from '../services/storage';
import { UserSettings } from '../types';
import { logError, addBreadcrumb } from '../services/sentry';
import { changeLanguage, getCurrentLanguage } from '../i18n';

export type SettingsError = {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
};

type SettingsContextValue = {
  settings: UserSettings;
  hydrated: boolean;
  loading: boolean;
  error: SettingsError | null;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  setOnboarded: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
  retryHydration: () => Promise<void>;
};

const defaultSettings: UserSettings = {
  currency: 'USD',
  monthlyIncome: 0,
  isOnboarded: false,
  themePreference: 'system',
  language: 'en', // Default to English
  customCategories: [], // Will contain both expense and income custom categories
  enableBiometric: false,
  enablePIN: false,
  pin: undefined,
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SettingsError | null>(null);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const stored = await loadSettings();
      console.log('[SettingsProvider] Loaded settings from storage:', stored);
      if (stored) {
        // Merge with defaults to ensure all fields are present
        const mergedSettings: UserSettings = {
          ...defaultSettings,
          ...stored,
          // Ensure security fields have proper defaults
          enableBiometric: stored.enableBiometric ?? false,
          enablePIN: stored.enablePIN ?? false,
          pin: stored.pin,
          // Ensure language has proper default
          language: stored.language ?? 'en',
        };
        setSettings(mergedSettings);
        
        // Initialize i18n language
        if (mergedSettings.language) {
          changeLanguage(mergedSettings.language);
        }
        
        console.log('[SettingsProvider] Settings set to:', mergedSettings);
        addBreadcrumb('Settings loaded from storage', 'storage', 'info', {
          hasSettings: true,
          currency: mergedSettings.currency,
          enableBiometric: mergedSettings.enableBiometric,
          enablePIN: mergedSettings.enablePIN,
          language: mergedSettings.language,
        });
      } else {
        // Initialize with defaults if no stored data
        console.log('[SettingsProvider] No stored settings, using defaults');
        setSettings(defaultSettings);
        addBreadcrumb('Settings initialized with defaults', 'storage', 'info');
      }
      setHydrated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      
      setError({
        message: errorMessage,
        code: 'HYDRATION_ERROR',
        retry: hydrate,
      });
      // Fallback to defaults on error
      setSettings(defaultSettings);
      setHydrated(true); // Still mark as hydrated to allow app to continue
      console.error('[SettingsProvider] Hydration error:', err);
      
      // Log to Sentry
      logError(errorObj, {
        component: 'SettingsProvider',
        operation: 'hydrate',
        errorCode: 'HYDRATION_ERROR',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const persist = useCallback(
    async (next: UserSettings): Promise<void> => {
      setError(null);
      console.log('[SettingsProvider] Persisting settings:', next);
      
      // Update language if changed - compare with current i18n language, not settings state
      // This fixes the bug where language doesn't change back from Ukrainian to English
      const currentI18nLanguage = getCurrentLanguage();
      if (next.language && next.language !== currentI18nLanguage) {
        console.log('[SettingsProvider] Language changed from', currentI18nLanguage, 'to', next.language);
        changeLanguage(next.language);
      }
      
      // Optimistic update: update state immediately for better UX
      setSettings(next);
      console.log('[SettingsProvider] Settings updated optimistically');
      try {
        await saveSettings(next);
        console.log('[SettingsProvider] Settings saved to storage successfully');
        addBreadcrumb('Settings saved to storage', 'storage', 'info', {
          currency: next.currency,
          language: next.language,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
        const errorObj = err instanceof Error ? err : new Error(errorMessage);
        
        setError({
          message: errorMessage,
          code: 'SAVE_ERROR',
          retry: async () => {
            await persist(next);
          },
        });
        // State is already updated optimistically, so UI stays consistent
        console.error('[SettingsProvider] Save error:', err);
        
        // Log to Sentry
        logError(errorObj, {
          component: 'SettingsProvider',
          operation: 'persist',
          errorCode: 'SAVE_ERROR',
          settings: {
            currency: next.currency,
            monthlyIncome: next.monthlyIncome,
            isOnboarded: next.isOnboarded,
          },
        });
        
        throw err; // Re-throw to allow caller to handle
      }
    },
    [],
  );

  const updateSettings = useCallback(
    async (partial: Partial<UserSettings>): Promise<void> => {
      const next = { ...settings, ...partial };
      await persist(next);
    },
    [settings, persist],
  );

  const setOnboarded = useCallback(async () => {
    await updateSettings({ isOnboarded: true });
  }, [updateSettings]);

  const resetToDefaults = useCallback(async () => {
    await persist(defaultSettings);
  }, [persist]);

  const retryHydration = useCallback(async () => {
    await hydrate();
  }, [hydrate]);

  const value = useMemo(
    () => ({
      settings,
      hydrated,
      loading,
      error,
      updateSettings,
      setOnboarded,
      resetToDefaults,
      retryHydration,
    }),
    [settings, hydrated, loading, error, updateSettings, setOnboarded, resetToDefaults, retryHydration],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
