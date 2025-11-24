/**
 * ErrorState Component
 * 
 * Displays an error state with message and optional retry button.
 * Used when an error occurs and user action is needed.
 * 
 * @module components/states/ErrorState
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useThemeStyles } from '../../theme/ThemeProvider';

export type ErrorStateProps = {
  /**
   * Error title
   */
  title?: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Optional retry action
   */
  onRetry?: () => void;
  retryLabel?: string;
  
  /**
   * Custom style
   */
  style?: ViewStyle;
  
  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
};

/**
 * ErrorState - Component for displaying error states
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  style,
  accessibilityLabel,
}) => {
  const theme = useThemeStyles();

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel || `${title}. ${message}`}
      accessibilityRole="alert"
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.danger,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        ]}
        accessible={false}
        accessibilityElementsHidden={true}
      >
        {title}
      </Text>
      
      <Text
        style={[
          styles.message,
          {
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.md,
            marginTop: theme.spacing.sm,
          },
        ]}
        accessible={false}
        accessibilityElementsHidden={true}
      >
        {message}
      </Text>
      
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={[
            styles.retryButton,
            {
              backgroundColor: theme.colors.accent,
              marginTop: theme.spacing.lg,
            },
          ]}
          accessible={true}
          accessibilityLabel={retryLabel}
          accessibilityRole="button"
          accessibilityHint="Tap to retry the operation"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text
            style={[
              styles.retryButtonText,
              {
                color: theme.colors.background,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
            accessible={false}
            accessibilityElementsHidden={true}
          >
            {retryLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    textAlign: 'center',
  },
});


