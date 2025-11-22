import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '../components/layout';
import DonutChart from '../components/DonutChart';
import FloatingActionButton from '../components/FloatingActionButton';
import { SummaryCard } from '../components/SummaryCard';
import { TransactionsList } from '../components/TransactionsList';
import { AddTransactionModal } from '../components/AddTransaction';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTransactions } from '../state/TransactionsProvider';
import { useMonthlyTotals, useCurrentMonthTransactions, useRecentTransactions } from '../state/selectors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { formatCurrency } from '../utils/format';
import { clearAllData } from '../utils/devReset';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const theme = useThemeStyles();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { transactions } = useTransactions();
  const currentMonthTransactions = useCurrentMonthTransactions(transactions);
  const totals = useMonthlyTotals(transactions, settings.monthlyIncome);
  const recentTransactions = useRecentTransactions(currentMonthTransactions, 5);
  
  const [modalVisible, setModalVisible] = useState(false);

  // Debug: Log currency on mount and when settings change
  React.useEffect(() => {
    console.log('[HomeScreen] Current currency:', settings.currency);
    console.log('[HomeScreen] Current settings:', settings);
  }, [settings.currency, settings]);

  const handleChartPress = () => {
    navigation.navigate('Details');
  };

  const handleFABPress = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
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

  const remainingColor = totals.remaining < 0 ? theme.colors.danger : theme.colors.textPrimary;

  return (
    <View
      style={[
        styles.screenContainer,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 }, // Space for FAB
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <SectionHeader
            title="Monthly balance"
            variant="overline"
            style={styles.headerTitle}
          />
          <Text
            style={[
              styles.balance,
              {
                color: remainingColor,
                fontSize: theme.typography.fontSize.display,
                fontWeight: theme.typography.fontWeight.bold,
              },
            ]}
          >
            {formatCurrency(totals.remaining, settings.currency)}
          </Text>
          <Text
            style={[
              styles.caption,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.md,
              },
            ]}
          >
            Of {formatCurrency(totals.income, settings.currency)} total income
          </Text>
        </View>

        {/* Donut Chart Section */}
        <View style={styles.chartSection}>
          <DonutChart
            spent={totals.expenses}
            saved={totals.saved}
            remaining={totals.chartRemaining}
            size={200}
            strokeWidth={20}
            onPress={handleChartPress}
            showLabels={false}
          />
          {totals.remaining < 0 && (
            <Text
              style={[
                styles.overBudgetWarning,
                {
                  color: theme.colors.danger,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                },
              ]}
            >
              Over budget by {formatCurrency(Math.abs(totals.remaining), settings.currency)}
            </Text>
          )}
        </View>

        {/* Summary Stats Section */}
        <View style={styles.summarySection}>
          <SectionHeader
            title="Summary"
            variant="overline"
            style={styles.sectionHeader}
          />
          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Remaining"
              value={formatCurrency(totals.remaining, settings.currency)}
              variant={totals.remaining < 0 ? 'negative' : totals.remaining > 0 ? 'positive' : 'neutral'}
              style={styles.summaryCard}
            />
            <SummaryCard
              label="Spent"
              value={formatCurrency(totals.expenses, settings.currency)}
              variant="negative"
              style={styles.summaryCard}
            />
            <SummaryCard
              label="Saved"
              value={formatCurrency(totals.saved, settings.currency)}
              variant="positive"
              style={styles.summaryCard}
            />
          </View>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.recentTransactionsSection}>
          <SectionHeader
            title="Recent Transactions"
            variant="overline"
            style={styles.sectionHeader}
          />
          <TransactionsList
            transactions={recentTransactions}
            currency={settings.currency}
            maxItems={5}
          />
        </View>

        {/* Development Reset Button - Remove in production */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <FloatingActionButton
              onPress={handleResetOnboarding}
              size={48}
              style={{
                ...styles.devButton,
                backgroundColor: theme.colors.danger,
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - Fixed in bottom right */}
      <View
        style={[
          styles.fabContainer,
          {
            bottom: Math.max(24, insets.bottom + 8), // Account for safe area
            right: Math.max(24, insets.right + 8),
          },
        ]}
      >
        <FloatingActionButton onPress={handleFABPress} />
      </View>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
  },
  headerTitle: {
    marginBottom: 8,
  },
  balance: {
    marginVertical: 8,
    textAlign: 'center',
  },
  caption: {
    textAlign: 'center',
    marginTop: 4,
  },
  chartSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  overBudgetWarning: {
    marginTop: 12,
    textAlign: 'center',
  },
  summarySection: {
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
  },
  recentTransactionsSection: {
    marginTop: 8,
  },
  devSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  devButton: {
    marginTop: 8,
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000, // Ensure FAB is above all content
    elevation: 8, // Android shadow/elevation
  },
});

export default HomeScreen;
