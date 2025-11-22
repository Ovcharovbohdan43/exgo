import React, { useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeStyles } from '../theme/ThemeProvider';

type Props = {
  spent: number;
  saved: number;
  remaining: number;
  size?: number;
  strokeWidth?: number;
  onPress?: () => void;
  showLabels?: boolean;
  style?: ViewStyle;
};

const DonutChart: React.FC<Props> = ({
  spent,
  saved,
  remaining,
  size = 180,
  strokeWidth = 18,
  onPress,
  showLabels = false,
  style,
}) => {
  const theme = useThemeStyles();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    // Clamp remaining at 0 for visual representation
    const clampedRemaining = Math.max(remaining, 0);
    const total = Math.max(spent + saved + clampedRemaining, 1);
    
    return [
      { value: spent / total, color: theme.colors.danger },
      { value: saved / total, color: theme.colors.positive },
      { value: clampedRemaining / total, color: theme.colors.accent },
    ];
  }, [remaining, saved, spent, theme.colors]);

  let offset = 0;

  const chartContent = (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size} style={styles.svg}>
        {segments.map((segment, index) => {
          const dash = segment.value * circumference;
          const circle = (
            <Circle
              key={index}
              stroke={segment.color}
              fill="none"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return circle;
        })}
      </Svg>
      {showLabels && (
        <View style={styles.labels}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {remaining < 0 ? 'Over budget' : 'Remaining'}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chartContent}
      </TouchableOpacity>
    );
  }

  return chartContent;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  labels: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});

export default DonutChart;
