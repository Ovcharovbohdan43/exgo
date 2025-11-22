import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import RootNavigator from './navigation/RootNavigator';
import { AppProvider } from './state/AppProvider';
import { useSettings } from './state/SettingsProvider';
import { useTransactions } from './state/TransactionsProvider';

const Loader = () => (
  <View style={styles.loader}>
    <ActivityIndicator />
  </View>
);

const AppContent = () => {
  const { settings, hydrated: settingsReady } = useSettings();
  const { hydrated: transactionsReady } = useTransactions();
  const ready = settingsReady && transactionsReady;

  if (!ready) return <Loader />;

  return (
    <NavigationContainer>
      <RootNavigator isOnboarded={settings.isOnboarded} />
    </NavigationContainer>
  );
};

const AppRoot = () => {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppRoot;
