import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { calculateTotals } from '../modules/calculations';
import { formatCurrency } from '../utils/format';
import { useSettings } from '../state/SettingsProvider';
import { useTransactions } from '../state/TransactionsProvider';
import { RootStackParamList } from '../navigation/RootNavigator';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { clearAllData } from '../utils/devReset';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { settings } = useSettings();
  const { transactions, addTransaction } = useTransactions();
  const totals = calculateTotals(transactions, settings.monthlyIncome);

  const handleAddSample = async () => {
    await addTransaction({
      amount: 12,
      type: 'expense',
      category: EXPENSE_CATEGORIES[0],
    });
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will clear all data and show onboarding screen again. Restart the app after reset.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert(
                'Success',
                'Data cleared! Please restart the app (close and reopen) to see onboarding.',
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Check console for details.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.overline}>Monthly balance</Text>
      <Text style={styles.balance}>{formatCurrency(totals.remaining, settings.currency)}</Text>
      <Text style={styles.caption}>Of {formatCurrency(totals.income, settings.currency)}</Text>

      <View style={styles.row}>
        <Stat label="Spent" value={formatCurrency(totals.expenses, settings.currency)} />
        <Stat label="Saved" value={formatCurrency(totals.saved, settings.currency)} />
      </View>

      <View style={styles.actions}>
        <Button title="Add sample expense" onPress={handleAddSample} />
        <Button title="Spending breakdown" onPress={() => navigation.navigate('Details')} />
        <Button title="Settings" onPress={() => navigation.navigate('Settings')} />
        {/* Development only - Remove in production */}
        <Button
          title="🔄 Reset Onboarding (Dev)"
          onPress={handleResetOnboarding}
          color="#ef4444"
        />
      </View>
    </View>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  overline: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
    color: '#666',
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
  },
  caption: {
    fontSize: 14,
    color: '#777',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f6f7fb',
  },
  statLabel: {
    fontSize: 14,
    color: '#555',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    gap: 8,
    marginTop: 16,
  },
});

export default HomeScreen;
