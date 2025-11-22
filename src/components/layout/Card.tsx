import React from 'react';
import { View, ViewStyle, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useThemeStyles } from '../../theme/ThemeProvider';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
} & Omit<TouchableOpacityProps, 'style' | 'onPress' | 'disabled'>;

/**
 * Card - Reusable card component with variants
 * 
 * @param variant - 'default' (flat), 'elevated' (with shadow), 'outlined' (with border)
 * @param padding - Internal padding size
 * @param onPress - Makes card pressable if provided
 */
export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'md',
  disabled = false,
  ...touchableProps
}) => {
  const theme = useThemeStyles();

  const paddingValue =
    padding === 'none'
      ? 0
      : padding === 'sm'
        ? theme.spacing.sm
        : padding === 'lg'
          ? theme.spacing.lg
          : theme.spacing.md;

  const baseStyle: ViewStyle = {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    padding: paddingValue,
  };

  const variantStyle: ViewStyle =
    variant === 'elevated'
      ? { ...baseStyle, ...theme.shadows.md }
      : variant === 'outlined'
        ? {
            ...baseStyle,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }
        : baseStyle;

  const cardStyle: ViewStyle[] = [styles.card, variantStyle];

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[...cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

