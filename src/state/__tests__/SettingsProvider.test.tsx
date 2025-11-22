import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from '../SettingsProvider';
import * as storage from '../../services/storage';
import { UserSettings } from '../../types';

// Mock storage
jest.mock('../../services/storage');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

describe('SettingsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide default settings initially', () => {
    (storage.loadSettings as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.settings).toEqual({
      currency: 'USD',
      monthlyIncome: 0,
      isOnboarded: false,
    });
  });

  it('should load settings from storage', async () => {
    const mockSettings: UserSettings = {
      currency: 'EUR',
      monthlyIncome: 2000,
      isOnboarded: true,
    };

    (storage.loadSettings as jest.Mock).mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.settings).toEqual(mockSettings);
  });

  it('should update settings', async () => {
    (storage.loadSettings as jest.Mock).mockResolvedValue(null);
    (storage.saveSettings as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    await act(async () => {
      await result.current.updateSettings({ currency: 'GBP' });
    });

    expect(result.current.settings.currency).toBe('GBP');
    expect(storage.saveSettings).toHaveBeenCalled();
  });

  it('should handle hydration errors', async () => {
    (storage.loadSettings as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.code).toBe('HYDRATION_ERROR');
    // Should fallback to defaults
    expect(result.current.settings).toEqual({
      currency: 'USD',
      monthlyIncome: 0,
      isOnboarded: false,
    });
  });

  it('should handle save errors', async () => {
    (storage.loadSettings as jest.Mock).mockResolvedValue(null);
    (storage.saveSettings as jest.Mock).mockRejectedValue(new Error('Save error'));

    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    await act(async () => {
      try {
        await result.current.updateSettings({ currency: 'GBP' });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.code).toBe('SAVE_ERROR');
    // State should still be updated in memory
    expect(result.current.settings.currency).toBe('GBP');
  });

  it('should retry hydration', async () => {
    (storage.loadSettings as jest.Mock)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce({
        currency: 'EUR',
        monthlyIncome: 1000,
        isOnboarded: false,
      });

    const { result } = renderHook(() => useSettings(), { wrapper });

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

    expect(result.current.settings.currency).toBe('EUR');
  });

  it('should reset to defaults', async () => {
    const mockSettings: UserSettings = {
      currency: 'EUR',
      monthlyIncome: 2000,
      isOnboarded: true,
    };

    (storage.loadSettings as jest.Mock).mockResolvedValue(mockSettings);
    (storage.saveSettings as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.hydrated).toBe(true);
    });

    await act(async () => {
      await result.current.resetToDefaults();
    });

    expect(result.current.settings).toEqual({
      currency: 'USD',
      monthlyIncome: 0,
      isOnboarded: false,
    });
  });
});

