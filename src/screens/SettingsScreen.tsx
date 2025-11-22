import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { useTransactions } from '../state/TransactionsProvider';
import { resetStorage } from '../services/storage';

const SettingsScreen: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { resetTransactions } = useTransactions();
  const [currency, setCurrency] = useState(settings.currency);
  const [income, setIncome] = useState(String(settings.monthlyIncome));

  const handleSave = async () => {
    const monthlyIncome = Number(income) || 0;
    await updateSettings({ currency: currency || 'USD', monthlyIncome });
  };

  const handleReset = async () => {
    Alert.alert('Reset all data?', 'This will clear settings and transactions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetStorage();
          await updateSettings({ currency: 'USD', monthlyIncome: 0, isOnboarded: false });
          await resetTransactions();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Currency</Text>
        <TextInput
          value={currency}
          onChangeText={setCurrency}
          style={styles.input}
          autoCapitalize="characters"
        />
        <Text style={styles.label}>Monthly income</Text>
        <TextInput
          value={income}
          onChangeText={setIncome}
          keyboardType="numeric"
          style={styles.input}
        />
        <Button title="Save" onPress={handleSave} />
        <Button title="Reset all data" color="red" onPress={handleReset} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f6f7fb',
  },
});

export default SettingsScreen;
