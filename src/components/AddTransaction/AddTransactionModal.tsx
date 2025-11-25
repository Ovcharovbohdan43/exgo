import React, { useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { useSettings } from '../../state/SettingsProvider';
import { useTransactions } from '../../state/TransactionsProvider';
import { useCreditProducts } from '../../state/CreditProductsProvider';
import { TransactionType, Transaction } from '../../types';
import { AmountInputStep } from './AmountInputStep';
import { CategorySelectionStep } from './CategorySelectionStep';
import { ConfirmStep } from './ConfirmStep';
import { parseMonthKey, getMonthKey } from '../../utils/month';
import { trackTransactionCreated, trackTransactionUpdated } from '../../services/analytics';
import { useTranslation } from 'react-i18next';

type AddTransactionModalProps = {
  visible: boolean;
  initialType?: TransactionType;
  transactionToEdit?: Transaction | null; // Transaction to edit (if provided, modal works in edit mode)
  currentMonth?: string; // Current month key (YYYY-MM) - if provided, new transactions will use this month's date
  onClose: () => void;
  onPlanSelect?: () => void; // Callback when user selects "Plan" option
};

type Step = 'type' | 'amount' | 'category' | 'confirm';

/**
 * AddTransactionModal - Full modal flow for adding a transaction
 * Steps: Type selection → Amount input → Category selection → Confirm
 */
export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  initialType,
  transactionToEdit,
  currentMonth,
  onClose,
  onPlanSelect,
}) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { addTransaction, updateTransaction } = useTransactions();
  const { applyPayment } = useCreditProducts();
  const isEditMode = !!transactionToEdit;

  // Debug: Log currency when modal opens
  React.useEffect(() => {
    if (visible) {
      console.log('[AddTransactionModal] Current currency:', settings.currency);
    }
  }, [visible, settings.currency]);

  const [step, setStep] = useState<Step>(initialType ? 'amount' : 'type');
  const [type, setType] = useState<TransactionType | null>(initialType || null);
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string | null>(null);
  const [creditProductId, setCreditProductId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes or transactionToEdit changes
  React.useEffect(() => {
    if (visible) {
      if (transactionToEdit) {
        // Edit mode: pre-fill with transaction data
        setStep('amount');
        setType(transactionToEdit.type);
        setAmount(String(transactionToEdit.amount));
        setCategory(transactionToEdit.category || null);
        setCreditProductId(transactionToEdit.creditProductId || null);
      } else {
        // Add mode: reset to defaults
        setStep(initialType ? 'amount' : 'type');
        setType(initialType || null);
        setAmount('');
        setCategory(null);
        setCreditProductId(null);
      }
      setError(null);
      setIsSaving(false);
    }
  }, [visible, initialType, transactionToEdit]);

  const handleTypeSelect = useCallback((selectedType: TransactionType) => {
    setType(selectedType);
    setError(null);
    setCategory(null); // Reset category when type changes
    setCreditProductId(null); // Reset credit product when type changes
    
    // Auto-select category only for saved
    if (selectedType === 'saved') {
      setCategory('Savings');
      setStep('amount');
    } else if (selectedType === 'credit') {
      // For credit, set category to "Credits" and go directly to category step
      // This will show credit product selection/creation
      setCategory('Credits');
      setStep('category');
    } else {
      // For income and expense, let user select category
      setStep('amount');
    }
  }, []);

  const handleAmountNext = useCallback(() => {
    const numAmount = parseFloat(amount);
    
    if (!amount.trim() || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    setError(null);
    
    // If category is already set (saved), go to confirm
    // For credit, category step is already done (product selected), so go to confirm
    // For income and expense, always go to category selection
    if (type === 'saved' && category) {
      setStep('confirm');
    } else if (type === 'credit' && creditProductId) {
      // Credit product already selected, go to confirm
      setStep('confirm');
    } else if (type === 'credit') {
      // Credit type but no product selected yet, go back to category step
      setStep('category');
    } else {
      setStep('category');
    }
  }, [amount, type, category, creditProductId]);

  const handleCategoryNext = useCallback(() => {
    if (!category) {
      setError('Please select a category');
      return;
    }

    // For credit transactions, require creditProductId
    if (type === 'credit' && !creditProductId) {
      setError('Please select a credit product');
      return;
    }

    setError(null);
    setStep('confirm');
  }, [category, type, creditProductId]);

  const handleConfirm = useCallback(async () => {
    if (!type || !amount || !category) {
      setError('Please complete all fields');
      return;
    }

    // For credit transactions, require creditProductId
    if (type === 'credit' && !creditProductId) {
      setError('Please select a credit product');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Invalid amount');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isEditMode && transactionToEdit) {
        // Update existing transaction
        await updateTransaction(transactionToEdit.id, {
          type,
          amount: numAmount,
          category,
          creditProductId: type === 'credit' ? creditProductId : undefined,
          createdAt: transactionToEdit.createdAt, // Keep original date
        });

        const typeLabel = t(`transactions.type.${type}`);
        Alert.alert(t('alerts.success'), t('alerts.transactionUpdated', { type: typeLabel }), [
          {
            text: t('alerts.ok'),
            onPress: () => {
              onClose();
            },
          },
        ]);
      } else {
        // Add new transaction
        // Always use current date and time to ensure correct day grouping
        // This ensures transactions are added to the correct day block
        const now = new Date();
        const createdAt = now.toISOString();
        
        // For credit transactions, use 'Credits' category for consistency in expense breakdown
        const finalCategory = type === 'credit' ? 'Credits' : category;
        
        await addTransaction({
          type,
          amount: numAmount,
          category: finalCategory,
          creditProductId: type === 'credit' ? creditProductId : undefined,
          createdAt,
        });

        // Apply payment to credit product if this is a credit transaction
        if (type === 'credit' && creditProductId) {
          try {
            await applyPayment(creditProductId, numAmount);
          } catch (err) {
            console.error('[AddTransactionModal] Failed to apply payment to credit product:', err);
            // Don't fail the transaction if payment application fails
          }
        }

        // Track transaction creation
        trackTransactionCreated({
          type,
          amount: numAmount,
          category,
          month: getMonthKey(new Date(createdAt)),
        });

        const typeLabel = t(`transactions.type.${type}`);
        Alert.alert(t('alerts.success'), t('alerts.transactionAdded', { type: typeLabel }), [
          {
            text: t('alerts.ok'),
            onPress: () => {
              onClose();
            },
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
      setIsSaving(false);
    }
  }, [type, amount, category, creditProductId, isEditMode, transactionToEdit, addTransaction, updateTransaction, applyPayment, onClose]);

  const handleBack = useCallback(() => {
    setError(null);
    if (step === 'confirm') {
      if (type === 'income' || (type === 'saved' && category) || (type === 'credit' && category)) {
        setStep('amount');
      } else {
        setStep('category');
      }
    } else if (step === 'category') {
      setStep('amount');
    } else if (step === 'amount') {
      if (initialType) {
        onClose();
      } else {
        setStep('type');
      }
    } else {
      onClose();
    }
  }, [step, type, category, initialType, onClose]);

  const handleClose = useCallback(() => {
    if (isSaving) return;
    
    Alert.alert(
      t('alerts.cancelTransaction'),
      t('alerts.cancelTransactionConfirm'),
      [
        { text: t('alerts.continueEditing'), style: 'cancel' },
        {
          text: t('common.cancel'),
          style: 'destructive',
          onPress: onClose,
        },
      ],
    );
  }, [isSaving, onClose]);

  const renderStep = () => {
    if (step === 'type') {
      return (
        <View style={styles.typeContainer}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing.lg,
              textAlign: 'center',
            }}
          >
{t('addTransaction.selectType')}
          </Text>
          {[
            { type: 'expense' as TransactionType, label: t('transactions.type.expense'), emoji: '💸', color: theme.colors.danger },
            { type: 'income' as TransactionType, label: t('transactions.type.income'), emoji: '💰', color: theme.colors.positive },
            { type: 'saved' as TransactionType, label: t('transactions.type.saved'), emoji: '💾', color: theme.colors.accent },
            { type: 'credit' as TransactionType, label: t('transactions.type.credit', { defaultValue: 'Credit' }), emoji: '💳', color: theme.colors.warning || '#FFA500' },
          ].map((item) => (
            <TouchableOpacity
              key={item.type}
              onPress={() => handleTypeSelect(item.type)}
              activeOpacity={0.7}
              style={styles.typeButton}
            >
              <View
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: item.color,
                  },
                ]}
              >
                <Text style={styles.typeEmoji}>{item.emoji}</Text>
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
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Plan Option */}
          {onPlanSelect && (
            <TouchableOpacity
              onPress={() => {
                onPlanSelect();
                onClose();
              }}
              activeOpacity={0.7}
              style={styles.typeButton}
            >
              <View
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.accent,
                  },
                ]}
              >
                <Text style={styles.typeEmoji}>📋</Text>
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
                  {t('miniBudgets.createTitle')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (step === 'amount') {
      return (
        <AmountInputStep
          amount={amount}
          currency={settings.currency}
          onChange={setAmount}
          error={error}
        />
      );
    }

    if (step === 'category' && type) {
      return (
        <CategorySelectionStep
          type={type}
          selectedCategory={category}
          onSelect={(cat) => {
            setCategory(cat);
          }}
          selectedCreditProductId={creditProductId}
          onSelectCreditProduct={(productId) => {
            setCreditProductId(productId);
            setCategory('Credits'); // Ensure category is set to 'Credits' for expense breakdown
            // After selecting credit product, automatically go to amount step
            if (type === 'credit') {
              setStep('amount');
            }
          }}
        />
      );
    }

    if (step === 'confirm') {
      // Validate required fields
      if (!type || !amount || !category) {
        console.warn('[AddTransactionModal] Confirm step missing required fields:', {
          type,
          amount,
          category,
          creditProductId,
        });
        return null;
      }

      // For credit transactions, also require creditProductId
      if (type === 'credit' && !creditProductId) {
        console.warn('[AddTransactionModal] Credit transaction missing creditProductId');
        return null;
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        console.warn('[AddTransactionModal] Invalid amount in confirm step:', amount);
        return null;
      }

      return (
        <ConfirmStep
          type={type}
          amount={numAmount}
          category={category}
          creditProductId={creditProductId}
          currency={settings.currency}
          createdAt={new Date().toISOString()}
        />
      );
    }

    return null;
  };

  const canGoNext = () => {
    if (step === 'amount') {
      const numAmount = parseFloat(amount);
      return !isNaN(numAmount) && numAmount > 0;
    }
    if (step === 'category') {
      // For credit, require creditProductId; for others, require category
      if (type === 'credit') {
        return !!creditProductId;
      }
      return !!category;
    }
    if (step === 'confirm') {
      // For credit, also require creditProductId
      if (type === 'credit') {
        return !isSaving && !!type && !!amount && !!category && !!creditProductId;
      }
      return !isSaving && !!type && !!amount && !!category;
    }
    return false;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
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
          
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              disabled={isSaving}
              style={styles.backButton}
            >
              <Text
                style={[
                  styles.backButtonText,
                  {
                    color: theme.colors.accent,
                    fontSize: theme.typography.fontSize.md,
                  },
                ]}
              >
                {step === 'type' ? 'Cancel' : 'Back'}
              </Text>
            </TouchableOpacity>
            
            <Text
              style={[
                styles.headerTitle,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                },
              ]}
            >
              {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
            </Text>
            
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.stepIndicator}>
            {['type', 'amount', 'category', 'confirm'].map((s, index) => {
              const stepIndex = ['type', 'amount', 'category', 'confirm'].indexOf(step);
              const isActive = index <= stepIndex;
              return (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: isActive ? theme.colors.accent : theme.colors.border,
                    },
                  ]}
                />
              );
            })}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>

          {error && (
            <Text
              style={[
                styles.errorText,
                {
                  color: theme.colors.danger,
                  fontSize: theme.typography.fontSize.sm,
                },
              ]}
            >
              {error}
            </Text>
          )}

          <View style={styles.footer}>
            {step === 'amount' && (
              <TouchableOpacity
                onPress={handleAmountNext}
                disabled={!canGoNext() || isSaving}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor: canGoNext() && !isSaving 
                      ? theme.colors.accent 
                      : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.nextButtonText,
                    {
                      color: canGoNext() && !isSaving 
                        ? theme.colors.background 
                        : theme.colors.textMuted,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.semibold,
                    },
                  ]}
                >
                  Next
                </Text>
              </TouchableOpacity>
            )}

            {step === 'category' && (
              <TouchableOpacity
                onPress={handleCategoryNext}
                disabled={!canGoNext() || isSaving}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor: canGoNext() && !isSaving 
                      ? theme.colors.accent 
                      : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.nextButtonText,
                    {
                      color: canGoNext() && !isSaving 
                        ? theme.colors.background 
                        : theme.colors.textMuted,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.semibold,
                    },
                  ]}
                >
                  Next
                </Text>
              </TouchableOpacity>
            )}

            {step === 'confirm' && (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!canGoNext() || isSaving}
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: canGoNext() && !isSaving 
                      ? theme.colors.positive 
                      : theme.colors.border,
                  },
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text
                    style={[
                      styles.confirmButtonText,
                      {
                        color: canGoNext() && !isSaving 
                          ? theme.colors.background 
                          : theme.colors.textMuted,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.semibold,
                      },
                    ]}
                  >
                    {isEditMode ? 'Save Changes' : 'Confirm & Save'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContent: {
    maxHeight: '98%', // Increased by ~3% to accommodate content better
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  backButton: {
    minWidth: 60,
  },
  backButtonText: {
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 60,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    maxHeight: 653, // Increased by 10% from 594 to 653 to avoid scrolling
  },
  contentContainer: {
    paddingHorizontal: 24,
    minHeight: 200,
    paddingBottom: 16,
  },
  typeContainer: {
    gap: 12,
  },
  typeButton: {
    marginBottom: 12,
  },
  typeCard: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
  },
  typeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  nextButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    textAlign: 'center',
  },
  confirmButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
  },
});

