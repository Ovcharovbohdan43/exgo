import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { loadSettings, saveSettings } from '../services/storage';
import { UserSettings } from '../types';

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
        setSettings(stored);
        console.log('[SettingsProvider] Settings set to:', stored);
      } else {
        // Initialize with defaults if no stored data
        console.log('[SettingsProvider] No stored settings, using defaults');
        setSettings(defaultSettings);
      }
      setHydrated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError({
        message: errorMessage,
        code: 'HYDRATION_ERROR',
        retry: hydrate,
      });
      // Fallback to defaults on error
      setSettings(defaultSettings);
      setHydrated(true); // Still mark as hydrated to allow app to continue
      console.error('[SettingsProvider] Hydration error:', err);
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
      // Optimistic update: update state immediately for better UX
      setSettings(next);
      console.log('[SettingsProvider] Settings updated optimistically');
      try {
        await saveSettings(next);
        console.log('[SettingsProvider] Settings saved to storage successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
        setError({
          message: errorMessage,
          code: 'SAVE_ERROR',
          retry: async () => {
            await persist(next);
          },
        });
        // State is already updated optimistically, so UI stays consistent
        console.error('[SettingsProvider] Save error:', err);
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
