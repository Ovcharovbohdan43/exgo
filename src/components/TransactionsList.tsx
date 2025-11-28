import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ViewStyle, TouchableOpacity, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useSettings } from '../state/SettingsProvider';
import { useCreditProducts } from '../state/CreditProductsProvider';
import { useGoals } from '../state/GoalsProvider';
import { useRecurringTransactions } from '../state/RecurringTransactionsProvider';
import { Transaction, UpcomingTransaction } from '../types';
import { formatCurrency } from '../utils/format';
import { formatDate, getDateKey, formatDateWithDay } from '../utils/date';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { getTransactionAccessibilityLabel, BUTTON_HIT_SLOP } from '../utils/accessibility';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './states';
import { getLocalizedCategory } from '../utils/categoryLocalization';

type TransactionsListProps = {
  transactions: Transaction[];
  currency: string;
  maxItems?: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
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
  const { settings } = useSettings();
  const { getCreditProductById, creditProducts } = useCreditProducts();
  const { getGoalById } = useGoals();
  const { t } = useTranslation();
  const customCategories = settings.customCategories || [];
  
  // Get credit product name if this is a credit transaction
  const creditProduct = transaction.type === 'credit' && transaction.creditProductId 
    ? getCreditProductById(transaction.creditProductId) 
    : null;
  
  // Get credit card used for payment if this is an expense transaction
  // Check for both null and undefined, and ensure the ID is a valid string
  const paidByCreditCard = transaction.type === 'expense' && 
    transaction.paidByCreditProductId && 
    typeof transaction.paidByCreditProductId === 'string' &&
    transaction.paidByCreditProductId.trim() !== ''
    ? getCreditProductById(transaction.paidByCreditProductId) 
    : null;
  
  // Get goal name if this is a saved transaction
  const goal = transaction.type === 'saved' && transaction.goalId 
    ? getGoalById(transaction.goalId) 
    : null;
  
  // Debug: Log payment method info
  useEffect(() => {
    if (transaction.type === 'expense') {
      console.log('[TransactionItem] Expense transaction details:', {
        transactionId: transaction.id,
        paidByCreditProductId: transaction.paidByCreditProductId,
        paidByCreditProductIdType: typeof transaction.paidByCreditProductId,
        paidByCreditProductIdTruthy: !!transaction.paidByCreditProductId,
        creditCardFound: !!paidByCreditCard,
        creditCardName: paidByCreditCard?.name,
        category: transaction.category,
        allCreditProducts: creditProducts.length,
        willShowPaidBy: !!paidByCreditCard,
      });
    }
  }, [transaction.id, transaction.type, transaction.paidByCreditProductId, paidByCreditCard, transaction.category, creditProducts]);
  
  // Check if this is the first transaction for this credit product (creation transaction)
  // First transaction is when transaction amount equals principal (initial debt amount)
  // This indicates it's the transaction that created the credit product
  const isFirstCreditTransaction = transaction.type === 'credit' && creditProduct 
    ? Math.abs(transaction.amount - creditProduct.principal) < 0.01 // Allow small floating point differences
    : false;

  const handleDelete = () => {
    const typeLabel = t(`transactions.type.${transaction.type}`);
    Alert.alert(
      t('transactions.deleteTitle'),
      t('transactions.deleteConfirm', { type: typeLabel }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => {
            swipeableRef.current?.close();
          },
        },
        {
          text: t('common.delete'),
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
          accessible={true}
          accessibilityLabel={t('transactions.deleteAccessibility', { type: t(`transactions.type.${transaction.type}`) })}
          accessibilityRole="button"
          accessibilityHint={t('transactions.deleteHint')}
          hitSlop={BUTTON_HIT_SLOP}
        >
          <Text style={[styles.deleteButtonText, { color: theme.colors.background }]}>
            {t('common.delete')}
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
      case 'credit':
        return theme.colors.warning || '#FFA500'; // Yellow color for credit transactions
      default:
        return theme.colors.textPrimary;
    }
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case 'expense':
        return t('transactions.type.expense');
      case 'income':
        return t('transactions.type.income');
      case 'saved':
        return t('transactions.type.saved');
      case 'credit':
        return t('transactions.type.credit', { defaultValue: 'Credit' });
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
            <Text style={styles.categoryEmoji}>{getCategoryEmoji(transaction.category, customCategories)}</Text>
            <View style={{ flex: 1 }}>
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
                  : (transaction.category ? getLocalizedCategory(transaction.category) : t('transactions.uncategorized'))}
              </Text>
              {paidByCreditCard && (
                <Text
                  style={[
                    {
                      color: theme.colors.textMuted,
                      fontSize: theme.typography.fontSize.xs,
                      marginTop: 2,
                    },
                  ]}
                >
                  {t('transactions.paidBy', { defaultValue: 'Paid by' })} {paidByCreditCard.name}
                </Text>
              )}
              {goal && (
                <Text
                  style={[
                    {
                      color: theme.colors.textMuted,
                      fontSize: theme.typography.fontSize.xs,
                      marginTop: 2,
                    },
                  ]}
                >
                  {goal.emoji && `${goal.emoji} `}
                  {t('transactions.forGoal', { defaultValue: 'For goal' })}: {goal.name}
                </Text>
              )}
            </View>
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
            {isFirstCreditTransaction 
              ? '' // No sign for first credit transaction (product creation)
              : (transaction.type === 'expense' || transaction.type === 'credit') ? '-' : '+'}
            {formatCurrency(Math.abs(transaction.amount), currency)}
          </Text>
        </View>
      </View>
  );

  const accessibilityLabel = getTransactionAccessibilityLabel(
    transaction.type,
    transaction.category || t('transactions.uncategorized'),
    transaction.amount,
    currency,
    transaction.createdAt
  );

  const cardContent = (
    <Card variant="outlined" padding="md" style={styles.transactionCard}>
      {onPress ? (
        <TouchableOpacity 
          onPress={onPress} 
          activeOpacity={0.7}
          accessible={true}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityHint={t('transactions.editHint')}
          hitSlop={BUTTON_HIT_SLOP}
        >
          {content}
        </TouchableOpacity>
      ) : (
        <View accessible={true} accessibilityLabel={accessibilityLabel} accessibilityRole="text">
          {content}
        </View>
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
  maxItems,
  hasMore = false,
  onLoadMore,
  onTransactionPress,
  onTransactionDelete,
  style,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const { upcomingTransactions } = useRecurringTransactions();

  // Debug: Log received transactions
  React.useEffect(() => {
    console.log('[TransactionsList] Received transactions:', {
      count: transactions.length,
      transactionIds: transactions.map(tx => tx.id),
      hasMore,
    });
  }, [transactions, hasMore]);

  // Group transactions by date and sort
  // Note: transactions are already sorted by date (newest first) and limited by parent
  // Include i18n.language in dependencies to ensure dates are re-formatted when language changes
  const { i18n } = useTranslation();
  const groupedTransactions = React.useMemo(() => {
    console.log('[TransactionsList] Grouping transactions:', {
      inputCount: transactions.length,
    });
    
    // Ensure transactions are sorted by date and time (newest first)
    // Sort by full timestamp to ensure correct order
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    console.log('[TransactionsList] Sorted transactions (newest first):', {
      sortedCount: sorted.length,
      firstFew: sorted.slice(0, 3).map(tx => ({
        id: tx.id,
        date: tx.createdAt,
        dateKey: getDateKey(tx.createdAt),
      })),
    });
    
    // Group by date (maintaining sort order)
    const groups = new Map<string, Transaction[]>();
    for (const tx of sorted) {
      const dateKey = getDateKey(tx.createdAt);
      if (!dateKey) continue;

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      // Add to group (order is already correct from sorted array)
      groups.get(dateKey)!.push(tx);
    }
    
    // Sort transactions within each date group by time (newest first)
    // This ensures that within the same date, newer transactions appear first
    for (const [dateKey, txs] of groups.entries()) {
      txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Convert to array and sort groups by date (newest first)
    // Newer dates should appear first in the list
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      // Compare dateKeys directly (they're in YYYY-MM-DD format, so string comparison works)
      // b[0].localeCompare(a[0]) means: if b > a (newer date), return positive (b first)
      return b[0].localeCompare(a[0]);
    });

    console.log('[TransactionsList] Sorted groups (newest first):', {
      groupCount: sortedGroups.length,
      groupDates: sortedGroups.map(([dateKey]) => dateKey),
      firstFewGroups: sortedGroups.slice(0, 5).map(([dateKey, txs]) => ({
        dateKey,
        transactionCount: txs.length,
        firstTransactionDate: txs[0]?.createdAt,
      })),
    });

    // Convert to result format (no limit here, parent handles limiting)
    const result: GroupedTransaction[] = [];
    for (const [dateKey, txs] of sortedGroups) {
      result.push({
        dateKey,
        dateLabel: formatDateWithDay(txs[0].createdAt),
        transactions: txs, // Include all transactions for this date
      });
    }

    console.log('[TransactionsList] Grouped transactions:', {
      groupsCount: result.length,
      totalTransactions: result.reduce((sum, group) => sum + group.transactions.length, 0),
    });

    return result;
  }, [transactions, i18n.language]);

  // Flatten for FlatList (include upcoming transactions at the top)
  const flatListData = React.useMemo(() => {
    const items: Array<{ type: 'header' | 'transaction' | 'upcoming'; data: any }> = [];
    
    // Add upcoming transactions section at the top if there are any
    if (upcomingTransactions.length > 0) {
      items.push({
        type: 'header',
        data: t('recurringTransactions.upcoming', { defaultValue: 'Upcoming' }),
      });
      upcomingTransactions.forEach((upcoming) => {
        items.push({
          type: 'upcoming',
          data: upcoming,
        });
      });
      // Add separator after upcoming section
      items.push({
        type: 'header',
        data: t('transactions.recent', { defaultValue: 'Recent Transactions' }),
      });
    }
    
    for (const group of groupedTransactions) {
      items.push({ type: 'header', data: group.dateLabel });
      for (const tx of group.transactions) {
        items.push({ type: 'transaction', data: tx });
      }
    }

    console.log('[TransactionsList] FlatList data prepared:', {
      itemsCount: items.length,
      groupsCount: groupedTransactions.length,
    });
    
    return items;
  }, [groupedTransactions]);

  console.log('[TransactionsList] Rendering with flatListData:', {
    flatListDataLength: flatListData.length,
    hasData: flatListData.length > 0,
  });

  if (flatListData.length === 0) {
    return (
      <Card variant="outlined" padding="md" style={style}>
        <View 
          style={styles.emptyContainer}
          accessible={true}
          accessibilityLabel={t('transactions.noTransactions')}
          accessibilityRole="text"
        >
          <Text
            style={[
              styles.emptyText,
              {
                color: theme.colors.textMuted,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
            accessible={false}
            accessibilityElementsHidden={true}
          >
            {t('transactions.noTransactions')}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={style}>
      <FlatList
        data={flatListData}
        keyExtractor={(item, index) => {
          if (item.type === 'header') {
            return `header-${item.data}`;
          }
          if (item.type === 'upcoming') {
            return `upcoming-${item.data.id}-${index}`;
          }
          return `transaction-${item.data.id}-${index}`;
        }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <DateHeader dateLabel={item.data} theme={theme} />;
          }
          if (item.type === 'upcoming') {
            return (
              <UpcomingTransactionItem
                upcomingTransaction={item.data}
                currency={currency}
                theme={theme}
              />
            );
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
      
      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <TouchableOpacity
          onPress={onLoadMore}
          style={[
            styles.loadMoreButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          accessible={true}
          accessibilityLabel={t('transactions.loadMoreAccessibility')}
          accessibilityRole="button"
          accessibilityHint={t('transactions.loadMoreAccessibility')}
          hitSlop={BUTTON_HIT_SLOP}
        >
          <Text
            style={[
              styles.loadMoreText,
              {
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {t('home.loadMore')}
          </Text>
        </TouchableOpacity>
      )}
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
  loadMoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontWeight: '600',
  },
});
