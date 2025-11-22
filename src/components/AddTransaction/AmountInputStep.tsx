import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { formatCurrency, getCurrencySymbol } from '../../utils/format';

type AmountInputStepProps = {
  amount: string;
  currency: string;
  onChange: (amount: string) => void;
  error?: string | null;
  style?: ViewStyle;
};

/**
 * AmountInputStep - Step for entering transaction amount
 * Formats input with currency prefix and validates positive numbers
 */
export const AmountInputStep: React.FC<AmountInputStepProps> = ({
  amount,
  currency,
  onChange,
  error,
  style,
}) => {
  const theme = useThemeStyles();
  const [displayValue, setDisplayValue] = useState(amount);

  // Update display value when amount prop changes
  useEffect(() => {
    setDisplayValue(amount);
  }, [amount]);

  const handleChange = (text: string) => {
    // Remove all non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleaned;
    
    setDisplayValue(formatted);
    onChange(formatted);
  };

  const handleBlur = () => {
    // Format on blur: remove trailing decimal point, ensure valid number
    const numValue = parseFloat(displayValue);
    if (isNaN(numValue) || numValue <= 0) {
      setDisplayValue('');
      onChange('');
    } else {
      // Keep up to 2 decimal places
      const formatted = numValue.toFixed(2).replace(/\.?0+$/, '');
      setDisplayValue(formatted);
      onChange(formatted);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);
  const numValue = parseFloat(displayValue);
  const isValid = !isNaN(numValue) && numValue > 0;

  return (
    <View style={style}>
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
        Amount
      </Text>
      
      <Card variant="outlined" padding="none" style={styles.inputContainer}>
        <View
          style={[
            styles.inputWrapper,
            {
              borderColor: error ? theme.colors.danger : theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.currencyPrefix,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.medium,
              },
            ]}
          >
            {currencySymbol}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
            value={displayValue}
            onChangeText={handleChange}
            onBlur={handleBlur}
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
          />
        </View>
      </Card>

      {displayValue && isValid && (
        <Text
          style={[
            styles.preview,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {formatCurrency(numValue, currency)}
        </Text>
      )}

      {error && (
        <Text
          style={[
            styles.error,
            {
              color: theme.colors.danger,
              fontSize: theme.typography.fontSize.sm,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  currencyPrefix: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 0,
    margin: 0,
  },
  preview: {
    textAlign: 'center',
  },
  error: {
    textAlign: 'center',
  },
});

