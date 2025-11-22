import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadSettings, saveSettings } from '../services/storage';
import { UserSettings } from '../types';

type SettingsContextValue = {
  settings: UserSettings;
  hydrated: boolean;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  setOnboarded: () => Promise<void>;
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

  useEffect(() => {
    (async () => {
      const stored = await loadSettings();
      if (stored) setSettings(stored);
      setHydrated(true);
    })();
  }, []);

  const persist = async (next: UserSettings) => {
    setSettings(next);
    try {
      await saveSettings(next);
    } catch {
      // swallow for now; surface later via UI toast/logging
    }
  };

  const updateSettings = async (partial: Partial<UserSettings>) => {
    const next = { ...settings, ...partial };
    await persist(next);
  };

  const setOnboarded = async () => {
    await updateSettings({ isOnboarded: true });
  };

  const value = useMemo(
    () => ({
      settings,
      hydrated,
      updateSettings,
      setOnboarded,
    }),
    [settings, hydrated],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
