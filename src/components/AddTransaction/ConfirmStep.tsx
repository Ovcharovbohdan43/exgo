import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { useSettings } from '../../state/SettingsProvider';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { TransactionType, RecurringFrequency } from '../../types';
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
  onRecurringDataChange?: (data: {
    name: string;
    frequency: RecurringFrequency;
    startDate: string;
  } | null) => void;
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
  onRecurringDataChange,
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
  
  // Recurring transaction settings (only for scheduled transactions)
  const [recurringName, setRecurringName] = useState(category || '');
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');
  const [recurringStartDate, setRecurringStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1); // Default to tomorrow
    return date.toISOString().split('T')[0];
  });
  const [showFrequencySelector, setShowFrequencySelector] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Debug: Log when scheduleType changes
  useEffect(() => {
    console.log('[ConfirmStep] scheduleType changed:', scheduleType);
  }, [scheduleType]);
  
  // Update recurring data when settings change
  // Use ref to track previous values and avoid infinite loops
  const prevDataRef = React.useRef<{
    scheduleType: TransactionScheduleType;
    recurringName: string;
    recurringFrequency: RecurringFrequency;
    recurringStartDate: string;
  } | null>(null);

  useEffect(() => {
    const currentData = {
      scheduleType,
      recurringName: recurringName.trim(),
      recurringFrequency,
      recurringStartDate,
    };

    // Check if data actually changed
    if (prevDataRef.current &&
        prevDataRef.current.scheduleType === currentData.scheduleType &&
        prevDataRef.current.recurringName === currentData.recurringName &&
        prevDataRef.current.recurringFrequency === currentData.recurringFrequency &&
        prevDataRef.current.recurringStartDate === currentData.recurringStartDate) {
      return; // No changes, skip update
    }

    prevDataRef.current = currentData;

    if (scheduleType === 'scheduled' && recurringName.trim() && recurringStartDate) {
      // Validate date format
      const date = new Date(recurringStartDate);
      if (!isNaN(date.getTime())) {
        onRecurringDataChange?.({
          name: recurringName.trim(),
          frequency: recurringFrequency,
          startDate: date.toISOString(),
        });
      } else {
        onRecurringDataChange?.(null);
      }
    } else {
      onRecurringDataChange?.(null);
    }
  }, [scheduleType, recurringName, recurringFrequency, recurringStartDate]);
  
  // Initialize recurring name when switching to scheduled
  useEffect(() => {
    if (scheduleType === 'scheduled' && !recurringName.trim()) {
      setRecurringName(category || '');
    } else if (scheduleType === 'standard') {
      setRecurringName(category || '');
      setRecurringFrequency('monthly');
      const date = new Date();
      date.setDate(date.getDate() + 1);
      setRecurringStartDate(date.toISOString().split('T')[0]);
    }
  }, [scheduleType, category]);

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
                        {formatCurrency(card.currentBalance, currency)} balance
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
                      console.log('[ConfirmStep] Setting scheduleType to standard');
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
                      console.log('[ConfirmStep] Setting scheduleType to scheduled');
                      onScheduleTypeChange?.('scheduled');
                      setShowScheduleTypeSelector(false);
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
            
            {/* Recurring Transaction Settings (shown when scheduled is selected) */}
            {scheduleType === 'scheduled' && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                
                {/* Transaction Name */}
                <View style={styles.recurringSettingRow}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        marginBottom: theme.spacing.xs,
                      },
                    ]}
                  >
                    {t('recurringTransactions.name', { defaultValue: 'Transaction Name' })}
                    <Text style={{ color: theme.colors.danger }}> *</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.recurringInput,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                      },
                    ]}
                    value={recurringName}
                    onChangeText={setRecurringName}
                    placeholder={t('recurringTransactions.namePlaceholder', { defaultValue: 'e.g., Netflix' })}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                
                {/* Frequency */}
                <View style={styles.recurringSettingRow}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        marginBottom: theme.spacing.xs,
                      },
                    ]}
                  >
                    {t('recurringTransactions.frequency', { defaultValue: 'Frequency' })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowFrequencySelector(!showFrequencySelector)}
                    activeOpacity={0.7}
                    style={[
                      styles.frequencySelector,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        {
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.fontSize.md,
                          fontWeight: theme.typography.fontWeight.medium,
                        },
                      ]}
                    >
                      {(() => {
                        const freq = recurringFrequency;
                        if (freq === 'weekly' as RecurringFrequency) {
                          return t(`recurringTransactions.frequency.weekly`, { defaultValue: 'Weekly' });
                        } else if (freq === ('biweekly' as RecurringFrequency)) {
                          return t(`recurringTransactions.frequency.biweekly`, { defaultValue: 'Every 2 weeks' });
                        } else if (freq === 'monthly' as RecurringFrequency) {
                          return t(`recurringTransactions.frequency.monthly`, { defaultValue: 'Monthly' });
                        } else if (freq === 'daily' as RecurringFrequency) {
                          return t(`recurringTransactions.frequency.daily`, { defaultValue: 'Daily' });
                        } else if (freq === 'yearly' as RecurringFrequency) {
                          return t(`recurringTransactions.frequency.yearly`, { defaultValue: 'Yearly' });
                        }
                        return t(`recurringTransactions.frequency.monthly`, { defaultValue: 'Monthly' });
                      })()}
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, marginLeft: 8 }}>▼</Text>
                  </TouchableOpacity>
                  
                  {showFrequencySelector && (
                    <View style={styles.frequencyOptions}>
                      {(['weekly', 'biweekly', 'monthly'] as RecurringFrequency[]).map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          onPress={() => {
                            setRecurringFrequency(freq);
                            setShowFrequencySelector(false);
                          }}
                          style={[
                            styles.frequencyOption,
                            {
                              backgroundColor: recurringFrequency === freq 
                                ? theme.colors.accent + '15' 
                                : theme.colors.surface,
                              borderColor: recurringFrequency === freq 
                                ? theme.colors.accent 
                                : theme.colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.frequencyOptionText,
                              {
                                color: recurringFrequency === freq 
                                  ? theme.colors.accent 
                                  : theme.colors.textPrimary,
                                fontWeight: recurringFrequency === freq 
                                  ? theme.typography.fontWeight.semibold 
                                  : theme.typography.fontWeight.medium,
                              },
                            ]}
                          >
                            {(() => {
                              const frequency = freq;
                              if (frequency === ('weekly' as RecurringFrequency)) {
                                return t(`recurringTransactions.frequency.weekly`, { defaultValue: 'Weekly' });
                              } else if (frequency === ('biweekly' as RecurringFrequency)) {
                                return t(`recurringTransactions.frequency.biweekly`, { defaultValue: 'Every 2 weeks' });
                              } else if (frequency === ('monthly' as RecurringFrequency)) {
                                return t(`recurringTransactions.frequency.monthly`, { defaultValue: 'Monthly' });
                              }
                              return t(`recurringTransactions.frequency.monthly`, { defaultValue: 'Monthly' });
                            })()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                
                {/* Start Date */}
                <View style={styles.recurringSettingRow}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        marginBottom: theme.spacing.xs,
                      },
                    ]}
                  >
                    {t('recurringTransactions.startDate', { defaultValue: 'Start Date' })}
                    <Text style={{ color: theme.colors.danger }}> *</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                    style={[
                      styles.recurringInput,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        {
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.fontSize.md,
                        },
                      ]}
                    >
                      {recurringStartDate || 'YYYY-MM-DD'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(recurringStartDate || new Date().toISOString())}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          setShowDatePicker(false);
                        }
                        if (event.type === 'set' && selectedDate) {
                          setRecurringStartDate(selectedDate.toISOString().split('T')[0]);
                          if (Platform.OS === 'ios') {
                            setShowDatePicker(false);
                          }
                        } else if (event.type === 'dismissed') {
                          setShowDatePicker(false);
                        }
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                </View>
              </>
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
  recurringSettingRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  recurringInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    marginTop: 4,
  },
  frequencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    marginTop: 4,
  },
  frequencyOptions: {
    marginTop: 8,
  },
  frequencyOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  frequencyOptionText: {
    fontSize: 14,
  },
});

