import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useGoals } from '../state/GoalsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTranslation } from 'react-i18next';
import { Goal } from '../types';
import { formatCurrency } from '../utils/format';
import { AddGoalModal } from '../components/AddGoalModal';
import { Card } from '../components/layout';
import { EmptyState } from '../components/states';
import { SectionHeader } from '../components/layout';
import { ConfettiAnimation } from '../components/ConfettiAnimation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';

type GoalsNav = NativeStackNavigationProp<RootStackParamList, 'Goals'>;

const GoalsScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const navigation = useNavigation<GoalsNav>();
  const { goals, getActiveGoals, deleteGoal, updateGoal } = useGoals();
  const { settings } = useSettings();
  const [showAddModal, setShowAddModal] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const activeGoals = useMemo(() => {
    const active = getActiveGoals();
    console.log('[GoalsScreen] Active goals updated:', active.map(g => ({ name: g.name, currentAmount: g.currentAmount, targetAmount: g.targetAmount })));
    return active;
  }, [goals, getActiveGoals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'completed'), [goals]);
  
  // Debug: Log when goals change
  useEffect(() => {
    console.log('[GoalsScreen] Goals changed:', goals.map(g => ({ name: g.name, currentAmount: g.currentAmount, targetAmount: g.targetAmount, status: g.status })));
  }, [goals]);

  const handleCreateGoal = () => {
    setGoalToEdit(null);
    setShowAddModal(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setGoalToEdit(goal);
    setShowAddModal(true);
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      t('goals.deleteTitle', { defaultValue: 'Delete Goal' }),
      t('goals.deleteConfirm', { defaultValue: 'Are you sure you want to delete this goal? This action cannot be undone.' }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goal.id);
              Alert.alert(t('alerts.success'), t('goals.deleted', { defaultValue: 'Goal deleted successfully' }));
            } catch (error) {
              Alert.alert(t('alerts.error'), error instanceof Error ? error.message : t('alerts.somethingWentWrong'));
            }
          },
        },
      ]
    );
  };

  const handleArchiveGoal = async (goal: Goal) => {
    try {
      await updateGoal(goal.id, { status: 'archived' });
    } catch (error) {
      Alert.alert(t('alerts.error'), error instanceof Error ? error.message : t('alerts.somethingWentWrong'));
    }
  };

  const handleCompleteGoal = async (goal: Goal) => {
    try {
      // Show confetti animation immediately
      setShowConfetti(true);
      // Update goal status (this will trigger re-render with green border)
      await updateGoal(goal.id, { status: 'completed' });
    } catch (error) {
      setShowConfetti(false);
      Alert.alert(t('alerts.error'), error instanceof Error ? error.message : t('alerts.somethingWentWrong'));
    }
  };

  const calculateProgress = (goal: Goal): number => {
    if (goal.targetAmount === 0) return 0;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const renderGoalCard = (goal: Goal, showActions: boolean = true) => {
    const progress = calculateProgress(goal);
    const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
    const isCompleted = goal.status === 'completed' || goal.currentAmount >= goal.targetAmount;

    return (
      <Card
        key={goal.id}
        variant="outlined"
        padding="md"
        style={[
          styles.goalCard,
          isCompleted && {
            borderWidth: 3,
            borderColor: theme.colors.positive,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleEditGoal(goal)}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View style={styles.goalHeader}>
            <View style={styles.goalHeaderLeft}>
              {goal.emoji && (
                <Text style={styles.goalEmoji}>{goal.emoji}</Text>
              )}
              <View style={styles.goalTitleContainer}>
                <Text
                  style={[
                    styles.goalName,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.semibold,
                    },
                  ]}
                >
                  {goal.name}
                </Text>
                {goal.note && (
                  <Text
                    style={[
                      styles.goalNote,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.sm,
                        marginTop: 4,
                      },
                    ]}
                  >
                    {goal.note}
                  </Text>
                )}
              </View>
            </View>
            {isCompleted && (
              <View
                style={[
                  styles.completedBadge,
                  {
                    backgroundColor: theme.colors.positive,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.completedBadgeText,
                    {
                      color: theme.colors.background,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                    },
                  ]}
                >
                  ✓
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressContainer,
              {
                backgroundColor: theme.colors.surface,
                marginTop: 16,
              },
            ]}
          >
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                  backgroundColor: isCompleted ? theme.colors.positive : theme.colors.accent,
                },
              ]}
            />
          </View>

          {/* Stats */}
          <View style={styles.goalStats}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.bold,
                  },
                ]}
              >
                {formatCurrency(goal.currentAmount, goal.currency)}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.xs,
                  },
                ]}
              >
                {t('goals.saved', { defaultValue: 'Saved' })}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.bold,
                  },
                ]}
              >
                {formatCurrency(goal.targetAmount, goal.currency)}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.xs,
                  },
                ]}
              >
                {t('goals.target', { defaultValue: 'Target' })}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: remaining > 0 ? theme.colors.textPrimary : theme.colors.positive,
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.bold,
                  },
                ]}
              >
                {formatCurrency(remaining, goal.currency)}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.xs,
                  },
                ]}
              >
                {t('goals.remaining', { defaultValue: 'Remaining' })}
              </Text>
            </View>
          </View>

          {/* Progress Percentage */}
          <View style={styles.progressPercentage}>
            <Text
              style={[
                styles.progressText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.sm,
                },
              ]}
            >
              {progress.toFixed(1)}% {t('goals.complete', { defaultValue: 'complete' })}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Actions */}
        {showActions && (
          <View style={styles.goalActions}>
            {!isCompleted && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCompleteGoal(goal)}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color: theme.colors.positive,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                    },
                  ]}
                >
                  {t('goals.markComplete', { defaultValue: 'Mark Complete' })}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditGoal(goal)}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: theme.colors.accent,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                  },
                ]}
              >
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteGoal(goal)}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: theme.colors.danger,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                  },
                ]}
              >
                {t('common.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Goals Section */}
        <View style={styles.section}>
          <SectionHeader
            title={t('goals.activeGoals', { defaultValue: 'Active Goals' })}
            variant="overline"
            style={styles.sectionHeader}
          />
          {activeGoals.length === 0 ? (
            <EmptyState
              icon="🎯"
              title={t('goals.noActiveGoals', { defaultValue: 'No active goals' })}
              message={t('goals.noActiveGoalsMessage', { defaultValue: 'Create a goal to start saving towards your dreams!' })}
              actionLabel={t('goals.createFirst', { defaultValue: 'Create Goal' })}
              onAction={handleCreateGoal}
            />
          ) : (
            <View style={styles.goalsList}>
              {activeGoals.map((goal) => renderGoalCard(goal))}
            </View>
          )}
        </View>

        {/* Completed Goals Section */}
        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t('goals.completedGoals', { defaultValue: 'Completed Goals' })}
              variant="overline"
              style={styles.sectionHeader}
            />
            <View style={styles.goalsList}>
              {completedGoals.map((goal) => renderGoalCard(goal, false))}
            </View>
          </View>
        )}

        {/* Create Goal Button - Only show if there are active goals */}
        {activeGoals.length > 0 && (
          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor: theme.colors.accent,
              },
            ]}
            onPress={handleCreateGoal}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.createButtonText,
                {
                  color: theme.colors.background,
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: theme.typography.fontWeight.semibold,
                },
              ]}
            >
              + {t('goals.createGoal', { defaultValue: 'Create Goal' })}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AddGoalModal
        visible={showAddModal}
        goalToEdit={goalToEdit}
        onClose={() => {
          setShowAddModal(false);
          setGoalToEdit(null);
        }}
      />

      {/* Confetti Animation */}
      <ConfettiAnimation
        visible={showConfetti}
        onComplete={() => {
          setShowConfetti(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  goalsList: {
    gap: 16,
  },
  goalCard: {
    marginBottom: 0,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalName: {
    fontSize: 18,
  },
  goalNote: {
    marginTop: 4,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  completedBadgeText: {
    fontSize: 14,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  progressPercentage: {
    marginTop: 12,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
  },
  goalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 14,
  },
  createButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    fontSize: 16,
  },
});

export default GoalsScreen;

