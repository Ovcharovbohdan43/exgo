import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, ScrollView } from 'react-native';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { useSettings } from '../../state/SettingsProvider';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { TransactionType } from '../../types';
import { getCategoryEmoji } from '../../utils/categoryEmojis';
import { useTranslation } from 'react-i18next';
import { getLocalizedCategory } from '../../utils/categoryLocalization';
import { useCreditProducts } from '../../state/CreditProductsProvider';
import { useGoals, GENERAL_SAVINGS_GOAL_ID } from '../../state/GoalsProvider';

type TransactionScheduleType = 'standard' | 'scheduled';

type ConfirmStepProps = {
  type: TransactionType;
  amount: number;
  category: string | null;
  creditProductId?: string | null;
  paidByCreditProductId?: string | null;
  goalId?: string | null;
  onPaidByCreditProductChange?: (productId: string | null) => void;
  currency: string;
  createdAt: string;
  scheduleType?: TransactionScheduleType;
  onScheduleTypeChange?: (scheduleType: TransactionScheduleType) => void;
  onOpenRecurringModal?: () => void;
  style?: ViewStyle;
};

/**
 * ConfirmStep - Step for confirming transaction details
 * Shows all transaction information before saving
 */
export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  type,
  amount,
  category,
  creditProductId,
  paidByCreditProductId,
  goalId,
  onPaidByCreditProductChange,
  currency,
  createdAt,
  scheduleType = 'standard',
  onScheduleTypeChange,
  onOpenRecurringModal,
  style,
}) => {
  const theme = useThemeStyles();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { getCreditProductById, getActiveCreditProducts } = useCreditProducts();
  const { getGoalById } = useGoals();
  const customCategories = settings.customCategories || [];
  
  const creditProduct = creditProductId ? getCreditProductById(creditProductId) : null;
  const paidByCreditProduct = paidByCreditProductId ? getCreditProductById(paidByCreditProductId) : null;
  const goal = goalId ? getGoalById(goalId) : null;
  
  // Get only credit cards (not loans or installments) for payment selection
  const creditCards = getActiveCreditProducts().filter((product) => product.creditType === 'credit_card');
  const [showCreditCardSelector, setShowCreditCardSelector] = useState(false);
  const [showScheduleTypeSelector, setShowScheduleTypeSelector] = useState(false);

  // Debug: Log received props
  React.useEffect(() => {
    console.log('[ConfirmStep] Props received:', {
      type,
      amount,
      category,
      creditProductId,
      paidByCreditProductId,
      paidByCreditProduct: paidByCreditProduct?.name,
      currency,
      hasCreditProduct: !!creditProduct,
      creditProductName: creditProduct?.name,
      creditCardsCount: creditCards.length,
    });
  }, [type, amount, category, creditProductId, paidByCreditProductId, paidByCreditProduct, currency, creditProduct, creditCards.length]);

  const getTypeLabel = () => {
    if (!type) return 'Unknown';
    return t(`transactions.type.${type}`, { defaultValue: type });
  };

  const getTypeColor = () => {
    switch (type) {
      case 'expense':
        return theme.colors.danger;
      case 'income':
        return theme.colors.positive;
      case 'saved':
        return theme.colors.accent;
      case 'credit':
        return theme.colors.warning || '#FFA500';
    }
  };

  const typeColor = getTypeColor();

  // Early return if critical data is missing
  if (!type || !amount || amount <= 0) {
    console.warn('[ConfirmStep] Missing critical data:', { type, amount, category, creditProductId });
    return (
      <View style={style}>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.danger,
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.medium,
              textAlign: 'center',
            },
          ]}
        >
          {t('addTransaction.errorMissingData', { defaultValue: 'Error: Missing transaction data' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.lg,
            textAlign: 'center',
          },
        ]}
      >
        {t('addTransaction.confirmTransaction', { defaultValue: 'Confirm Transaction' })}
      </Text>

      <Card variant="elevated" padding="lg" style={styles.confirmCard}>
        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
              },
            ]}
          >
            {t('addTransaction.type', { defaultValue: 'Type' })}
          </Text>
          <Text
            style={[
              styles.value,
              {
                color: typeColor,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
          >
            {getTypeLabel()}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
              },
            ]}
          >
            {t('addTransaction.amount', { defaultValue: 'Amount' })}
          </Text>
          <Text
            style={[
              styles.value,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
              },
            ]}
          >
            {formatCurrency(amount, currency)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
              },
            ]}
          >
            {t('addTransaction.category', { defaultValue: 'Category' })}
          </Text>
          <View style={styles.categoryValue}>
            <Text style={styles.categoryEmoji}>{getCategoryEmoji(category, customCategories)}</Text>
            <Text
              style={[
                styles.value,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: theme.typography.fontWeight.semibold,
                },
              ]}
            >
              {category ? getLocalizedCategory(category) : 'N/A'}
            </Text>
          </View>
        </View>

        {type === 'credit' && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.row}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {t('addTransaction.creditProduct', { defaultValue: 'Credit Product' })}
              </Text>
              <Text
                style={[
                  styles.value,
                  {
                    color: creditProduct 
                      ? theme.colors.textPrimary 
                      : theme.colors.danger,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight: theme.typography.fontWeight.semibold,
                  },
                ]}
              >
                {creditProduct ? creditProduct.name : (creditProductId ? `Product ID: ${creditProductId}` : 'Not selected')}
              </Text>
            </View>
          </>
        )}

        {type === 'saved' && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.row}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {t('addTransaction.goal', { defaultValue: 'Goal' })}
              </Text>
              <View style={styles.categoryValue}>
                {goal && goal.emoji && (
                  <Text style={styles.categoryEmoji}>{goal.emoji}</Text>
                )}
                <Text
                  style={[
                    styles.value,
                    {
                      color: goal 
                        ? theme.colors.textPrimary 
                        : theme.colors.textMuted,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.semibold,
                    },
                  ]}
                >
                  {goal ? goal.name : t('addTransaction.noGoal', { defaultValue: 'No Goal (General Savings)' })}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Payment method selector for expense transactions */}
        {type === 'expense' && creditCards.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.row}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {t('addTransaction.paymentMethod', { defaultValue: 'Payment Method' })}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreditCardSelector(!showCreditCardSelector)}
                activeOpacity={0.7}
                style={styles.paymentMethodSelector}
              >
                <Text
                  style={[
                    styles.value,
                    {
                      color: paidByCreditProduct 
                        ? theme.colors.textPrimary 
                        : theme.colors.textMuted,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {paidByCreditProduct 
                    ? paidByCreditProduct.name 
                    : t('addTransaction.cash', { defaultValue: 'Cash / Debit Card' })}
                </Text>
                <Text style={{ color: theme.colors.textMuted, marginLeft: 8 }}>▼</Text>
              </TouchableOpacity>
            </View>
            
            {showCreditCardSelector && (
              <View style={styles.creditCardSelector}>
                <ScrollView style={styles.creditCardList} nestedScrollEnabled>
                  <TouchableOpacity
                    onPress={() => {
                      onPaidByCreditProductChange?.(null);
                      setShowCreditCardSelector(false);
                    }}
                    style={[
                      styles.creditCardOption,
                      {
                        backgroundColor: !paidByCreditProductId 
                          ? theme.colors.accent + '15' 
                          : theme.colors.surface,
                        borderColor: !paidByCreditProductId 
                          ? theme.colors.accent 
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.creditCardOptionText,
                        {
                          color: !paidByCreditProductId 
                            ? theme.colors.accent 
                            : theme.colors.textPrimary,
                          fontWeight: !paidByCreditProductId 
                            ? theme.typography.fontWeight.semibold 
                            : theme.typography.fontWeight.medium,
                        },
                      ]}
                    >
                      {t('addTransaction.cash', { defaultValue: 'Cash / Debit Card' })}
                    </Text>
                  </TouchableOpacity>
                  
                  {creditCards.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      onPress={() => {
                        console.log('[ConfirmStep] Credit card selected:', {
                          cardId: card.id,
                          cardName: card.name,
                          hasCallback: !!onPaidByCreditProductChange,
                        });
                        onPaidByCreditProductChange?.(card.id);
                        setShowCreditCardSelector(false);
                      }}
                      style={[
                        styles.creditCardOption,
                        {
                          backgroundColor: paidByCreditProductId === card.id 
                            ? theme.colors.accent + '15' 
                            : theme.colors.surface,
                          borderColor: paidByCreditProductId === card.id 
                            ? theme.colors.accent 
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.creditCardOptionText,
                          {
                            color: paidByCreditProductId === card.id 
                              ? theme.colors.accent 
                              : theme.colors.textPrimary,
                            fontWeight: paidByCreditProductId === card.id 
                              ? theme.typography.fontWeight.semibold 
                              : theme.typography.fontWeight.medium,
                          },
                        ]}
                      >
                        {card.name}
                      </Text>
                      <Text
                        style={[
                          styles.creditCardBalance,
                          {
                            color: theme.colors.textSecondary,
                            fontSize: theme.typography.fontSize.xs,
                          },
                        ]}
                      >
                        {formatCurrency(card.remainingBalance, currency)} balance
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* Schedule Type Selector (only for expense transactions) */}
        {type === 'expense' && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.row}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {t('addTransaction.scheduleType', { defaultValue: 'Schedule Type' })}
              </Text>
              <TouchableOpacity
                onPress={() => setShowScheduleTypeSelector(!showScheduleTypeSelector)}
                activeOpacity={0.7}
                style={styles.paymentMethodSelector}
              >
                <Text
                  style={[
                    styles.value,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {scheduleType === 'standard' 
                    ? t('addTransaction.standard', { defaultValue: 'Standard' })
                    : t('addTransaction.scheduled', { defaultValue: 'Scheduled' })}
                </Text>
                <Text style={{ color: theme.colors.textMuted, marginLeft: 8 }}>▼</Text>
              </TouchableOpacity>
            </View>
            
            {showScheduleTypeSelector && (
              <View style={styles.creditCardSelector}>
                <ScrollView style={styles.creditCardList} nestedScrollEnabled>
                  <TouchableOpacity
                    onPress={() => {
                      onScheduleTypeChange?.('standard');
                      setShowScheduleTypeSelector(false);
                    }}
                    style={[
                      styles.creditCardOption,
                      {
                        backgroundColor: scheduleType === 'standard' 
                          ? theme.colors.accent + '15' 
                          : theme.colors.surface,
                        borderColor: scheduleType === 'standard' 
                          ? theme.colors.accent 
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.creditCardOptionText,
                        {
                          color: scheduleType === 'standard' 
                            ? theme.colors.accent 
                            : theme.colors.textPrimary,
                          fontWeight: scheduleType === 'standard' 
                            ? theme.typography.fontWeight.semibold 
                            : theme.typography.fontWeight.medium,
                        },
                      ]}
                    >
                      {t('addTransaction.standard', { defaultValue: 'Standard' })}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      const wasStandard = scheduleType === 'standard';
                      onScheduleTypeChange?.('scheduled');
                      setShowScheduleTypeSelector(false);
                      // Open recurring transaction modal when Scheduled is selected (only if it wasn't already scheduled)
                      if (wasStandard && onOpenRecurringModal) {
                        // Small delay to ensure state updates
                        setTimeout(() => {
                          console.log('[ConfirmStep] Opening recurring transaction modal');
                          onOpenRecurringModal();
                        }, 150);
                      }
                    }}
                    style={[
                      styles.creditCardOption,
                      {
                        backgroundColor: scheduleType === 'scheduled' 
                          ? theme.colors.accent + '15' 
                          : theme.colors.surface,
                        borderColor: scheduleType === 'scheduled' 
                          ? theme.colors.accent 
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.creditCardOptionText,
                        {
                          color: scheduleType === 'scheduled' 
                            ? theme.colors.accent 
                            : theme.colors.textPrimary,
                          fontWeight: scheduleType === 'scheduled' 
                            ? theme.typography.fontWeight.semibold 
                            : theme.typography.fontWeight.medium,
                        },
                      ]}
                    >
                      {t('addTransaction.scheduled', { defaultValue: 'Scheduled' })}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </>
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
              },
            ]}
          >
            {t('addTransaction.date', { defaultValue: 'Date' })}
          </Text>
          <Text
            style={[
              styles.value,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
              },
            ]}
          >
            {formatDate(createdAt)}
          </Text>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    marginBottom: 24,
  },
  confirmCard: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    textAlign: 'right',
  },
  categoryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  paymentMethodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditCardSelector: {
    marginTop: 8,
    maxHeight: 200,
  },
  creditCardList: {
    maxHeight: 200,
  },
  creditCardOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  creditCardOptionText: {
    fontSize: 14,
  },
  creditCardBalance: {
    marginTop: 4,
  },
});

