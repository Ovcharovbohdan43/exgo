import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { useSettings } from '../../state/SettingsProvider';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { TransactionType } from '../../types';
import { getCategoryEmoji } from '../../utils/categoryEmojis';

type ConfirmStepProps = {
  type: TransactionType;
  amount: number;
  category: string | null;
  currency: string;
  createdAt: string;
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
  currency,
  createdAt,
  style,
}) => {
  const theme = useThemeStyles();
  const { settings } = useSettings();
  const customCategories = settings.customCategories || [];

  const getTypeLabel = () => {
    switch (type) {
      case 'expense':
        return 'Expense';
      case 'income':
        return 'Income';
      case 'saved':
        return 'Saved';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'expense':
        return theme.colors.danger;
      case 'income':
        return theme.colors.positive;
      case 'saved':
        return theme.colors.accent;
    }
  };

  const typeColor = getTypeColor();

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
        Confirm Transaction
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
            Type
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
            Amount
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
            Category
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
              {category || 'N/A'}
            </Text>
          </View>
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
            Date
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
});

