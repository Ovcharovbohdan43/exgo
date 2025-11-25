import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { useSettings } from '../../state/SettingsProvider';
import { formatCurrency } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { TransactionType } from '../../types';
import { getCategoryEmoji } from '../../utils/categoryEmojis';
import { useTranslation } from 'react-i18next';
import { getLocalizedCategory } from '../../utils/categoryLocalization';
import { useCreditProducts } from '../../state/CreditProductsProvider';

type ConfirmStepProps = {
  type: TransactionType;
  amount: number;
  category: string | null;
  creditProductId?: string | null;
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
  creditProductId,
  currency,
  createdAt,
  style,
}) => {
  const theme = useThemeStyles();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { getCreditProductById } = useCreditProducts();
  const customCategories = settings.customCategories || [];
  
  const creditProduct = creditProductId ? getCreditProductById(creditProductId) : null;

  // Debug: Log received props
  React.useEffect(() => {
    console.log('[ConfirmStep] Props received:', {
      type,
      amount,
      category,
      creditProductId,
      currency,
      hasCreditProduct: !!creditProduct,
      creditProductName: creditProduct?.name,
    });
  }, [type, amount, category, creditProductId, currency, creditProduct]);

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
          Error: Missing transaction data
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
            {t('addTransaction.type')}
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
            {t('addTransaction.amount')}
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
            {t('addTransaction.category')}
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
            {t('addTransaction.date')}
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

