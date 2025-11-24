import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';

type SummaryCardProps = {
  label: string;
  value: string;
  variant?: 'default' | 'positive' | 'negative' | 'neutral';
  style?: ViewStyle;
};

/**
 * SummaryCard - Card component for displaying summary statistics
 * 
 * @param variant - Color variant: 'default', 'positive' (green), 'negative' (red), 'neutral' (gray)
 */
export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  variant = 'default',
  style,
}) => {
  const theme = useThemeStyles();

  const getVariantColor = () => {
    switch (variant) {
      case 'positive':
        return theme.colors.positive;
      case 'negative':
        return theme.colors.danger;
      case 'neutral':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textPrimary;
    }
  };

  return (
    <Card variant="outlined" padding="md" style={style}>
      <View style={styles.content}>
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
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            {
              color: getVariantColor(),
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'flex-start',
  },
  label: {
    marginBottom: 4,
  },
  value: {
    marginTop: 2,
  },
});


