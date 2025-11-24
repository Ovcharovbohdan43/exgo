/**
 * EmptyState Component
 * 
 * Displays an empty state with optional icon, title, message, and action button.
 * Used when there's no data to display (e.g., no transactions, no categories).
 * 
 * @module components/states/EmptyState
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useThemeStyles } from '../../theme/ThemeProvider';

export type EmptyStateProps = {
  /**
   * Optional emoji or icon to display
   */
  icon?: string;
  
  /**
   * Title text
   */
  title: string;
  
  /**
   * Description/message text
   */
  message?: string;
  
  /**
   * Optional action button
   */
  actionLabel?: string;
  onAction?: () => void;
  
  /**
   * Custom style
   */
  style?: ViewStyle;
  
  /**
   * Accessibility label for the container
   */
  accessibilityLabel?: string;
};

/**
 * EmptyState - Component for displaying empty states
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
  accessibilityLabel,
}) => {
  const theme = useThemeStyles();

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="text"
    >
      {icon && (
        <Text
          style={styles.icon}
          accessible={false}
          accessibilityElementsHidden={true}
        >
          {icon}
        </Text>
      )}
      
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        ]}
        accessible={false}
        accessibilityElementsHidden={true}
      >
        {title}
      </Text>
      
      {message && (
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.md,
            },
          ]}
          accessible={false}
          accessibilityElementsHidden={true}
        >
          {message}
        </Text>
      )}
      
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[
            styles.actionButton,
            {
              backgroundColor: theme.colors.accent,
              marginTop: theme.spacing.lg,
            },
          ]}
          accessible={true}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          accessibilityHint={`Tap to ${actionLabel.toLowerCase()}`}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text
            style={[
              styles.actionButtonText,
              {
                color: theme.colors.background,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
            accessible={false}
            accessibilityElementsHidden={true}
          >
            {actionLabel}
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
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    textAlign: 'center',
  },
});


