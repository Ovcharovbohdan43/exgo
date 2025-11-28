import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useSettings } from '../state/SettingsProvider';
import { UpcomingTransaction } from '../types';
import { formatCurrency } from '../utils/format';
import { formatDate } from '../utils/date';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { useTranslation } from 'react-i18next';
import { getLocalizedCategory } from '../utils/categoryLocalization';

type UpcomingTransactionItemProps = {
  upcomingTransaction: UpcomingTransaction;
  currency: string;
  theme: ReturnType<typeof useThemeStyles>;
  onPress?: () => void;
};

export const UpcomingTransactionItem: React.FC<UpcomingTransactionItemProps> = ({
  upcomingTransaction,
  currency,
  theme,
  onPress,
}) => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const customCategories = settings.customCategories || [];

  const getDaysUntilLabel = () => {
    if (upcomingTransaction.daysUntil === 0) {
      return t('recurringTransactions.today', { defaultValue: 'Today' });
    } else if (upcomingTransaction.daysUntil === 1) {
      return t('recurringTransactions.tomorrow', { defaultValue: 'Tomorrow' });
    } else {
      return t('recurringTransactions.daysUntil', {
        defaultValue: '{{days}} days until',
        days: upcomingTransaction.daysUntil,
      });
    }
  };

  const typeColor = upcomingTransaction.type === 'expense' 
    ? theme.colors.danger 
    : upcomingTransaction.type === 'income'
    ? theme.colors.positive
    : theme.colors.accent;

  return (
    <Card
      variant="outlined"
      padding="md"
      style={[
        styles.transactionCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          opacity: 0.6, // Semi-transparent for upcoming transactions
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.container}>
        <View style={styles.leftSection}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.upcomingLabel,
                {
                  color: theme.colors.accent,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                },
              ]}
            >
              {t('recurringTransactions.upcoming', { defaultValue: 'Upcoming' })}
            </Text>
            <Text
              style={[
                styles.daysUntil,
                {
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium,
                },
              ]}
            >
              {getDaysUntilLabel()}
            </Text>
          </View>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryEmoji}>
              {getCategoryEmoji(upcomingTransaction.category, customCategories)}
            </Text>
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
                {upcomingTransaction.name}
              </Text>
              <Text
                style={[
                  styles.scheduledDate,
                  {
                    color: theme.colors.textMuted,
                    fontSize: theme.typography.fontSize.xs,
                    marginTop: 2,
                  },
                ]}
              >
                {t('recurringTransactions.scheduledFor', { defaultValue: 'Scheduled for' })}:{' '}
                {formatDate(upcomingTransaction.scheduledDate)}
              </Text>
            </View>
          </View>
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
            {upcomingTransaction.type === 'expense' ? '-' : '+'}
            {formatCurrency(Math.abs(upcomingTransaction.amount), currency)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  transactionCard: {
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  upcomingLabel: {
    textTransform: 'uppercase',
  },
  daysUntil: {
    // Styles applied inline
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  category: {
    // Styles applied inline
  },
  scheduledDate: {
    // Styles applied inline
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    // Styles applied inline
  },
});

