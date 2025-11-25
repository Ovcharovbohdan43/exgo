import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { MiniBudgetWithState } from '../types';
import { formatCurrency } from '../utils/format';
import { useTranslation } from 'react-i18next';

type MiniBudgetCardProps = {
  budget: MiniBudgetWithState;
  currency: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
};

export const MiniBudgetCard: React.FC<MiniBudgetCardProps> = ({
  budget,
  currency,
  onPress,
  onEdit,
  onDelete,
  style,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();

  // Calculate progress - can exceed 100% if over budget
  const progress = budget.limitAmount > 0 
    ? (budget.state.spentAmount / budget.limitAmount) * 100
    : 0;

  const getStatusColor = () => {
    switch (budget.state.state) {
      case 'over':
        return theme.colors.danger;
      case 'warning':
        return '#FFA500'; // Orange for warning
      case 'ok':
        return theme.colors.positive;
      default:
        return theme.colors.textSecondary;
    }
  };

  const statusColor = getStatusColor();

  return (
    <Card variant="outlined" padding="md" style={style}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${budget.name}, ${t('miniBudgets.spent')} ${formatCurrency(budget.state.spentAmount, currency)} ${t('miniBudgets.of')} ${formatCurrency(budget.limitAmount, currency)}`}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
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
              {budget.name}
            </Text>
            <Text
              style={[
                styles.status,
                {
                  color: statusColor,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.medium,
                },
              ]}
            >
              {t(`miniBudgets.status.${budget.state.state}`)}
            </Text>
          </View>
          <Text
            style={[
              styles.amount,
              {
                color: budget.state.remaining < 0 ? theme.colors.danger : theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
              },
            ]}
          >
            {budget.state.remaining < 0 ? '-' : ''}
            {formatCurrency(Math.abs(budget.state.remaining), currency)}
          </Text>
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
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <Text
            style={[
              styles.statText,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {formatCurrency(budget.state.spentAmount, currency)} {t('miniBudgets.of')}{' '}
            {formatCurrency(budget.limitAmount, currency)}
          </Text>
        </View>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <View style={styles.actions}>
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
                  {t('miniBudgets.edit')}
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
                  {t('miniBudgets.delete')}
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
  title: {
    marginBottom: 4,
  },
  status: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  amount: {
    textAlign: 'right',
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
    marginTop: 8,
  },
  statText: {
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionText: {
    fontWeight: '500',
  },
});

