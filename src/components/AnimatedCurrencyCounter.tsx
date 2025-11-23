import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, TextStyle, Animated, Easing } from 'react-native';
import { formatCurrency, getCurrencySymbol } from '../utils/format';

type Props = {
  value: number;
  currency?: string;
  duration?: number;
  style?: TextStyle;
  color?: string;
  animationTrigger?: number; // Trigger to reset animation
};

/**
 * AnimatedCurrencyCounter - Animated counter for currency values
 * Animates from 0 (or previous value) to target value with smooth counting effect
 */
export const AnimatedCurrencyCounter: React.FC<Props> = ({
  value,
  currency = 'USD',
  duration = 1500, // Slower animation
  style,
  color,
  animationTrigger,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const prevValueRef = useRef(0);
  const isFirstMountRef = useRef(true);
  const prevAnimationTriggerRef = useRef(animationTrigger);

  // Use listener to update displayed value
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Check if animation trigger changed (force reset)
    const triggerChanged = animationTrigger !== undefined && 
                          animationTrigger !== prevAnimationTriggerRef.current;
    
    if (triggerChanged) {
      prevAnimationTriggerRef.current = animationTrigger;
      prevValueRef.current = 0;
      isFirstMountRef.current = true;
    }

    // On first mount or trigger change, start from 0
    const startValue = (isFirstMountRef.current || triggerChanged) ? 0 : prevValueRef.current;
    
    // Set initial value
    animatedValue.setValue(startValue);
    
    // Animate to target value
    Animated.timing(animatedValue, {
      toValue: value,
      duration: (isFirstMountRef.current || triggerChanged) ? duration : Math.min(duration, 800),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // We need to format the value, so can't use native driver
    }).start(() => {
      prevValueRef.current = value;
      isFirstMountRef.current = false;
    });
  }, [value, animatedValue, duration, animationTrigger]);

  useEffect(() => {
    const listener = animatedValue.addListener(({ value: currentValue }) => {
      setDisplayValue(currentValue);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue]);

  // Check if animation is complete (within 0.01 of target value)
  const isComplete = Math.abs(displayValue - value) < 0.01;
  
  // Format value: show whole numbers during animation, full format when complete
  const formatDisplayValue = (val: number): string => {
    const wholeNumber = Math.round(val);
    
    if (isComplete) {
      // Show full currency format when animation is complete
      return formatCurrency(wholeNumber, currency);
    } else {
      // Show whole numbers without decimals during animation
      // Use currency formatting but with 0 decimal places
      return Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(wholeNumber);
    }
  };

  return (
    <Text style={[style, color ? { color } : undefined]}>
      {formatDisplayValue(displayValue)}
    </Text>
  );
};

