import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import RootNavigator from './navigation/RootNavigator';
import { AppProvider } from './state/AppProvider';
import { ThemeProvider, useThemeStyles } from './theme/ThemeProvider';
import { SettingsProvider, useSettings } from './state/SettingsProvider';
import { useTransactions } from './state/TransactionsProvider';
import { ThemePreference } from './types';

const Loader = () => {
  const theme = useThemeStyles();
  return (
    <View style={[styles.loader, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  );
};

const ErrorScreen = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => {
  const theme = useThemeStyles();
  return (
    <View
      style={[
        styles.errorContainer,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Text
        style={[
          styles.errorTitle,
          { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.lg },
        ]}
      >
        Failed to load data
      </Text>
      <Text
        style={[
          styles.errorMessage,
          {
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.md,
            marginVertical: theme.spacing.md,
          },
        ]}
      >
        {message}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={[
          styles.retryButton,
          {
            backgroundColor: theme.colors.accent,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <Text
          style={[
            styles.retryButtonText,
            {
              color: theme.colors.background,
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.semibold,
            },
          ]}
        >
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const AppContent = () => {
  const { settings, hydrated: settingsReady, loading: settingsLoading, error: settingsError, retryHydration: retrySettings } = useSettings();
  const { hydrated: transactionsReady, loading: transactionsLoading, error: transactionsError, retryHydration: retryTransactions } = useTransactions();
  
  const ready = settingsReady && transactionsReady;
  const loading = settingsLoading || transactionsLoading;
  const error = settingsError || transactionsError;

  const handleRetry = async () => {
    if (settingsError) await retrySettings();
    if (transactionsError) await retryTransactions();
  };

  if (loading && !ready) {
    return <Loader />;
  }

  if (error && ready) {
    // Show error but allow app to continue with defaults
    console.warn('[AppContent] Error state:', error);
  }

  if (!ready) {
    return <Loader />;
  }

  if (error && !ready) {
    return <ErrorScreen message={error.message} onRetry={handleRetry} />;
  }

  return (
    <NavigationContainer>
      <RootNavigator isOnboarded={settings.isOnboarded} />
    </NavigationContainer>
  );
};

const ThemeWrapper = () => {
  const { settings, updateSettings, hydrated } = useSettings();
  
  const handleThemePreferenceChange = async (preference: ThemePreference) => {
    if (hydrated) {
      await updateSettings({ themePreference: preference });
    }
  };

  return (
    <ThemeProvider
      themePreference={settings.themePreference || 'system'}
      onThemePreferenceChange={handleThemePreferenceChange}
    >
      <StatusBar style="auto" />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
};

const AppRoot = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeWrapper />
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
  },
  retryButtonText: {
    textAlign: 'center',
  },
});

export default AppRoot;
