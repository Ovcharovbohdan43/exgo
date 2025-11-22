import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useThemeStyles } from '../../theme/ThemeProvider';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  variant?: 'default' | 'overline';
};

/**
 * SectionHeader - Reusable section header component
 * 
 * @param variant - 'default' for regular heading, 'overline' for uppercase small text
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  style,
  titleStyle,
  subtitleStyle,
  variant = 'default',
}) => {
  const theme = useThemeStyles();

  const isOverline = variant === 'overline';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Text
          style={[
            isOverline ? styles.overline : styles.title,
            {
              color: isOverline ? theme.colors.textSecondary : theme.colors.textPrimary,
              fontSize: isOverline
                ? theme.typography.fontSize.xs
                : theme.typography.fontSize.lg,
              fontWeight: isOverline
                ? theme.typography.fontWeight.medium
                : theme.typography.fontWeight.semibold,
              letterSpacing: isOverline
                ? theme.typography.letterSpacing.wider
                : theme.typography.letterSpacing.normal,
            },
            titleStyle,
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              },
              subtitleStyle,
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  overline: {
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subtitle: {
    marginTop: 2,
  },
  action: {
    marginLeft: 12,
  },
});

