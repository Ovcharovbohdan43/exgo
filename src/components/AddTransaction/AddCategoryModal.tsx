import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { CustomCategory, TransactionType } from '../../types';
import { useTranslation } from 'react-i18next';

type AddCategoryModalProps = {
  visible: boolean;
  existingCategories: string[];
  categoryType: 'expense' | 'income'; // Type of category being created
  onClose: () => void;
  onSave: (category: CustomCategory) => void;
};

// Popular emojis for expense categories
const EXPENSE_EMOJIS = [
  '🍕', '🍔', '🍟', '🌮', '🍜', '🍱', '🍣', '🍰', '☕', '🍺',
  '🚗', '✈️', '🚇', '🚲', '🏍️', '🚢', '🎮', '🎬', '🎵', '🎨',
  '🏋️', '⚽', '🏀', '🎾', '🏊', '🧘', '💆', '💇', '💅', '💄',
  '👕', '👔', '👗', '👠', '👜', '💍', '⌚', '📱', '💻', '📷',
  '🏠', '🏡', '🏢', '🏪', '🏥', '🏫', '🏰', '⛪', '🕌', '🕍',
  '🐕', '🐈', '🐦', '🐠', '🌳', '🌲', '🌵', '🌻', '🌺', '🌷',
  '🎁', '🎂', '🎈', '🎉', '🎊', '🎀', '🎃', '🎄', '🎅', '🎆',
];

// Popular emojis for income categories
const INCOME_EMOJIS = [
  '💰', '💵', '💴', '💶', '💷', '💸', '💳', '💎', '🏦', '📊',
  '💼', '👔', '🎓', '🏆', '⭐', '🌟', '✨', '🎁', '🎉', '🎊',
  '💻', '📱', '⌚', '📷', '🎨', '🎵', '🎬', '📚', '✍️', '🎯',
  '🚀', '💡', '🔔', '📈', '📉', '💹', '🏅', '🥇', '🥈', '🥉',
  '🎪', '🎭', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻', '🥁', '🎲',
  '🏠', '🏡', '🏢', '🏪', '🏥', '🏫', '🏰', '⛪', '🕌', '🕍',
  '🌳', '🌲', '🌵', '🌻', '🌺', '🌷', '🌹', '🌸', '🌼', '🌿',
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  visible,
  existingCategories,
  categoryType,
  onClose,
  onSave,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(categoryType === 'income' ? '💰' : '📦');
  
  // Select appropriate emoji list based on category type
  const emojiList = categoryType === 'income' ? INCOME_EMOJIS : EXPENSE_EMOJIS;

  const handleSave = () => {
    const trimmedName = categoryName.trim();
    
    if (!trimmedName) {
      Alert.alert(t('alerts.error'), t('alerts.categoryNameRequired'));
      return;
    }

    if (existingCategories.includes(trimmedName)) {
      Alert.alert(t('alerts.error'), t('alerts.categoryExists'));
      return;
    }

    onSave({
      name: trimmedName,
      emoji: selectedEmoji,
      type: categoryType,
    });

    // Reset form
    setCategoryName('');
    setSelectedEmoji(categoryType === 'income' ? '💰' : '📦');
    onClose();
  };

  const handleClose = () => {
    setCategoryName('');
    setSelectedEmoji(categoryType === 'income' ? '💰' : '📦');
    onClose();
  };
  
  // Reset emoji when categoryType changes
  React.useEffect(() => {
    setSelectedEmoji(categoryType === 'income' ? '💰' : '📦');
  }, [categoryType]);

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
          style={styles.keyboardAvoidingView}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
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
                {t('addTransaction.addCustomCategory')}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text
                  style={[
                    styles.closeButtonText,
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

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <Text
                  style={[
                    styles.label,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.medium,
                      marginBottom: theme.spacing.xs,
                    },
                  ]}
                >
                  {t('addTransaction.category')}
                </Text>
                <TextInput
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder={t('addTransaction.categoryNamePlaceholder', { defaultValue: 'Enter category name' })}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                    },
                  ]}
                  autoCapitalize="words"
                  maxLength={30}
                />

                <Text
                  style={[
                    styles.label,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.medium,
                      marginTop: theme.spacing.lg,
                      marginBottom: theme.spacing.xs,
                    },
                  ]}
                >
                  {t('addTransaction.selectEmoji', { defaultValue: 'Select Emoji' })}
                </Text>
                <View
                  style={[
                    styles.emojiPreview,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text style={styles.emojiPreviewText}>{selectedEmoji}</Text>
                </View>

                <ScrollView
                  style={styles.emojiGrid}
                  contentContainerStyle={styles.emojiGridContent}
                  showsVerticalScrollIndicator={false}
                >
                  {emojiList.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedEmoji(emoji)}
                      style={[
                        styles.emojiButton,
                        {
                          backgroundColor:
                            selectedEmoji === emoji
                              ? theme.colors.accent + '20'
                              : theme.colors.surface,
                          borderColor:
                            selectedEmoji === emoji
                              ? theme.colors.accent
                              : theme.colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.emojiButtonText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  borderTopColor: theme.colors.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={handleClose}
                style={[
                  styles.cancelButton,
                  {
                    borderColor: theme.colors.border,
                  },
                ]}
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
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.colors.accent,
                  },
                ]}
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
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: 780, // Increased by 30% (600 * 1.3)
    minHeight: 700, // Increased by 30% (400 * 1.3)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
    flexGrow: 1,
  },
  form: {
    padding: 20,
    flexGrow: 1,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  emojiPreview: {
    borderWidth: 2,
    borderRadius: 12,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  emojiPreviewText: {
    fontSize: 40,
  },
  emojiGrid: {
    maxHeight: 200,
  },
  emojiGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonText: {
    fontSize: 24,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    flexShrink: 0,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    textAlign: 'center',
  },
});

