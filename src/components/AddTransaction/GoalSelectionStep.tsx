import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { useGoals, GENERAL_SAVINGS_GOAL_ID } from '../../state/GoalsProvider';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';
import { AddGoalModal } from '../AddGoalModal';

type GoalSelectionStepProps = {
  selectedGoalId: string | null;
  onSelect: (goalId: string | null) => void;
  style?: ViewStyle;
};

/**
 * GoalSelectionStep - Step for selecting a goal for saved transactions
 */
export const GoalSelectionStep: React.FC<GoalSelectionStepProps> = ({
  selectedGoalId,
  onSelect,
  style,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const { getActiveGoals } = useGoals();
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  const activeGoals = getActiveGoals();

  const handleGoalCreated = (goalId: string) => {
    onSelect(goalId);
    setShowAddGoalModal(false);
  };

  return (
    <View style={style}>
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        {t('addTransaction.selectGoal', { defaultValue: 'Select Goal (Optional)' })}
      </Text>

      {/* Option: No Goal (General Savings) */}
      <TouchableOpacity
        onPress={() => onSelect(GENERAL_SAVINGS_GOAL_ID)}
        activeOpacity={0.7}
        style={{ marginBottom: 12 }}
      >
        <Card
          variant="outlined"
          padding="md"
          style={[
            styles.goalCard,
            {
              backgroundColor: selectedGoalId === GENERAL_SAVINGS_GOAL_ID ? theme.colors.accent + '20' : theme.colors.surface,
              borderColor: selectedGoalId === GENERAL_SAVINGS_GOAL_ID ? theme.colors.accent : theme.colors.border,
              borderWidth: selectedGoalId === GENERAL_SAVINGS_GOAL_ID ? 2 : 1,
            },
          ]}
        >
          <View style={styles.goalContent}>
            <Text style={styles.goalEmoji}>💾</Text>
            <View style={styles.goalInfo}>
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
                {t('addTransaction.noGoal', { defaultValue: 'No Goal (General Savings)' })}
              </Text>
              <Text
                style={[
                  styles.goalDescription,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  },
                ]}
              >
                {t('addTransaction.noGoalDescription', { defaultValue: 'Save without linking to a specific goal' })}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <ScrollView
          style={styles.goalsList}
          showsVerticalScrollIndicator={false}
        >
          {activeGoals.map((goal) => {
            const progress = goal.targetAmount > 0 
              ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
              : 0;
            const isSelected = selectedGoalId === goal.id;

            return (
              <TouchableOpacity
                key={goal.id}
                onPress={() => onSelect(goal.id)}
                activeOpacity={0.7}
                style={{ marginBottom: 12 }}
              >
                <Card
                  variant="outlined"
                  padding="md"
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.goalContent}>
                    {goal.emoji && (
                      <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                    )}
                    <View style={styles.goalInfo}>
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
                      <View style={styles.goalProgress}>
                        <Text
                          style={[
                            styles.goalProgressText,
                            {
                              color: theme.colors.textSecondary,
                              fontSize: theme.typography.fontSize.sm,
                            },
                          ]}
                        >
                          {formatCurrency(goal.currentAmount, goal.currency)} / {formatCurrency(goal.targetAmount, goal.currency)}
                        </Text>
                        <Text
                          style={[
                            styles.goalProgressPercent,
                            {
                              color: theme.colors.textSecondary,
                              fontSize: theme.typography.fontSize.xs,
                            },
                          ]}
                        >
                          {progress.toFixed(1)}%
                        </Text>
                      </View>
                      {/* Progress Bar */}
                      <View
                        style={[
                          styles.progressBarContainer,
                          {
                            backgroundColor: theme.colors.surface,
                            marginTop: 8,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${progress}%`,
                              backgroundColor: theme.colors.accent,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Create Goal Button */}
      <TouchableOpacity
        onPress={() => setShowAddGoalModal(true)}
        activeOpacity={0.7}
        style={{ marginTop: 12 }}
      >
        <Card
          variant="outlined"
          padding="md"
          style={[
            styles.goalCard,
            styles.addGoalCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderStyle: 'dashed',
            },
          ]}
        >
          <View style={styles.goalContent}>
            <Text style={styles.addGoalIcon}>+</Text>
            <Text
              style={[
                styles.addGoalText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: theme.typography.fontWeight.medium,
                },
              ]}
            >
              {t('addTransaction.createGoal', { defaultValue: 'Create New Goal' })}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>

      <AddGoalModal
        visible={showAddGoalModal}
        goalToEdit={null}
        onClose={() => setShowAddGoalModal(false)}
        onGoalCreated={handleGoalCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 12,
  },
  goalsList: {
    maxHeight: 300,
  },
  goalCard: {
    marginBottom: 0,
  },
  addGoalCard: {
    alignItems: 'center',
  },
  goalContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    marginBottom: 4,
  },
  goalDescription: {
    marginTop: 4,
  },
  goalProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  goalProgressText: {
    flex: 1,
  },
  goalProgressPercent: {
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  addGoalIcon: {
    fontSize: 24,
    marginRight: 8,
    color: '#999',
  },
  addGoalText: {
    flex: 1,
  },
});

