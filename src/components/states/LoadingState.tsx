/**
 * LoadingState Component
 * 
 * Displays a loading state with spinner and optional message.
 * Used when data is being loaded or processed.
 * 
 * @module components/states/LoadingState
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useThemeStyles } from '../../theme/ThemeProvider';

export type LoadingStateProps = {
  /**
   * Optional message to display below spinner
   */
  message?: string;
  
  /**
   * Custom style
   */
  style?: ViewStyle;
  
  /**
   * Size of the activity indicator
   */
  size?: 'small' | 'large';
  
  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
};

/**
 * LoadingState - Component for displaying loading states
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  style,
  size = 'large',
  accessibilityLabel = 'Loading',
}) => {
  const theme = useThemeStyles();

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator
        size={size}
        color={theme.colors.accent}
        accessible={false}
        accessibilityElementsHidden={true}
      />
      {message && (
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.md,
              marginTop: theme.spacing.md,
            },
          ]}
          accessible={false}
          accessibilityElementsHidden={true}
        >
          {message}
        </Text>
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
  message: {
    textAlign: 'center',
  },
});


