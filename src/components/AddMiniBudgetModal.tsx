import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useSettings } from '../state/SettingsProvider';
import { useMiniBudgets } from '../state/MiniBudgetsProvider';
import { MiniBudget, MiniBudgetWithState } from '../types';
import { Card } from './layout';
import { useTranslation } from 'react-i18next';
import { getLocalizedCategory } from '../utils/categoryLocalization';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { getMonthKey } from '../utils/month';

type AddMiniBudgetModalProps = {
  visible: boolean;
  budgetToEdit?: MiniBudget | null;
  currentMonth?: string;
  onClose: () => void;
};

export const AddMiniBudgetModal: React.FC<AddMiniBudgetModalProps> = ({
  visible,
  budgetToEdit,
  currentMonth,
  onClose,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { createMiniBudget, updateMiniBudget } = useMiniBudgets();
  const isEditMode = !!(
    budgetToEdit &&
    typeof budgetToEdit === 'object' &&
    'id' in budgetToEdit &&
    'limitAmount' in budgetToEdit &&
    budgetToEdit.id
  );

  const [name, setName] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize form when modal opens or budgetToEdit changes
  useEffect(() => {
    if (visible) {
      if (budgetToEdit && typeof budgetToEdit === 'object' && 'id' in budgetToEdit && 'limitAmount' in budgetToEdit) {
        // Type guard: ensure budgetToEdit has all required properties
        const budget = budgetToEdit as MiniBudget;
        setName(budget.name || '');
        setLimitAmount((budget.limitAmount || 0).toString());
        setSelectedCategories([...(budget.linkedCategoryIds || [])]);
        setNote(budget.note || '');
      } else {
        setName('');
        setLimitAmount('');
        setSelectedCategories([]);
        setNote('');
      }
    }
  }, [visible, budgetToEdit]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const amount = parseFloat(limitAmount);

    if (!trimmedName) {
      Alert.alert(t('alerts.error'), t('miniBudgets.nameRequired'));
      return;
    }

    if (!limitAmount || isNaN(amount) || amount <= 0) {
      Alert.alert(t('alerts.error'), t('miniBudgets.limitRequired'));
      return;
    }

    if (selectedCategories.length === 0) {
      Alert.alert(t('alerts.error'), t('miniBudgets.categoriesRequired'));
      return;
    }

    setLoading(true);
    try {
      const month = currentMonth || getMonthKey();

      if (
        isEditMode &&
        budgetToEdit &&
        typeof budgetToEdit === 'object' &&
        'id' in budgetToEdit &&
        budgetToEdit.id
      ) {
        await updateMiniBudget(budgetToEdit.id, {
          name: trimmedName,
          limitAmount: amount,
          linkedCategoryIds: selectedCategories,
          note: note.trim() || undefined,
        });
        Alert.alert(t('alerts.success'), t('miniBudgets.updated'));
      } else {
        await createMiniBudget({
          name: trimmedName,
          limitAmount: amount,
          linkedCategoryIds: selectedCategories,
          note: note.trim() || undefined,
          month,
        });
        Alert.alert(t('alerts.success'), t('miniBudgets.created'));
      }

      handleClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('alerts.somethingWentWrong');
      Alert.alert(t('alerts.error'), errorMessage);
      console.error('[AddMiniBudgetModal] Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setLimitAmount('');
    setSelectedCategories([]);
    setNote('');
    onClose();
  };

  // Get all available categories (default + custom)
  const allCategories = [
    ...EXPENSE_CATEGORIES,
    ...(settings.customCategories?.filter((c) => c.type === 'expense').map((c) => c.name) || []),
  ];

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
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <Card variant="elevated" padding="lg" style={styles.modalContent}>
              <View style={styles.header}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.xl,
                      fontWeight: theme.typography.fontWeight.bold,
                    },
                  ]}
                >
                  {isEditMode ? t('miniBudgets.editTitle') : t('miniBudgets.createTitle')}
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
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Name Input */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                      },
                    ]}
                  >
                    {t('miniBudgets.name')} *
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
                    placeholder={t('miniBudgets.namePlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                    autoFocus={!isEditMode}
                  />
                </View>

                {/* Limit Amount Input */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                      },
                    ]}
                  >
                    {t('miniBudgets.monthlyLimit')} ({settings.currency}) *
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
                    value={limitAmount}
                    onChangeText={setLimitAmount}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Categories Selection */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                      },
                    ]}
                  >
                    {t('miniBudgets.linkedCategories')} *
                  </Text>
                  <View style={styles.categoriesContainer}>
                    {allCategories.map((category) => {
                      const isSelected = selectedCategories.includes(category);
                      return (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: isSelected
                                ? theme.colors.accent
                                : theme.colors.surface,
                              borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                            },
                          ]}
                          onPress={() => handleCategoryToggle(category)}
                        >
                          <Text
                            style={[
                              styles.categoryText,
                              {
                                color: isSelected
                                  ? theme.colors.background
                                  : theme.colors.textPrimary,
                                fontSize: theme.typography.fontSize.sm,
                              },
                            ]}
                          >
                            {getLocalizedCategory(category)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Note Input (Optional) */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                      },
                    ]}
                  >
                    {t('miniBudgets.note')} ({t('common.optional')})
                  </Text>
                  <TextInput
                    style={[
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
                    placeholder={t('miniBudgets.notePlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

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
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
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
                    },
                  ]}
                  onPress={handleSave}
                  disabled={loading}
                >
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
                    {loading ? t('common.loading') : t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
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
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    fontSize: 32,
    lineHeight: 32,
  },
  scrollView: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: '600',
  },
});

