import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useGamification } from '../state/GamificationProvider';
import { useTranslation } from 'react-i18next';

type StreakChipProps = {
  onPress?: () => void;
};

export const StreakChip: React.FC<StreakChipProps> = ({ onPress }) => {
  const theme = useThemeStyles();
  const { streak } = useGamification();
  const { t } = useTranslation();

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.emoji,
          {
            fontSize: theme.typography.fontSize.md,
          },
        ]}
      >
        🔥
      </Text>
      <Text
        style={[
          styles.text,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
          },
        ]}
      >
        {streak.current} {t('achievements.streak', { defaultValue: 'days' })}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  emoji: {
    lineHeight: 20,
  },
  text: {
    lineHeight: 20,
  },
});

