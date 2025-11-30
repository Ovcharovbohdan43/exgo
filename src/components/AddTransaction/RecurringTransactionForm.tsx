import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { RecurringTransactionType, RecurringFrequency, TransactionType } from '../../types';

type RecurringTransactionFormProps = {
  onSave: (data: {
    name: string;
    recurringType: RecurringTransactionType;
    frequency: RecurringFrequency;
    startDate: string;
    endDate?: string;
    note?: string;
  }) => void;
  initialData?: {
    name?: string;
    recurringType?: RecurringTransactionType;
    frequency?: RecurringFrequency;
    startDate?: string;
    endDate?: string;
    note?: string;
  };
  transactionType: TransactionType;
  amount: number;
  category?: string | null;
  currency: string;
};

const RECURRING_TYPES: { value: RecurringTransactionType; label: string; emoji: string }[] = [
  { value: 'subscription', label: 'Subscription', emoji: '📱' },
  { value: 'rent', label: 'Rent', emoji: '🏠' },
  { value: 'salary', label: 'Salary', emoji: '💰' },
  { value: 'bill', label: 'Bill', emoji: '📄' },
  { value: 'other', label: 'Other', emoji: '📝' },
];

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export const RecurringTransactionForm: React.FC<RecurringTransactionFormProps> = ({
  onSave,
  initialData,
  transactionType,
  amount,
  category,
  currency,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  
  const [name, setName] = useState(initialData?.name || category || '');
  const [recurringType, setRecurringType] = useState<RecurringTransactionType>(initialData?.recurringType || 'other');
  const [frequency, setFrequency] = useState<RecurringFrequency>(initialData?.frequency || 'monthly');
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [note, setNote] = useState(initialData?.note || '');

  useEffect(() => {
    // Reset form when initialData changes
    if (initialData) {
      setName(initialData.name || category || '');
      setRecurringType(initialData.recurringType || 'other');
      setFrequency(initialData.frequency || 'monthly');
      setStartDate(initialData.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(initialData.endDate || '');
      setNote(initialData.note || '');
    } else {
      setName(category || '');
      setRecurringType('other');
      setFrequency('monthly');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setNote('');
    }
  }, [initialData, category]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('recurringTransactions.errorNameRequired', { defaultValue: 'Please enter a name for this recurring transaction' })
      );
      return;
    }

    if (!startDate) {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('recurringTransactions.errorStartDateRequired', { defaultValue: 'Please select a start date' })
      );
      return;
    }

    // Validate end date if provided
    if (endDate && new Date(endDate) < new Date(startDate)) {
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('recurringTransactions.errorEndDateBeforeStart', { defaultValue: 'End date must be after start date' })
      );
      return;
    }

    onSave({
      name: name.trim(),
      recurringType,
      frequency,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        {t('recurringTransactions.setupRecurring', { defaultValue: 'Setup Recurring Transaction' })}
      </Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Transaction Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.background }]}>
          <Text
            style={[
              styles.summaryLabel,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {t('recurringTransactions.transactionSummary', { defaultValue: 'Transaction Summary' })}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
          >
            {t(`transactions.type.${transactionType}`, { defaultValue: transactionType })}: {amount.toFixed(2)} {currency}
          </Text>
          {category && (
            <Text
              style={[
                styles.summaryValue,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.sm,
                },
              ]}
            >
              {t('addTransaction.category', { defaultValue: 'Category' })}: {category}
            </Text>
          )}
        </View>

        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            {t('recurringTransactions.name', { defaultValue: 'Name' })}
            <Text style={{ color: theme.colors.danger }}> *</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder={t('recurringTransactions.namePlaceholder', { defaultValue: 'e.g., Netflix Subscription' })}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Recurring Type */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            {t('recurringTransactions.type', { defaultValue: 'Type' })}
          </Text>
          <View style={styles.optionsGrid}>
            {RECURRING_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => setRecurringType(type.value)}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: recurringType === type.value ? theme.colors.accent + '20' : theme.colors.background,
                    borderColor: recurringType === type.value ? theme.colors.accent : theme.colors.border,
                    borderWidth: recurringType === type.value ? 2 : 1,
                  },
                ]}
              >
                <Text style={styles.optionEmoji}>{type.emoji}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: recurringType === type.value
                        ? theme.typography.fontWeight.semibold
                        : theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {t(`recurringTransactions.recurringType.${type.value}`, { defaultValue: type.label })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frequency */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            {t('recurringTransactions.frequency', { defaultValue: 'Frequency' })}
          </Text>
          <View style={styles.optionsRow}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                onPress={() => setFrequency(freq.value)}
                style={[
                  styles.frequencyButton,
                  {
                    backgroundColor: frequency === freq.value ? theme.colors.accent : theme.colors.background,
                    borderColor: frequency === freq.value ? theme.colors.accent : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.frequencyLabel,
                    {
                      color: frequency === freq.value ? '#FFFFFF' : theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: frequency === freq.value
                        ? theme.typography.fontWeight.semibold
                        : theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {t(`recurringTransactions.frequency.${freq.value}`, { defaultValue: freq.label })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Start Date */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            {t('recurringTransactions.startDate', { defaultValue: 'Start Date' })}
            <Text style={{ color: theme.colors.danger }}> *</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
              },
            ]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* End Date (Optional) */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            {t('recurringTransactions.endDate', { defaultValue: 'End Date' })}
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.fontSize.xs }}>
              {' '}({t('common.optional', { defaultValue: 'Optional' })})
            </Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
              },
            ]}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD (Optional)"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Note (Optional) */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            {t('recurringTransactions.note', { defaultValue: 'Note' })}
            <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.fontSize.xs }}>
              {' '}({t('common.optional', { defaultValue: 'Optional' })})
            </Text>
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
              },
            ]}
            value={note}
            onChangeText={setNote}
            placeholder={t('recurringTransactions.notePlaceholder', { defaultValue: 'Add a note...' })}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        style={[
          styles.saveButton,
          {
            backgroundColor: theme.colors.accent,
            marginTop: theme.spacing.md,
          },
        ]}
      >
        <Text
          style={[
            styles.saveButtonText,
            {
              color: '#FFFFFF',
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.semibold,
            },
          ]}
        >
          {t('common.save', { defaultValue: 'Save' })}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  summaryCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryLabel: {
    marginBottom: 4,
  },
  summaryValue: {
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionCard: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  optionLabel: {
    textAlign: 'center',
    fontSize: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyLabel: {
    textAlign: 'center',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    textAlign: 'center',
  },
});

