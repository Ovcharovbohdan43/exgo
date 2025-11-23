import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTransactions } from '../state/TransactionsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useMonthlyTotals, useCategoryBreakdown } from '../state/selectors';
import { formatCurrency } from '../utils/format';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { DonutChartWithPercentages } from '../components/DonutChartWithPercentages';
import { useThemeStyles } from '../theme/ThemeProvider';
import { Card } from '../components/layout';
import { SectionHeader } from '../components/layout';
import { EmptyState } from '../components/states';
import { formatMonthShort } from '../utils/month';

const DetailsScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { transactions, currentMonth } = useTransactions();
  const { settings } = useSettings();
  const breakdown = useCategoryBreakdown(transactions);
  const totals = useMonthlyTotals(transactions, settings.monthlyIncome);
  
  // Animation key for DonutChart - changes on focus to trigger animation
  const [chartAnimationKey, setChartAnimationKey] = useState(0);
  
  // Trigger animation when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Increment key to trigger animation reset in DonutChart
      setChartAnimationKey(prev => prev + 1);
    }, [])
  );

  const data = Object.entries(breakdown);

  const handleCategoryPress = (category: string) => {
    // TODO: Navigate to CategoryTransactions screen
    // For now, this is a placeholder
    console.log('Category pressed:', category);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <SectionHeader
          title="This month"
          variant="overline"
          style={styles.sectionHeader}
        />
      </View>

      {/* Donut Chart Section */}
      <View style={styles.chartSection}>
        <DonutChartWithPercentages
          spent={totals.expenses}
          saved={totals.saved}
          remaining={totals.chartRemaining}
          size={240}
          strokeWidth={24}
          centerLabelValue={totals.remaining}
          centerLabelCurrency={settings.currency}
          centerLabelColor={totals.remaining < 0 ? theme.colors.danger : theme.colors.textPrimary}
          centerSubLabel={`${totals.remaining < 0 ? 'Over budget' : 'Remaining'}\n${formatMonthShort(currentMonth)}`}
          centerSubLabelColor={theme.colors.textSecondary}
          animationTrigger={chartAnimationKey}
        />
      </View>

      {/* Categories Section */}
      <View style={styles.categoriesSection}>
        <SectionHeader
          title="Expense Categories"
          variant="overline"
          style={styles.sectionHeader}
        />
        {data.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No expenses yet"
            message="Start adding expense transactions to see your spending breakdown by category."
            accessibilityLabel="No expenses. Start adding expense transactions to see your spending breakdown."
          />
        ) : (
          <View style={styles.categoriesList}>
            {data.map(([category, stats]) => (
              <TouchableOpacity
                key={category}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityLabel={`${category} category, ${stats.percent.toFixed(1)} percent, ${formatCurrency(stats.amount, settings.currency)}`}
                accessibilityRole="button"
                accessibilityHint="Double tap to view transactions in this category"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Card variant="outlined" padding="md" style={styles.categoryCard}>
                  <View style={styles.row}>
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryEmoji}>{getCategoryEmoji(category)}</Text>
                        <Text
                          style={[
                            styles.category,
                            {
                              color: theme.colors.textPrimary,
                              fontSize: theme.typography.fontSize.md,
                              fontWeight: theme.typography.fontWeight.semibold,
                            },
                          ]}
                        >
                          {category}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.percent,
                          {
                            color: theme.colors.textSecondary,
                            fontSize: theme.typography.fontSize.sm,
                          },
                        ]}
                      >
                        {stats.percent.toFixed(1)}%
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.amount,
                        {
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.fontSize.lg,
                          fontWeight: theme.typography.fontWeight.bold,
                        },
                      ]}
                    >
                      {formatCurrency(stats.amount, settings.currency)}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  chartSection: {
    marginBottom: 32,
  },
  categoriesSection: {
    marginTop: 8,
  },
  categoriesList: {
    gap: 12,
    marginTop: 12,
  },
  categoryCard: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  category: {
    flex: 1,
  },
  percent: {
    marginTop: 2,
  },
  amount: {
    textAlign: 'right',
  },
  emptyCard: {
    marginTop: 12,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default DetailsScreen;
