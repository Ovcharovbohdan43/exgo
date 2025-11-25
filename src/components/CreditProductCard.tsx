import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { CreditProduct } from '../types';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';

type CreditProductCardProps = {
  product: CreditProduct;
  currency: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
};

export const CreditProductCard: React.FC<CreditProductCardProps> = ({
  product,
  currency,
  onPress,
  onEdit,
  onDelete,
  style,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();

  // Calculate total owed (remaining balance + accrued interest)
  const totalOwed = product.remainingBalance + product.accruedInterest;

  // Calculate progress - percentage paid off
  // Progress = (totalPaid / principal) * 100
  const progress = product.principal > 0 
    ? Math.min((product.totalPaid / product.principal) * 100, 100)
    : 0;

  // Calculate percentage remaining
  const remainingPercentage = product.principal > 0
    ? (totalOwed / product.principal) * 100
    : 0;

  const getStatusColor = () => {
    switch (product.status) {
      case 'paid_off':
        return theme.colors.positive;
      case 'overdue':
        return theme.colors.danger;
      case 'active':
        return theme.colors.accent;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = () => {
    switch (product.status) {
      case 'paid_off':
        return t('creditProducts.status.paid_off', { defaultValue: 'Paid Off' });
      case 'overdue':
        return t('creditProducts.status.overdue', { defaultValue: 'Overdue' });
      case 'active':
        return t('creditProducts.status.active', { defaultValue: 'Active' });
      default:
        return product.status;
    }
  };

  const getCreditTypeLabel = () => {
    switch (product.creditType) {
      case 'credit_card':
        return t('creditProducts.type.credit_card', { defaultValue: 'Credit Card' });
      case 'fixed_loan':
        return t('creditProducts.type.fixed_loan', { defaultValue: 'Fixed Loan' });
      case 'installment':
        return t('creditProducts.type.installment', { defaultValue: 'Installment' });
      default:
        return product.creditType;
    }
  };

  const statusColor = getStatusColor();

  // Calculate monthly interest estimate
  const monthlyInterestRate = product.apr / 100 / 12;
  const monthlyInterestEstimate = product.remainingBalance * monthlyInterestRate;

  return (
    <Card variant="outlined" padding="md" style={style}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${t('creditProducts.remaining', { defaultValue: 'Remaining' })} ${formatCurrency(totalOwed, currency)}`}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.emoji}>💳</Text>
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight: theme.typography.fontWeight.semibold,
                  },
                ]}
              >
                {product.name}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text
                style={[
                  styles.metaText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.xs,
                  },
                ]}
              >
                {getCreditTypeLabel()}
              </Text>
              <Text
                style={[
                  styles.metaText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.xs,
                  },
                ]}
              >
                • {product.apr.toFixed(2)}% APR
              </Text>
            </View>
            <Text
              style={[
                styles.status,
                {
                  color: statusColor,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium,
                  marginTop: 4,
                },
              ]}
            >
              {getStatusLabel()}
            </Text>
          </View>
          <View style={styles.headerRight}>
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
              {formatCurrency(totalOwed, currency)}
            </Text>
            <Text
              style={[
                styles.amountLabel,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                },
              ]}
            >
              {t('creditProducts.totalOwed', { defaultValue: 'Total Owed' })}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View
          style={[
            styles.progressContainer,
            {
              backgroundColor: theme.colors.surface,
              marginTop: 12,
            },
          ]}
        >
          <View
            style={[
              styles.progressBar,
              {
                width: `${progress}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <Text
              style={[
                styles.statLabel,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.sm,
                },
              ]}
            >
              {t('creditProducts.paid', { defaultValue: 'Paid' })}
            </Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                },
              ]}
            >
              {formatCurrency(product.totalPaid, currency)} ({progress.toFixed(1)}%)
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text
              style={[
                styles.statLabel,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.sm,
                },
              ]}
            >
              {t('creditProducts.remaining', { defaultValue: 'Remaining' })}
            </Text>
            <Text
              style={[
                styles.statValue,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                },
              ]}
            >
              {formatCurrency(totalOwed, currency)} ({remainingPercentage.toFixed(1)}%)
            </Text>
          </View>
          {product.accruedInterest > 0 && (
            <View style={styles.statRow}>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  },
                ]}
              >
                {t('creditProducts.accruedInterest', { defaultValue: 'Accrued Interest' })}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.colors.warning || '#FFA500',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {formatCurrency(product.accruedInterest, currency)}
              </Text>
            </View>
          )}
          {product.creditType === 'credit_card' && monthlyInterestEstimate > 0 && (
            <View style={styles.statRow}>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  },
                ]}
              >
                {t('creditProducts.monthlyInterestEstimate', { defaultValue: 'Monthly Interest Est.' })}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  },
                ]}
              >
                ~{formatCurrency(monthlyInterestEstimate, currency)}
              </Text>
            </View>
          )}
          {product.monthlyMinimumPayment && (
            <View style={styles.statRow}>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  },
                ]}
              >
                {t('creditProducts.minimumPayment', { defaultValue: 'Min. Payment' })}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {formatCurrency(product.monthlyMinimumPayment, currency)}
                {product.dueDate && ` (due ${product.dueDate})`}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
            {onEdit && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={styles.actionButton}
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: theme.colors.accent,
                      fontSize: theme.typography.fontSize.sm,
                    },
                  ]}
                >
                  {t('creditProducts.edit', { defaultValue: 'Edit' })}
                </Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={styles.actionButton}
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: theme.colors.danger,
                      fontSize: theme.typography.fontSize.sm,
                    },
                  ]}
                >
                  {t('creditProducts.delete', { defaultValue: 'Delete' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  emoji: {
    fontSize: 20,
  },
  title: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontWeight: '500',
  },
  status: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    textAlign: 'right',
  },
  amountLabel: {
    textAlign: 'right',
    marginTop: 2,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  stats: {
    marginTop: 12,
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontWeight: '500',
  },
  statValue: {
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionText: {
    fontWeight: '500',
  },
});

