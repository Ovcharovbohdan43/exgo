import React, { useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ViewStyle, TouchableOpacity, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/format';
import { formatDate, getDateKey, formatDateWithDay } from '../utils/date';
import { getCategoryEmoji } from '../utils/categoryEmojis';

type TransactionsListProps = {
  transactions: Transaction[];
  currency: string;
  maxItems?: number;
  onTransactionPress?: (transaction: Transaction) => void;
  onTransactionDelete?: (transaction: Transaction) => void;
  style?: ViewStyle;
};

type TransactionItemProps = {
  transaction: Transaction;
  currency: string;
  theme: ReturnType<typeof useThemeStyles>;
  onPress?: () => void;
  onDelete?: () => void;
};

type GroupedTransaction = {
  dateKey: string;
  dateLabel: string;
  transactions: Transaction[];
};

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, currency, theme, onPress, onDelete }) => {
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ${transaction.type} transaction?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            swipeableRef.current?.close();
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            swipeableRef.current?.close();
            onDelete?.();
          },
        },
      ],
    );
  };

  const renderRightActions = () => {
    return (
      <View style={[styles.rightAction, { backgroundColor: theme.colors.danger }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Text style={[styles.deleteButtonText, { color: theme.colors.background }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    );
  };
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

  const content = (
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
              styles.time,
              {
                color: theme.colors.textMuted,
                fontSize: theme.typography.fontSize.xs,
              },
            ]}
          >
            {(() => {
              const date = new Date(transaction.createdAt);
              if (Number.isNaN(date.getTime())) return '';
              return date.toLocaleTimeString(undefined, { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              });
            })()}
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
  );

  const cardContent = (
    <Card variant="outlined" padding="md" style={styles.transactionCard}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </Card>
  );

  // Wrap with Swipeable if onDelete is provided
  if (onDelete) {
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}
      >
        {cardContent}
      </Swipeable>
    );
  }

  return cardContent;
};

const DateHeader: React.FC<{ dateLabel: string; theme: ReturnType<typeof useThemeStyles> }> = ({
  dateLabel,
  theme,
}) => {
  return (
    <View style={styles.dateHeader}>
      <Text
        style={[
          styles.dateHeaderText,
          {
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
          },
        ]}
      >
        {dateLabel}
      </Text>
    </View>
  );
};

/**
 * TransactionsList - Component to display a list of recent transactions grouped by date
 * Shows transactions sorted by date (newest first) with date headers
 */
export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  currency,
  maxItems = 5,
  onTransactionPress,
  onTransactionDelete,
  style,
}) => {
  const theme = useThemeStyles();

  // Group transactions by date and sort
  const groupedTransactions = React.useMemo(() => {
    // Sort transactions by date (newest first)
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Group by date
    const groups = new Map<string, Transaction[]>();
    for (const tx of sorted) {
      const dateKey = getDateKey(tx.createdAt);
      if (!dateKey) continue;

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(tx);
    }

    // Convert to array and limit total items
    const result: GroupedTransaction[] = [];
    let totalCount = 0;

    for (const [dateKey, txs] of groups.entries()) {
      if (totalCount >= maxItems) break;

      const remaining = maxItems - totalCount;
      const transactionsToAdd = txs.slice(0, remaining);
      
      result.push({
        dateKey,
        dateLabel: formatDateWithDay(transactionsToAdd[0].createdAt),
        transactions: transactionsToAdd,
      });

      totalCount += transactionsToAdd.length;
    }

    return result;
  }, [transactions, maxItems]);

  // Flatten for FlatList
  const flatListData = React.useMemo(() => {
    const items: Array<{ type: 'header' | 'transaction'; data: any }> = [];
    
    for (const group of groupedTransactions) {
      items.push({ type: 'header', data: group.dateLabel });
      for (const tx of group.transactions) {
        items.push({ type: 'transaction', data: tx });
      }
    }

    return items;
  }, [groupedTransactions]);

  if (flatListData.length === 0) {
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
        data={flatListData}
        keyExtractor={(item, index) => 
          item.type === 'header' 
            ? `header-${item.data}` 
            : `transaction-${item.data.id}-${index}`
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <DateHeader dateLabel={item.data} theme={theme} />;
          }
          return (
            <TransactionItem 
              transaction={item.data} 
              currency={currency} 
              theme={theme}
              onPress={onTransactionPress ? () => onTransactionPress(item.data) : undefined}
              onDelete={onTransactionDelete ? () => onTransactionDelete(item.data) : undefined}
            />
          );
        }}
        ItemSeparatorComponent={({ leadingItem }) => {
          // Don't add separator after headers
          if (leadingItem?.type === 'header') {
            return <View style={styles.headerSeparator} />;
          }
          return <View style={styles.separator} />;
        }}
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
  time: {
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
  dateHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  dateHeaderText: {
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSeparator: {
    height: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
  },
  rightAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    marginVertical: 4,
    borderRadius: 12,
    minWidth: 100,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
