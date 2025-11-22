import React from 'react';
import { View, Text, StyleSheet, FlatList, ViewStyle } from 'react-native';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/format';
import { formatDate } from '../utils/date';
import { getCategoryEmoji } from '../utils/categoryEmojis';

type TransactionsListProps = {
  transactions: Transaction[];
  currency: string;
  maxItems?: number;
  style?: ViewStyle;
};

type TransactionItemProps = {
  transaction: Transaction;
  currency: string;
  theme: ReturnType<typeof useThemeStyles>;
};

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, currency, theme }) => {
  const getTypeColor = () => {
    switch (transaction.type) {
      case 'expense':
        return theme.colors.danger;
      case 'income':
        return theme.colors.positive;
      case 'saved':
        return theme.colors.accent;
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
      default:
        return '';
    }
  };

  const typeColor = getTypeColor();

  return (
    <Card variant="outlined" padding="md" style={styles.transactionCard}>
      <View style={styles.container}>
        <View style={styles.leftSection}>
          <Text
            style={[
              styles.typeLabel,
              {
                color: typeColor,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium,
              },
            ]}
          >
            {getTypeLabel()}
          </Text>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryEmoji}>{getCategoryEmoji(transaction.category)}</Text>
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
              {transaction.category || 'Uncategorized'}
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
                color: typeColor,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
              },
            ]}
          >
            {transaction.type === 'expense' ? '-' : '+'}
            {formatCurrency(Math.abs(transaction.amount), currency)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

/**
 * TransactionsList - Component to display a list of recent transactions
 * Shows transactions sorted by date (newest first)
 */
export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  currency,
  maxItems = 5,
  style,
}) => {
  const theme = useThemeStyles();

  // Sort transactions by date (newest first) and limit to maxItems
  const sortedTransactions = React.useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, maxItems);
  }, [transactions, maxItems]);

  if (sortedTransactions.length === 0) {
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

  return (
    <View style={style}>
      <FlatList
        data={sortedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem transaction={item} currency={currency} theme={theme} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  transactionCard: {
    marginBottom: 0,
  },
  separator: {
    height: 8,
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

