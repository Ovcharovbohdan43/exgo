import React, { useMemo, useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeStyles } from '../theme/ThemeProvider';
import { AnimatedCurrencyCounter } from './AnimatedCurrencyCounter';

type Props = {
  spent: number;
  saved: number;
  remaining: number;
  size?: number;
  strokeWidth?: number;
  onPress?: () => void;
  showLabels?: boolean;
  style?: ViewStyle;
  centerLabel?: string; // Optional label to display in the center (string)
  centerLabelValue?: number; // Optional numeric value for animated counter
  centerLabelCurrency?: string; // Currency code for animated counter
  centerLabelColor?: string; // Optional color for center label
  centerSubLabel?: string; // Optional sub-label to display below center label
  centerSubLabelColor?: string; // Optional color for sub-label
  animationTrigger?: number; // Trigger to reset and restart animation
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
  centerLabel,
  centerLabelValue,
  centerLabelCurrency,
  centerLabelColor,
  centerSubLabel,
  centerSubLabelColor,
  animationTrigger,
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

  // Animated values for each segment (0 to 1)
  const animatedValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // State to hold current animated segment values for rendering
  // Initialize with zero values for smooth initial animation
  const [animatedSegments, setAnimatedSegments] = useState(() =>
    targetSegments.map(seg => ({ ...seg, value: 0 }))
  );

  // Store previous values to animate from
  const prevValuesRef = useRef([0, 0, 0]);
  const isMountedRef = useRef(false);

  // Update state when animated values change
  useEffect(() => {
    const listeners = animatedValues.map((animatedValue, index) => {
      return animatedValue.addListener(({ value }) => {
        setAnimatedSegments(prev => {
          const newSegments = [...prev];
          if (newSegments[index]) {
            newSegments[index] = {
              ...newSegments[index],
              value,
            };
          } else {
            newSegments[index] = {
              ...targetSegments[index],
              value,
            };
          }
          return newSegments;
        });
      });
    });

    return () => {
      animatedValues.forEach((animatedValue, index) => {
        animatedValue.removeListener(listeners[index]);
      });
    };
  }, [animatedValues, targetSegments]);

  // Update segment colors when target segments change
  useEffect(() => {
    setAnimatedSegments(prev => {
      return prev.map((segment, index) => ({
        ...segment,
        color: targetSegments[index]?.color || segment.color,
      }));
    });
  }, [targetSegments]);

  // Store previous animation trigger to detect changes
  const prevAnimationTriggerRef = useRef(animationTrigger);

  // Animate segments when values change or animationTrigger changes
  useEffect(() => {
    // Check if animation trigger changed (force reset)
    const triggerChanged = animationTrigger !== undefined && 
                          animationTrigger !== prevAnimationTriggerRef.current;
    
    if (triggerChanged) {
      prevAnimationTriggerRef.current = animationTrigger;
      // Reset to 0 and animate from scratch
      prevValuesRef.current = [0, 0, 0];
      isMountedRef.current = false;
    }

    // Check if values actually changed
    const hasChanged = targetSegments.some((target, index) => {
      const current = prevValuesRef.current[index] || 0;
      return Math.abs(target.value - current) > 0.001;
    });

    if (!hasChanged && isMountedRef.current && !triggerChanged) {
      return;
    }

    // Start animations for each segment
    const animations = targetSegments.map((target, index) => {
      const startValue = triggerChanged ? 0 : (isMountedRef.current ? (prevValuesRef.current[index] || 0) : 0);
      animatedValues[index].setValue(startValue);
      
      return Animated.timing(animatedValues[index], {
        toValue: target.value,
        duration: triggerChanged || !isMountedRef.current ? 1000 : 800, // Longer on initial mount or reset
        easing: Easing.out(Easing.cubic), // Smooth ease-out curve
        useNativeDriver: false, // Can't use native driver for SVG
      });
    });

    // Run all animations in parallel
    Animated.parallel(animations).start(() => {
      // Update previous values after animation completes
      prevValuesRef.current = targetSegments.map(s => s.value);
      isMountedRef.current = true;
    });
  }, [targetSegments, animatedValues, animationTrigger]);

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
      <View style={styles.labels}>
        {centerLabelValue !== undefined ? (
          <>
            <AnimatedCurrencyCounter
              value={centerLabelValue}
              currency={centerLabelCurrency}
              duration={1500}
              animationTrigger={animationTrigger}
              style={[
                styles.centerLabel,
                {
                  color: centerLabelColor || theme.colors.textPrimary,
                  fontSize: (theme.typography.fontSize.display || 32) * 0.8, // 20% smaller
                  fontWeight: theme.typography.fontWeight.bold,
                },
              ]}
            />
            {centerSubLabel && (
              <Text
                style={[
                  styles.centerSubLabel,
                  {
                    color: centerSubLabelColor || theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  },
                ]}
              >
                {centerSubLabel}
              </Text>
            )}
          </>
        ) : centerLabel ? (
          <>
            <Text
              style={[
                styles.centerLabel,
                {
                  color: centerLabelColor || theme.colors.textPrimary,
                  fontSize: (theme.typography.fontSize.display || 32) * 0.8, // 20% smaller
                  fontWeight: theme.typography.fontWeight.bold,
                },
              ]}
            >
              {centerLabel}
            </Text>
            {centerSubLabel && (
              <Text
                style={[
                  styles.centerSubLabel,
                  {
                    color: centerSubLabelColor || theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  },
                ]}
              >
                {centerSubLabel}
              </Text>
            )}
          </>
        ) : showLabels ? (
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
        ) : null}
      </View>
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
  centerLabel: {
    textAlign: 'center',
  },
  centerSubLabel: {
    textAlign: 'center',
    marginTop: 4,
  },
});

export default DonutChart;
