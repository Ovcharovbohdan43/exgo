import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTransactions } from '../state/TransactionsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useMiniBudgets } from '../state/MiniBudgetsProvider';
import { useCreditProducts } from '../state/CreditProductsProvider';
import { useMonthlyTotals, useCategoryBreakdown } from '../state/selectors';
import { formatCurrency } from '../utils/format';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { DonutChartWithPercentages } from '../components/DonutChartWithPercentages';
import { useThemeStyles } from '../theme/ThemeProvider';
import { Card } from '../components/layout';
import { SectionHeader } from '../components/layout';
import { EmptyState } from '../components/states';
import { formatMonthShort } from '../utils/month';
import { useTranslation } from 'react-i18next';
import { getLocalizedCategory } from '../utils/categoryLocalization';
import { MiniBudgetCard } from '../components/MiniBudgetCard';
import { CreditProductCard } from '../components/CreditProductCard';
import { AddMiniBudgetModal } from '../components/AddMiniBudgetModal';
import { AddCreditProductModal } from '../components/AddTransaction/AddCreditProductModal';
import { Alert } from 'react-native';
import { MiniBudget, MiniBudgetWithState, CreditProduct } from '../types';

const DetailsScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const { transactions, currentMonth } = useTransactions();
  const { settings } = useSettings();
  const { getMiniBudgetsByMonth, deleteMiniBudget, updateMiniBudget } = useMiniBudgets();
  const { getActiveCreditProducts, deleteCreditProduct, creditProducts: allCreditProducts } = useCreditProducts();
  const breakdown = useCategoryBreakdown(transactions);
  const totals = useMonthlyTotals(transactions, settings.monthlyIncome);
  
  // Animation key for DonutChart - changes on focus to trigger animation
  const [chartAnimationKey, setChartAnimationKey] = useState(0);
  const [miniBudgetModalVisible, setMiniBudgetModalVisible] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<MiniBudget | null>(null);
  const [creditProductModalVisible, setCreditProductModalVisible] = useState(false);
  const [creditProductToEdit, setCreditProductToEdit] = useState<CreditProduct | null>(null);
  
  // Get mini budgets for current month
  const miniBudgets = getMiniBudgetsByMonth(currentMonth);
  // Get active credit products - useMemo to recalculate when allCreditProducts changes
  const creditProducts = React.useMemo(() => {
    return getActiveCreditProducts();
  }, [getActiveCreditProducts, allCreditProducts.length]);
  
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

  const handleMiniBudgetEdit = (budget: MiniBudgetWithState) => {
    // Extract MiniBudget part (without state) for editing
    const budgetForEdit: MiniBudget = {
      id: budget.id,
      name: budget.name,
      month: budget.month,
      currency: budget.currency,
      limitAmount: budget.limitAmount,
      linkedCategoryIds: budget.linkedCategoryIds,
      status: budget.status,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
      note: budget.note,
    };
    setBudgetToEdit(budgetForEdit);
    setMiniBudgetModalVisible(true);
  };

  const handleMiniBudgetDelete = async (budget: MiniBudgetWithState) => {
    Alert.alert(
      t('miniBudgets.delete'),
      t('miniBudgets.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMiniBudget(budget.id);
            } catch (error) {
              Alert.alert(t('alerts.error'), t('alerts.somethingWentWrong'));
            }
          },
        },
      ],
    );
  };

  const handleCreateMiniBudget = () => {
    setBudgetToEdit(null);
    setMiniBudgetModalVisible(true);
  };

  const handleCreditProductEdit = (product: CreditProduct) => {
    setCreditProductToEdit(product);
    setCreditProductModalVisible(true);
  };

  const handleCreditProductDelete = async (product: CreditProduct) => {
    Alert.alert(
      t('common.delete'),
      t('creditProducts.deleteConfirm', { defaultValue: 'Are you sure you want to delete this credit product? This action cannot be undone.' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCreditProduct(product.id);
            } catch (error) {
              Alert.alert(t('alerts.error'), t('alerts.somethingWentWrong'));
            }
          },
        },
      ],
    );
  };

  const handleCreateCreditProduct = () => {
    setCreditProductToEdit(null);
    setCreditProductModalVisible(true);
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
          title={t('details.thisMonth')}
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
          centerSubLabel={`${t('home.remaining')}\n${formatMonthShort(currentMonth)}`}
          centerSubLabelColor={theme.colors.textSecondary}
          animationTrigger={chartAnimationKey}
        />
        {totals.remaining < 0 && (
          <Text
            style={[
              styles.overBudgetWarning,
              {
                color: theme.colors.danger,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                marginTop: 12,
              },
            ]}
          >
            {t('home.overBudget')} {formatCurrency(Math.abs(totals.remaining), settings.currency)}
          </Text>
        )}
      </View>

      {/* Mini Budgets Section */}
      <View style={styles.miniBudgetsSection}>
        <SectionHeader
          title={t('miniBudgets.createTitle')}
          variant="overline"
          style={styles.sectionHeader}
        />
        {miniBudgets.length === 0 ? (
          <EmptyState
            icon="💰"
            title={t('miniBudgets.noBudgets')}
            message={t('miniBudgets.noBudgetsMessage')}
            actionLabel={t('miniBudgets.createFirst')}
            onAction={handleCreateMiniBudget}
            accessibilityLabel={t('miniBudgets.noBudgets')}
          />
        ) : (
          <View style={styles.miniBudgetsList}>
            {miniBudgets.map((budget) => (
              <MiniBudgetCard
                key={budget.id}
                budget={budget}
                currency={settings.currency}
                onEdit={() => handleMiniBudgetEdit(budget)}
                onDelete={() => handleMiniBudgetDelete(budget)}
                style={styles.miniBudgetCard}
              />
            ))}
          </View>
        )}
      </View>

      {/* Credit Products Section */}
      <View style={styles.creditProductsSection}>
        <SectionHeader
          title={t('creditProducts.title', { defaultValue: 'Credit Products' })}
          variant="overline"
          style={styles.sectionHeader}
        />
        {creditProducts.length === 0 ? (
          <EmptyState
            icon="💳"
            title={t('creditProducts.noProducts', { defaultValue: 'No Credit Products' })}
            message={t('creditProducts.noProductsMessage', { defaultValue: 'You haven\'t added any credit products yet. Add your credit cards, loans, or installment plans to track your debt.' })}
            actionLabel={t('creditProducts.createFirst', { defaultValue: 'Create Credit Product' })}
            onAction={handleCreateCreditProduct}
            accessibilityLabel={t('creditProducts.noProducts', { defaultValue: 'No Credit Products' })}
          />
        ) : (
          <View style={styles.creditProductsList}>
            {creditProducts.map((product) => (
              <CreditProductCard
                key={product.id}
                product={product}
                currency={settings.currency}
                onEdit={() => handleCreditProductEdit(product)}
                onDelete={() => handleCreditProductDelete(product)}
                style={styles.creditProductCard}
              />
            ))}
          </View>
        )}
      </View>

      {/* Categories Section */}
      <View style={styles.categoriesSection}>
        <SectionHeader
          title={t('details.expenseCategories', { defaultValue: 'Expense Categories' })}
          variant="overline"
          style={styles.sectionHeader}
        />
        {data.length === 0 ? (
          <EmptyState
            icon="📊"
            title={t('details.noExpenses')}
            message={t('details.noExpensesMessage')}
            accessibilityLabel={t('details.noExpensesAccessibility', { defaultValue: 'No expenses. Start adding expense transactions to see your spending breakdown.' })}
          />
        ) : (
          <View style={styles.categoriesList}>
            {data.map(([category, stats]) => {
              const localizedCategory = getLocalizedCategory(category);
              return (
              <TouchableOpacity
                key={category}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityLabel={t('details.categoryAccessibility', { 
                  category: localizedCategory, 
                  percent: stats.percent.toFixed(1), 
                  amount: formatCurrency(stats.amount, settings.currency) 
                })}
                accessibilityRole="button"
                accessibilityHint={t('details.viewCategoryHint', { defaultValue: 'Double tap to view transactions in this category' })}
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
                          {localizedCategory}
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
            );
            })}
          </View>
        )}
      </View>

      {/* Add/Edit Mini Budget Modal */}
      <AddMiniBudgetModal
        visible={miniBudgetModalVisible}
        budgetToEdit={budgetToEdit}
        currentMonth={currentMonth}
        onClose={() => {
          setMiniBudgetModalVisible(false);
          setBudgetToEdit(null);
        }}
      />

      {/* Add/Edit Credit Product Modal */}
      <AddCreditProductModal
        visible={creditProductModalVisible}
        productToEdit={creditProductToEdit}
        onClose={() => {
          setCreditProductModalVisible(false);
          setCreditProductToEdit(null);
        }}
        onProductCreated={() => {
          setCreditProductModalVisible(false);
          setCreditProductToEdit(null);
        }}
      />
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
    alignItems: 'center',
  },
  overBudgetWarning: {
    textAlign: 'center',
  },
  miniBudgetsSection: {
    marginBottom: 32,
  },
  miniBudgetsList: {
    gap: 12,
    marginTop: 12,
  },
  miniBudgetCard: {
    marginBottom: 0,
  },
  creditProductsSection: {
    marginBottom: 32,
  },
  creditProductsList: {
    gap: 12,
    marginTop: 12,
  },
  creditProductCard: {
    marginBottom: 0,
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
