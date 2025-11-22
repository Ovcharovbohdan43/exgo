import React, { useMemo, useEffect, useState, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
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

  // Calculate target values
  const targetSegments = useMemo(() => {
    // Clamp remaining at 0 for visual representation
    const clampedRemaining = Math.max(remaining, 0);
    const total = Math.max(spent + saved + clampedRemaining, 1);
    
    return [
      { value: spent / total, color: theme.colors.danger },
      { value: saved / total, color: theme.colors.positive },
      { value: clampedRemaining / total, color: theme.colors.accent },
    ];
  }, [remaining, saved, spent, theme.colors]);

  // Animated values for each segment
  const [animatedSegments, setAnimatedSegments] = useState(targetSegments);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  // Animate segments when values change
  useEffect(() => {
    // Clear any existing animation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    cancelledRef.current = false;

    setAnimatedSegments(prev => {
      // Check if values actually changed
      const hasChanged = targetSegments.some((target, index) => {
        const current = prev[index]?.value || 0;
        return Math.abs(target.value - current) > 0.001;
      });

      if (!hasChanged) {
        return targetSegments;
      }

      // Start animation
      const startTime = Date.now();
      const duration = 600; // ms
      const startValues = prev.map(s => s.value);

      const animate = () => {
        if (cancelledRef.current) return;

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);

        setAnimatedSegments(current => {
          if (cancelledRef.current) return current;

          const newSegments = current.map((prevSeg, index) => {
            const target = targetSegments[index];
            const start = startValues[index];
            const currentValue = start + (target.value - start) * eased;
            
            return {
              ...prevSeg,
              value: currentValue,
            };
          });

          // Continue animation if not complete
          if (progress < 1 && !cancelledRef.current) {
            timeoutRef.current = setTimeout(animate, 16); // ~60fps
          } else if (progress >= 1) {
            // Ensure final values are set
            return targetSegments;
          }

          return newSegments;
        });
      };

      timeoutRef.current = setTimeout(animate, 16);

      return prev; // Return current state to start animation
    });

    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [targetSegments]);

  const segments = animatedSegments;
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
