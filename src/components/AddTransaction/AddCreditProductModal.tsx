import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { CreditType } from '../../types';
import { useTranslation } from 'react-i18next';
import { useCreditProducts } from '../../state/CreditProductsProvider';
import { useSettings } from '../../state/SettingsProvider';
import { CreditProduct } from '../../types';

type AddCreditProductModalProps = {
  visible: boolean;
  productToEdit?: CreditProduct | null;
  onClose: () => void;
  onProductCreated: (productId: string) => void;
};

export const AddCreditProductModal: React.FC<AddCreditProductModalProps> = ({
  visible,
  productToEdit,
  onClose,
  onProductCreated,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const { createCreditProduct, updateCreditProduct } = useCreditProducts();
  const { settings } = useSettings();
  
  const isEditMode = !!productToEdit;
  
  const [name, setName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [creditType, setCreditType] = useState<CreditType>('credit_card');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Pre-fill form when editing
  React.useEffect(() => {
    if (visible && productToEdit) {
      setName(productToEdit.name);
      setCreditLimit(String(productToEdit.creditLimit));
      setInterestRate(productToEdit.interestRate ? String(productToEdit.interestRate) : '');
      setCreditType(productToEdit.creditType);
      setMinimumPayment(productToEdit.minimumPayment ? String(productToEdit.minimumPayment) : '');
      setDueDate(productToEdit.dueDate ? String(productToEdit.dueDate) : '');
    } else if (visible && !productToEdit) {
      // Reset form for new product
      setName('');
      setCreditLimit('');
      setInterestRate('');
      setCreditType('credit_card');
      setMinimumPayment('');
      setDueDate('');
    }
  }, [visible, productToEdit]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      Alert.alert(t('alerts.error'), 'Credit product name is required');
      return;
    }

    const creditLimitAmount = parseFloat(creditLimit);
    if (isNaN(creditLimitAmount) || creditLimitAmount <= 0) {
      Alert.alert(t('alerts.error'), 'Credit limit must be greater than 0');
      return;
    }

    const interestRateValue = interestRate ? parseFloat(interestRate) : undefined;
    if (interestRate && (isNaN(interestRateValue!) || interestRateValue! < 0)) {
      Alert.alert(t('alerts.error'), 'Interest rate must be a non-negative number');
      return;
    }

    setIsCreating(true);
    try {
      if (isEditMode && productToEdit) {
        // Update existing product
        await updateCreditProduct(productToEdit.id, {
          name: trimmedName,
          principal: creditLimitAmount,
          apr: interestRateValue || 0,
          creditType,
          monthlyMinimumPayment: minimumPayment ? parseFloat(minimumPayment) : undefined,
          dueDate: dueDate ? parseInt(dueDate, 10) : undefined,
        });
        onProductCreated(productToEdit.id);
      } else {
        // Create new product
        const product = await createCreditProduct({
          name: trimmedName,
          principal: creditLimitAmount,
          apr: interestRateValue || 0,
          creditType,
          monthlyMinimumPayment: minimumPayment ? parseFloat(minimumPayment) : undefined,
          dueDate: dueDate ? parseInt(dueDate, 10) : undefined,
        });
        onProductCreated(product.id);
      }

      // Reset form
      setName('');
      setCreditLimit('');
      setInterestRate('');
      setCreditType('credit_card');
      setMinimumPayment('');
      setDueDate('');
      
      onClose();
    } catch (error) {
      Alert.alert(t('alerts.error'), error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} credit product`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setCreditLimit('');
    setInterestRate('');
    setCreditType('credit_card');
    setMinimumPayment('');
    setDueDate('');
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
                {isEditMode ? 'Update Credit Product' : 'Create Credit Product'}
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
                  Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Barclaycard, Personal Loan"
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
                  maxLength={50}
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
                  Initial Debt Amount ({settings.currency}) *
                </Text>
                <TextInput
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                    },
                  ]}
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
                  APR (%) *
                </Text>
                <TextInput
                  value={interestRate}
                  onChangeText={setInterestRate}
                  placeholder="e.g., 18.5"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                    },
                  ]}
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
                  Credit Type *
                </Text>
                <View style={styles.typeContainer}>
                  {(['credit_card', 'loan', 'installment'] as CreditType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setCreditType(type)}
                      style={[
                        styles.typeButton,
                        {
                          backgroundColor: creditType === type 
                            ? theme.colors.accent + '20' 
                            : theme.colors.surface,
                          borderColor: creditType === type 
                            ? theme.colors.accent 
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          {
                            color: creditType === type 
                              ? theme.colors.accent 
                              : theme.colors.textPrimary,
                            fontSize: theme.typography.fontSize.sm,
                            fontWeight: creditType === type 
                              ? theme.typography.fontWeight.semibold 
                              : theme.typography.fontWeight.medium,
                          },
                        ]}
                      >
                        {type === 'credit_card' ? 'Credit Card' : type === 'loan' ? 'Loan' : 'Installment'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {creditType === 'loan' && (
                  <>
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
                      Loan Term (months)
                    </Text>
                    <TextInput
                      placeholder="e.g., 12, 24, 36"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="number-pad"
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary,
                          fontSize: theme.typography.fontSize.md,
                        },
                      ]}
                    />
                  </>
                )}

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
                  Monthly Minimum Payment ({settings.currency})
                </Text>
                <TextInput
                  value={minimumPayment}
                  onChangeText={setMinimumPayment}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                    },
                  ]}
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
                  Payment Due Date (day of month, 1-31)
                </Text>
                <TextInput
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="e.g., 15"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                    },
                  ]}
                />
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
                disabled={isCreating}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.colors.accent,
                    opacity: isCreating ? 0.6 : 1,
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
                  {isCreating ? (isEditMode ? 'Updating...' : 'Creating...') : t('common.save')}
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
    maxHeight: '90%',
    minHeight: 720, // Increased by 30% (400 * 1.3 = 520)
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
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonText: {
    textAlign: 'center',
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

