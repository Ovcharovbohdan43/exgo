import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useGamification } from '../state/GamificationProvider';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/layout';
import { StreakChip } from '../components/StreakChip';
import { LevelChip } from '../components/LevelChip';
import { BadgeTier, BadgeCategory, Badge } from '../types';

const AchievementsScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { streak, badges, challenges, level } = useGamification();
  const { t } = useTranslation();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const getTierColor = (tier: BadgeTier): string => {
    switch (tier) {
      case 'bronze':
        return '#CD7F32';
      case 'silver':
        return '#C0C0C0';
      case 'gold':
        return '#FFD700';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getCategoryName = (category: BadgeCategory): string => {
    return t(`achievements.badgeCategory.${category}`, { defaultValue: category });
  };

  const getBadgeDescription = (badgeId: string): string => {
    return t(`achievements.badgeDescriptions.${badgeId}`, { 
      defaultValue: 'Complete the requirements to unlock this badge.' 
    });
  };

  const handleBadgePress = (badge: Badge) => {
    setSelectedBadge(badge);
  };

  const closeBadgeModal = () => {
    setSelectedBadge(null);
  };

  const unlockedBadges = badges.filter((b) => b.unlockedAt !== null);
  const lockedBadges = badges.filter((b) => b.unlockedAt === null);
  const activeChallenge = challenges.find((c) => c.status === 'active');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Streak and Level */}
      <View style={styles.statsRow}>
        <StreakChip />
        <LevelChip />
      </View>

      {/* Streak Details */}
      <Card variant="elevated" padding="md" style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
            },
          ]}
        >
          {t('achievements.streakTitle', { defaultValue: 'Streak' })}
        </Text>
        <Text
          style={[
            styles.sectionText,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.md,
            },
          ]}
        >
          {t('achievements.currentStreak', {
            defaultValue: 'Current: {{days}} days',
            days: streak.current,
          })}
        </Text>
        <Text
          style={[
            styles.sectionText,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.md,
            },
          ]}
        >
          {t('achievements.bestStreak', {
            defaultValue: 'Best: {{days}} days',
            days: streak.best,
          })}
        </Text>
        {streak.skipTokens > 0 && (
          <Text
            style={[
              styles.sectionText,
              {
                color: theme.colors.accent,
                fontSize: theme.typography.fontSize.md,
              },
            ]}
          >
            {t('achievements.skipTokens', {
              defaultValue: 'Skip tokens: {{count}}',
              count: streak.skipTokens,
            })}
          </Text>
        )}
      </Card>

      {/* Active Challenge */}
      {activeChallenge && (
        <Card variant="elevated" padding="md" style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
              },
            ]}
          >
            {t('achievements.activeChallenge', { defaultValue: 'Active Challenge' })}
          </Text>
          <Text
            style={[
              styles.sectionText,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.medium,
              },
            ]}
          >
            {activeChallenge.name}
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
                  width: `${Math.min((activeChallenge.progress / activeChallenge.target) * 100, 100)}%`,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.sectionText,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
              },
            ]}
          >
            {activeChallenge.progress} / {activeChallenge.target}
          </Text>
        </Card>
      )}

      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
              },
            ]}
          >
            {t('achievements.unlockedBadges', { defaultValue: 'Unlocked Badges' })} ({unlockedBadges.length})
          </Text>
          <View style={styles.badgesGrid}>
            {unlockedBadges.map((badge) => (
              <TouchableOpacity
                key={badge.id}
                onPress={() => handleBadgePress(badge)}
                activeOpacity={0.7}
              >
                <Card
                  variant="elevated"
                  padding="md"
                  style={[
                    styles.badgeCard,
                    {
                      borderColor: getTierColor(badge.tier),
                      borderWidth: 2,
                    },
                  ]}
                >
                <Text
                  style={[
                    styles.badgeTier,
                    {
                      color: getTierColor(badge.tier),
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.bold,
                    },
                  ]}
                >
                  {badge.tier.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.badgeName,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {badge.name}
                </Text>
                <Text
                  style={[
                    styles.badgeCategory,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.xs,
                    },
                  ]}
                >
                  {getCategoryName(badge.category)}
                </Text>
              </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Locked Badges */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
            },
          ]}
        >
            {t('achievements.allBadges', { defaultValue: 'All Badges' })}
        </Text>
        <View style={styles.badgesGrid}>
          {badges.map((badge) => {
            const isUnlocked = badge.unlockedAt !== null;
            return (
              <TouchableOpacity
                key={badge.id}
                onPress={() => handleBadgePress(badge)}
                activeOpacity={0.7}
              >
                <Card
                  variant="elevated"
                  padding="md"
                  style={[
                    styles.badgeCard,
                    {
                      borderColor: isUnlocked ? getTierColor(badge.tier) : theme.colors.border,
                      borderWidth: isUnlocked ? 2 : 1,
                      opacity: isUnlocked ? 1 : 0.6,
                    },
                  ]}
                >
                {isUnlocked && (
                  <Text
                    style={[
                      styles.badgeTier,
                      {
                        color: getTierColor(badge.tier),
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.bold,
                      },
                    ]}
                  >
                    {badge.tier.toUpperCase()}
                  </Text>
                )}
                <Text
                  style={[
                    styles.badgeName,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {badge.name}
                </Text>
                <Text
                  style={[
                    styles.badgeCategory,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.xs,
                    },
                  ]}
                >
                  {getCategoryName(badge.category)}
                </Text>
                {!isUnlocked && (
                  <Text
                    style={[
                      styles.badgeProgress,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.xs,
                      },
                    ]}
                  >
                    {badge.progress} / {badge.target}
                  </Text>
                )}
              </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Badge Description Modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={closeBadgeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeBadgeModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {selectedBadge && (
              <>
                <View style={styles.modalHeader}>
                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.xl,
                        fontWeight: theme.typography.fontWeight.bold,
                      },
                    ]}
                  >
                    {selectedBadge.name}
                  </Text>
                  <Text
                    style={[
                      styles.modalTier,
                      {
                        color: getTierColor(selectedBadge.tier),
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.bold,
                      },
                    ]}
                  >
                    {selectedBadge.tier.toUpperCase()}
                  </Text>
                </View>
                
                <Text
                  style={[
                    styles.modalCategory,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.md,
                      marginBottom: 16,
                    },
                  ]}
                >
                  {getCategoryName(selectedBadge.category)}
                </Text>

                <Text
                  style={[
                    styles.modalDescription,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      marginBottom: 16,
                    },
                  ]}
                >
                  {getBadgeDescription(selectedBadge.id)}
                </Text>

                {selectedBadge.unlockedAt ? (
                  <Text
                    style={[
                      styles.modalStatus,
                      {
                        color: theme.colors.success || '#4CAF50',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                      },
                    ]}
                  >
                    {t('achievements.unlocked', { defaultValue: 'Unlocked' })}
                  </Text>
                ) : (
                  <View style={styles.modalProgress}>
                    <Text
                      style={[
                        styles.modalProgressText,
                        {
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.fontSize.sm,
                        },
                      ]}
                    >
                      {t('achievements.progress', { 
                        defaultValue: 'Progress: {{current}} / {{target}}',
                        current: selectedBadge.progress,
                        target: selectedBadge.target,
                      })}
                    </Text>
                    <View
                      style={[
                        styles.modalProgressBar,
                        {
                          backgroundColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.modalProgressFill,
                          {
                            backgroundColor: theme.colors.accent,
                            width: `${Math.min((selectedBadge.progress / selectedBadge.target) * 100, 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={closeBadgeModal}
                  style={[
                    styles.modalCloseButton,
                    {
                      backgroundColor: theme.colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalCloseButtonText,
                      {
                        color: '#FFFFFF',
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.medium,
                      },
                    ]}
                  >
                    {t('common.close', { defaultValue: 'Close' })}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sectionText: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  badgeCard: {
    width: '30%',
    minWidth: 100,
    alignItems: 'center',
  },
  badgeTier: {
    marginBottom: 4,
  },
  badgeName: {
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeCategory: {
    textAlign: 'center',
  },
  badgeProgress: {
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    marginBottom: 12,
  },
  modalTitle: {
    marginBottom: 4,
  },
  modalTier: {
    marginTop: 4,
  },
  modalCategory: {
    marginBottom: 16,
  },
  modalDescription: {
    lineHeight: 22,
    marginBottom: 16,
  },
  modalStatus: {
    marginBottom: 16,
  },
  modalProgress: {
    marginBottom: 16,
  },
  modalProgressText: {
    marginBottom: 8,
  },
  modalProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  modalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    fontWeight: '600',
  },
});

export default AchievementsScreen;

