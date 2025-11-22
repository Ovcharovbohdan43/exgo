import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeStyles } from '../theme/ThemeProvider';
import DonutChart from './DonutChart';

type Props = {
  spent: number;
  saved: number;
  remaining: number;
  size?: number;
  strokeWidth?: number;
  style?: ViewStyle;
};

/**
 * DonutChartWithPercentages - Large donut chart with percentage labels
 * Shows percentages for each segment (spent, saved, remaining)
 */
export const DonutChartWithPercentages: React.FC<Props> = ({
  spent,
  saved,
  remaining,
  size = 240,
  strokeWidth = 24,
  style,
}) => {
  const theme = useThemeStyles();
  const clampedRemaining = Math.max(remaining, 0);
  const total = Math.max(spent + saved + clampedRemaining, 1);

  const percentages = useMemo(() => {
    return {
      spent: (spent / total) * 100,
      saved: (saved / total) * 100,
      remaining: (clampedRemaining / total) * 100,
    };
  }, [spent, saved, clampedRemaining, total]);

  return (
    <View style={[styles.container, style]}>
      <DonutChart
        spent={spent}
        saved={saved}
        remaining={remaining}
        size={size}
        strokeWidth={strokeWidth}
        showLabels={false}
      />
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
          <Text
            style={[
              styles.legendText,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            Spent: {percentages.spent.toFixed(1)}%
          </Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.positive }]} />
          <Text
            style={[
              styles.legendText,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            Saved: {percentages.saved.toFixed(1)}%
          </Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
          <Text
            style={[
              styles.legendText,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {remaining < 0 ? 'Over budget' : 'Remaining'}: {percentages.remaining.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  legend: {
    marginTop: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontWeight: '500',
  },
});

