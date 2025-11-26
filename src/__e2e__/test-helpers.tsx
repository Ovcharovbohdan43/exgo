/**
 * Test helpers for E2E tests
 * Provides common wrappers and utilities for testing
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeProvider';
import { SettingsProvider } from '../state/SettingsProvider';
import { AppProvider } from '../state/AppProvider';

/**
 * Wrapper component with all required providers for E2E tests
 */
const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <AppProvider>
            <NavigationContainer>{children}</NavigationContainer>
          </AppProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

/**
 * Custom render function with all providers
 * Use this instead of the default render from @testing-library/react-native
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

/**
 * Mock safe area insets for testing
 */
export const mockSafeAreaInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

