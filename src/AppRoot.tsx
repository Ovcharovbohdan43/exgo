import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import RootNavigator from './navigation/RootNavigator';
import { AppProvider } from './state/AppProvider';
import { ThemeProvider, useThemeStyles } from './theme/ThemeProvider';
import { SettingsProvider, useSettings } from './state/SettingsProvider';
import { useTransactions } from './state/TransactionsProvider';
import { ThemePreference } from './types';
import { logError, SentryErrorBoundary, addBreadcrumb } from './services/sentry';
import { LockScreen } from './screens/LockScreen';
import { isAuthenticationRequired } from './services/authentication';

// Temporary kill-switch to bypass Face ID/biometric lock during development.
// Set back to false before production/TestFlight so biometric lock works.
const TEMP_DISABLE_BIOMETRIC_LOCK = true;

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
  
  // Lock screen state
  const [isLocked, setIsLocked] = React.useState(false);
  const appState = React.useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = React.useState(appState.current);
  const hasLockedInitially = React.useRef(false); // Track if we've already locked on initial mount
  const wasInBackground = React.useRef(false); // Track if app was in background

  // Check if authentication is required
  const authRequired = React.useMemo(() => {
    if (!ready) return false;
    const enableBiometric = !TEMP_DISABLE_BIOMETRIC_LOCK && settings.enableBiometric === true;
    const enablePIN = settings.enablePIN === true;
    const hasPIN = !!settings.pin;
    
    console.log('[AppRoot] Checking auth requirement:', {
      enableBiometric,
      enablePIN,
      hasPIN,
      settings: {
        enableBiometric: settings.enableBiometric,
        enablePIN: settings.enablePIN,
        pin: settings.pin ? '***' : undefined,
      },
      tempBiometricDisabled: TEMP_DISABLE_BIOMETRIC_LOCK,
    });
    
    return isAuthenticationRequired(enableBiometric, enablePIN, hasPIN);
  }, [ready, settings.enableBiometric, settings.enablePIN, settings.pin]);

  // Lock app when it goes to background (if auth is enabled)
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      
      // Track when app goes to background
      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        wasInBackground.current = true;
        console.log('[AppRoot] App went to background');
      }
      
      // Lock when app returns from background (if auth is enabled)
      if (
        previousState.match(/inactive|background/) &&
        nextAppState === 'active' &&
        authRequired &&
        wasInBackground.current
      ) {
        console.log('[AppRoot] App returned from background, locking');
        setIsLocked(true);
        wasInBackground.current = false;
        addBreadcrumb('App returned to foreground, locking', 'security', 'info');
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, [authRequired]);

  // Lock on initial mount if auth is required (only once)
  React.useEffect(() => {
    if (ready && authRequired && !hasLockedInitially.current) {
      console.log('[AppRoot] Initial lock triggered', { ready, authRequired });
      setIsLocked(true);
      hasLockedInitially.current = true;
      addBreadcrumb('App started, authentication required', 'security', 'info');
    }
  }, [ready, authRequired]);
  
  // Reset initial lock flag if auth is disabled (to allow re-locking if re-enabled)
  React.useEffect(() => {
    if (!authRequired && hasLockedInitially.current) {
      console.log('[AppRoot] Auth disabled, resetting lock state');
      hasLockedInitially.current = false;
      setIsLocked(false);
    }
  }, [authRequired]);

  const handleUnlock = React.useCallback(() => {
    console.log('[AppRoot] Unlocking app...', {
      enableBiometric: settings.enableBiometric,
      enablePIN: settings.enablePIN,
      hasPIN: !!settings.pin,
    });
    setIsLocked(false);
    // Reset background flag to prevent immediate re-lock
    wasInBackground.current = false;
    addBreadcrumb('App unlocked successfully', 'security', 'info');
  }, [settings.enableBiometric, settings.enablePIN, settings.pin]);

  const handleRetry = async () => {
    addBreadcrumb('User retried data loading', 'user-action', 'info');
    if (settingsError) await retrySettings();
    if (transactionsError) await retryTransactions();
  };

  // Log errors to Sentry
  React.useEffect(() => {
    if (error && ready) {
      // Show error but allow app to continue with defaults
      console.warn('[AppContent] Error state:', error);
      logError(new Error(error.message), {
        errorCode: error.code,
        component: 'AppContent',
        settingsReady,
        transactionsReady,
      }, 'warning');
    }
  }, [error, ready, settingsReady, transactionsReady]);

  // Auto-unlock if no valid auth method is enabled (must be before any conditional returns)
  React.useEffect(() => {
    if (isLocked && ready) {
      const enableBiometric = settings.enableBiometric === true;
      const enablePIN = settings.enablePIN === true;
      const hasPIN = !!settings.pin;
      
      console.log('[AppRoot] Checking if auto-unlock needed:', {
        isLocked,
        ready,
        enableBiometric,
        enablePIN,
        hasPIN,
        authRequired,
      });
      
      // If no authentication method is actually enabled, unlock automatically
      if (!enableBiometric && (!enablePIN || !hasPIN)) {
        console.log('[AppRoot] No valid auth method, unlocking automatically');
        setIsLocked(false);
      } else {
        console.log('[AppRoot] Auth method is enabled, keeping locked');
      }
    }
  }, [isLocked, ready, settings.enableBiometric, settings.enablePIN, settings.pin, authRequired]);

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

  // Show lock screen if app is locked
  if (isLocked && ready) {
    const enableBiometric = !TEMP_DISABLE_BIOMETRIC_LOCK && settings.enableBiometric === true;
    const enablePIN = settings.enablePIN === true;
    const hasPIN = !!settings.pin;
    
    console.log('[AppRoot] Showing lock screen', {
      isLocked,
      ready,
      enableBiometric,
      enablePIN,
      hasPIN,
      authRequired,
      tempBiometricDisabled: TEMP_DISABLE_BIOMETRIC_LOCK,
    });
    
    return (
      <LockScreen
        enableBiometric={enableBiometric}
        enablePIN={enablePIN && hasPIN}
        storedPIN={settings.pin}
        onUnlock={handleUnlock}
        reason="Unlock your budget app"
      />
    );
  }
  
  console.log('[AppRoot] App is unlocked, showing navigation', {
    isLocked,
    ready,
    authRequired,
  });

  return (
    <NavigationContainer
      onReady={() => {
        addBreadcrumb('Navigation container ready', 'navigation', 'info', {
          isOnboarded: settings.isOnboarded,
        });
      }}
    >
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
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <TouchableOpacity
            onPress={resetError}
            style={[styles.retryButton, { backgroundColor: '#007AFF', padding: 12, borderRadius: 8 }]}
          >
            <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
      showDialog={false}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SettingsProvider>
            <ThemeWrapper />
          </SettingsProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </SentryErrorBoundary>
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
