import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useSettings } from '../state/SettingsProvider';
import { useCreditProducts } from '../state/CreditProductsProvider';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/format';
import { formatDate } from '../utils/date';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { useTranslation } from 'react-i18next';

type LastTransactionPreviewProps = {
  transaction: Transaction | null;
  currency: string;
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * LastTransactionPreview - Component to display the last transaction
 */
export const LastTransactionPreview: React.FC<LastTransactionPreviewProps> = ({
  transaction,
  currency,
  onPress,
  style,
}) => {
  const theme = useThemeStyles();
  const { settings } = useSettings();
  const { getCreditProductById } = useCreditProducts();
  const { t, i18n } = useTranslation();
  const customCategories = settings.customCategories || [];
  
  // Get credit product name if this is a credit transaction
  const creditProduct = transaction.type === 'credit' && transaction.creditProductId 
    ? getCreditProductById(transaction.creditProductId) 
    : null;
  
  // Check if this is the first transaction for this credit product (creation transaction)
  // First transaction is when transaction amount equals principal (initial debt amount)
  // This indicates it's the transaction that created the credit product
  const isFirstCreditTransaction = transaction.type === 'credit' && creditProduct 
    ? Math.abs(transaction.amount - creditProduct.principal) < 0.01 // Allow small floating point differences
    : false;

  if (!transaction) {
    return (
      <Card variant="outlined" padding="md" style={style}>
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              {
                color: theme.colors.textMuted,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            No transactions yet
          </Text>
        </View>
      </Card>
    );
  }

  const getTypeColor = () => {
    switch (transaction.type) {
      case 'expense':
        return theme.colors.danger;
      case 'income':
        return theme.colors.positive;
      case 'saved':
        return theme.colors.accent;
      case 'credit':
        return theme.colors.warning || '#FFA500'; // Yellow color for credit transactions
      default:
        return theme.colors.textPrimary;
    }
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case 'expense':
        return 'Expense';
      case 'income':
        return 'Income';
      case 'saved':
        return 'Saved';
      case 'credit':
        return 'Credit';
      default:
        return '';
    }
  };

  const content = (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text
          style={[
            styles.typeLabel,
            {
              color: getTypeColor(),
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
            },
          ]}
        >
          {getTypeLabel()}
        </Text>
        <View style={styles.categoryRow}>
          <Text style={styles.categoryEmoji}>{getCategoryEmoji(transaction.category, customCategories)}</Text>
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
            {transaction.type === 'credit' && creditProduct
              ? creditProduct.name
              : (transaction.category || 'Uncategorized')}
          </Text>
        </View>
        <Text
          style={[
            styles.date,
            {
              color: theme.colors.textMuted,
              fontSize: theme.typography.fontSize.xs,
            },
          ]}
        >
          {formatDate(transaction.createdAt)}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <Text
          style={[
            styles.amount,
            {
              color: getTypeColor(),
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
            },
          ]}
        >
          {isFirstCreditTransaction 
            ? '' // No sign for first credit transaction (product creation)
            : (transaction.type === 'expense' || transaction.type === 'credit') ? '-' : '+'}
          {formatCurrency(Math.abs(transaction.amount), currency)}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card variant="outlined" padding="md" style={style}>
          {content}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card variant="outlined" padding="md" style={style}>
      {content}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  typeLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  category: {
    marginBottom: 4,
  },
  date: {
    marginTop: 2,
  },
  amount: {
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
});

