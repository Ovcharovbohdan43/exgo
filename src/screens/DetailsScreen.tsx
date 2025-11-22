import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTransactions } from '../state/TransactionsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useMonthlyTotals, useCategoryBreakdown } from '../state/selectors';
import { formatCurrency } from '../utils/format';

const DetailsScreen: React.FC = () => {
  const { transactions } = useTransactions();
  const { settings } = useSettings();
  const breakdown = useCategoryBreakdown(transactions);
  const totals = useMonthlyTotals(transactions, settings.monthlyIncome);

  const data = Object.entries(breakdown);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>This month</Text>
        <Text style={styles.subtitle}>
          Remaining {formatCurrency(totals.remaining, settings.currency)}
        </Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={([category]) => category}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item: [category, stats] }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.category}>{category}</Text>
              <Text style={styles.percent}>{stats.percent.toFixed(1)}%</Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(stats.amount, settings.currency)}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No expenses yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f6f7fb',
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
  },
  percent: {
    color: '#777',
  },
  amount: {
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
    color: '#777',
  },
});

export default DetailsScreen;
