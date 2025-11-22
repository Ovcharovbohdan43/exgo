import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from './layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { TransactionType } from '../types';

type TransactionTypeModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: TransactionType) => void;
};

/**
 * TransactionTypeModal - Modal for selecting transaction type
 * This is a placeholder for Phase 5 - will be expanded with full add transaction flow
 */
export const TransactionTypeModal: React.FC<TransactionTypeModalProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  const theme = useThemeStyles();

  const types: { type: TransactionType; label: string; emoji: string; color: string }[] = [
    { type: 'expense', label: 'Expense', emoji: '💸', color: theme.colors.danger },
    { type: 'income', label: 'Income', emoji: '💰', color: theme.colors.positive },
    { type: 'saved', label: 'Saved', emoji: '💾', color: theme.colors.accent },
  ];

  const handleSelect = (type: TransactionType) => {
    onSelectType(type);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
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
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
          >
            Add Transaction
          </Text>
          <View style={styles.typesContainer}>
            {types.map((item) => (
              <TouchableOpacity
                key={item.type}
                onPress={() => handleSelect(item.type)}
                activeOpacity={0.7}
              >
                <Card
                  variant="outlined"
                  padding="lg"
                  style={{
                    ...styles.typeCard,
                    borderColor: item.color,
                    backgroundColor: theme.colors.surface,
                  }}
                >
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.typeLabel,
                      {
                        color: theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.semibold,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.cancelButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onClose}
            activeOpacity={0.7}
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
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
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
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  typesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  typeCard: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    textAlign: 'center',
  },
  cancelButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
  },
});

