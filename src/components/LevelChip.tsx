import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useGamification } from '../state/GamificationProvider';
import { useTranslation } from 'react-i18next';

type LevelChipProps = {
  onPress?: () => void;
};

export const LevelChip: React.FC<LevelChipProps> = ({ onPress }) => {
  const theme = useThemeStyles();
  const { level } = useGamification();
  const { t } = useTranslation();

  // Calculate XP for next level
  const getXPForLevel = (lvl: number): number => lvl * 100;
  const currentLevelXP = getXPForLevel(level.level);
  const nextLevelXP = getXPForLevel(level.level + 1);
  const progressXP = level.xp - currentLevelXP;
  const requiredXP = nextLevelXP - currentLevelXP;
  const progressPercent = requiredXP > 0 ? (progressXP / requiredXP) * 100 : 100;

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
          styles.levelText,
          {
            color: theme.colors.accent,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.bold,
          },
        ]}
      >
        Lv {level.level}
      </Text>
      <View
        style={[
          styles.progressBar,
          {
            backgroundColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.accent,
              width: `${Math.min(progressPercent, 100)}%`,
            },
          ]}
        />
      </View>
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
    gap: 8,
    minWidth: 80,
  },
  levelText: {
    lineHeight: 20,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

