import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';
import { Goal } from '../types';
import { useTranslation } from 'react-i18next';
import { useGoals } from '../state/GoalsProvider';
import { useSettings } from '../state/SettingsProvider';
import { formatCurrency } from '../utils/format';

type AddGoalModalProps = {
  visible: boolean;
  goalToEdit?: Goal | null;
  onClose: () => void;
  onGoalCreated?: (goalId: string) => void;
};

// Popular emojis for goals
const GOAL_EMOJIS = [
  '🚗', '🏠', '💍', '✈️', '🎓', '💻', '📱', '⌚', '👕', '👗',
  '🎮', '🎬', '🎵', '🎨', '🏋️', '⚽', '🏀', '🎾', '🏊', '🧘',
  '💆', '💇', '💅', '💄', '👜', '💍', '⌚', '📷', '🏠', '🏡',
  '🏢', '🏪', '🏥', '🏫', '🌳', '🌲', '🌵', '🌻', '🌺', '🌷',
  '🎁', '🎂', '🎈', '🎉', '🎊', '🎀', '🎃', '🎄', '🎅', '🎆',
  '💰', '💵', '💴', '💶', '💷', '💸', '💳', '💎', '🏦', '📊',
];

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  visible,
  goalToEdit,
  onClose,
  onGoalCreated,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const { createGoal, updateGoal } = useGoals();
  const { settings } = useSettings();
  
  const isEditMode = !!goalToEdit;
  
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill form when editing
  React.useEffect(() => {
    if (visible && goalToEdit) {
      setName(goalToEdit.name);
      setTargetAmount(String(goalToEdit.targetAmount));
      setSelectedEmoji(goalToEdit.emoji || '🎯');
      setNote(goalToEdit.note || '');
    } else if (visible && !goalToEdit) {
      // Reset form for new goal
      setName('');
      setTargetAmount('');
      setSelectedEmoji('🎯');
      setNote('');
    }
  }, [visible, goalToEdit]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      Alert.alert(t('alerts.error'), t('goals.nameRequired', { defaultValue: 'Please enter a goal name' }));
      return;
    }

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t('alerts.error'), t('goals.amountRequired', { defaultValue: 'Please enter a valid target amount greater than 0' }));
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && goalToEdit) {
        // Update existing goal
        await updateGoal(goalToEdit.id, {
          name: trimmedName,
          targetAmount: amount,
          emoji: selectedEmoji,
          note: note.trim() || undefined,
        });
        Alert.alert(t('alerts.success'), t('goals.updated', { defaultValue: 'Goal updated successfully!' }));
      } else {
        // Create new goal
        const newGoal = await createGoal({
          name: trimmedName,
          targetAmount: amount,
          emoji: selectedEmoji,
          note: note.trim() || undefined,
        });
        Alert.alert(t('alerts.success'), t('goals.created', { defaultValue: 'Goal created successfully!' }));
        // Call onGoalCreated callback if provided
        if (onGoalCreated && newGoal) {
          onGoalCreated(newGoal.id);
        }
      }
      onClose();
    } catch (error) {
      console.error('[AddGoalModal] Error saving goal:', error);
      Alert.alert(t('alerts.error'), error instanceof Error ? error.message : t('alerts.somethingWentWrong'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setTargetAmount('');
    setSelectedEmoji('🎯');
    setNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.colors.card,
                  borderTopLeftRadius: theme.radii.lg,
                  borderTopRightRadius: theme.radii.lg,
                },
              ]}
            >
              <View style={styles.handle} />
              
              <View style={styles.header}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.lg,
                      fontWeight: theme.typography.fontWeight.bold,
                    },
                  ]}
                >
                  {isEditMode ? t('goals.editTitle', { defaultValue: 'Edit Goal' }) : t('goals.createTitle', { defaultValue: 'Create Goal' })}
                </Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text
                    style={[
                      styles.closeButton,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.lg,
                      },
                    ]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {/* Emoji Selection */}
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.semibold,
                        marginBottom: theme.spacing.sm,
                      },
                    ]}
                  >
                    {t('goals.emoji', { defaultValue: 'Emoji' })}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.emojiScrollView}
                    contentContainerStyle={styles.emojiContainer}
                  >
                    {GOAL_EMOJIS.map((emoji, index) => (
                      <TouchableOpacity
                        key={`goal-emoji-${index}-${emoji}`}
                        onPress={() => setSelectedEmoji(emoji)}
                        style={[
                          styles.emojiButton,
                          {
                            backgroundColor: selectedEmoji === emoji ? theme.colors.accent : theme.colors.surface,
                            borderColor: selectedEmoji === emoji ? theme.colors.accent : theme.colors.border,
                          },
                        ]}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Name Input */}
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.semibold,
                        marginBottom: theme.spacing.sm,
                      },
                    ]}
                  >
                    {t('goals.name', { defaultValue: 'Goal Name' })}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                      },
                    ]}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('goals.namePlaceholder', { defaultValue: 'e.g., Buy a car, Save for down payment' })}
                    placeholderTextColor={theme.colors.textSecondary}
                    autoFocus={!isEditMode}
                  />
                </View>

                {/* Target Amount Input */}
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.semibold,
                        marginBottom: theme.spacing.sm,
                      },
                    ]}
                  >
                    {t('goals.targetAmount', { defaultValue: 'Target Amount' })}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                      },
                    ]}
                    value={targetAmount}
                    onChangeText={setTargetAmount}
                    placeholder={formatCurrency(0, settings.currency)}
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                {/* Note Input (Optional) */}
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.semibold,
                        marginBottom: theme.spacing.sm,
                      },
                    ]}
                  >
                    {t('goals.note', { defaultValue: 'Note' })} {t('common.optional', { defaultValue: '(Optional)' })}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                      },
                    ]}
                    value={note}
                    onChangeText={setNote}
                    placeholder={t('goals.notePlaceholder', { defaultValue: 'Optional note...' })}
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={handleClose}
                    disabled={isSaving}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        {
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.fontSize.md,
                          fontWeight: theme.typography.fontWeight.semibold,
                        },
                      ]}
                    >
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      {
                        backgroundColor: theme.colors.accent,
                        opacity: isSaving ? 0.6 : 1,
                      },
                    ]}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Text
                        style={[
                          styles.saveButtonText,
                          {
                            color: theme.colors.background,
                            fontSize: theme.typography.fontSize.md,
                            fontWeight: theme.typography.fontWeight.semibold,
                          },
                        ]}
                      >
                        {t('common.loading')}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.saveButtonText,
                          {
                            color: theme.colors.background,
                            fontSize: theme.typography.fontSize.md,
                            fontWeight: theme.typography.fontWeight.semibold,
                          },
                        ]}
                      >
                        {t('common.save')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    marginTop: '30%',
    paddingBottom: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    maxHeight: '100%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  emojiScrollView: {
    marginHorizontal: -20,
  },
  emojiContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
  },
});

