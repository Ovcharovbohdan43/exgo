import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer, Card } from '../components/layout';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useSettings } from '../state/SettingsProvider';
import { RootStackParamList } from '../navigation/RootNavigator';
import { formatCurrency, getCurrencySymbol } from '../utils/format';
import { getMonthKey } from '../utils/month';
import { trackOnboardingCompleted } from '../services/analytics';
import { useTranslation } from 'react-i18next';

const CURRENCIES = ['USD', 'GBP', 'EUR'] as const;
type Currency = typeof CURRENCIES[number];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type OnboardingNav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen: React.FC = () => {
  const theme = useThemeStyles();
  const navigation = useNavigation<OnboardingNav>();
  const { settings, updateSettings, setOnboarded } = useSettings();
  const { t } = useTranslation();
  const [currency, setCurrency] = useState<Currency>(
    (settings.currency as Currency) || 'USD',
  );
  const [income, setIncome] = useState(
    settings.monthlyIncome ? String(settings.monthlyIncome) : '',
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tempCurrency, setTempCurrency] = useState<Currency>(currency);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigate to Home when onboarding is completed
  useEffect(() => {
    if (settings.isOnboarded) {
      console.log('[OnboardingScreen] Onboarding completed, navigating to Home...');
      // Delay to ensure state is fully updated and navigation is ready
      const timer = setTimeout(() => {
        try {
          // Use reset to clear navigation stack and navigate to Home
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
          console.log('[OnboardingScreen] Navigation to Home successful');
        } catch (error) {
          console.error('[OnboardingScreen] Navigation error:', error);
          // Fallback to replace if reset fails
          try {
            navigation.replace('Home');
          } catch (replaceError) {
            console.error('[OnboardingScreen] Replace also failed:', replaceError);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [settings.isOnboarded, navigation]);

  const handleCurrencySelect = (selectedCurrency: Currency) => {
    setTempCurrency(selectedCurrency);
  };

  const handleCurrencyConfirm = () => {
    setCurrency(tempCurrency);
    setPickerVisible(false);
  };

  const handleSave = async () => {
    const parsedIncome = Number(income);
    
    // Validation
    if (!income.trim()) {
      setError(t('onboarding.errorIncomeRequired'));
      return;
    }
    
    if (isNaN(parsedIncome) || parsedIncome <= 0) {
      setError(t('onboarding.errorIncomeInvalid'));
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const currencyToSave = currency || 'USD';
      console.log('[OnboardingScreen] Saving settings:', { currency: currencyToSave, monthlyIncome: parsedIncome });
      // Save all settings including isOnboarded and firstMonthKey in one call to ensure consistency
      const currentMonthKey = getMonthKey(); // Get current month as first month
      await updateSettings({
        currency: currencyToSave,
        monthlyIncome: parsedIncome,
        isOnboarded: true,
        firstMonthKey: currentMonthKey, // Set current month as first month of usage
      });
      console.log('[OnboardingScreen] Settings saved successfully, onboarding completed');
      
      // Track onboarding completion
      trackOnboardingCompleted({
        currency: currencyToSave,
        monthlyIncome: parsedIncome,
      });
      
      // State is updated, useEffect will trigger navigation
      // Small delay to ensure state propagation
      setIsSaving(false);
    } catch (err) {
      console.error('[OnboardingScreen] Error saving settings:', err);
      setError(t('settings.saveError'));
      setIsSaving(false);
    }
  };

  const isFormValid = income.trim() && Number(income) > 0;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View
          style={[
            styles.container,
            { paddingTop: SCREEN_HEIGHT * 0.2 }, // Поднимаем форму выше на 20%
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.xxxl,
                  fontWeight: theme.typography.fontWeight.bold,
                },
              ]}
            >
              {t('onboarding.title')}
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.md,
                },
              ]}
            >
              {t('onboarding.subtitle')}
            </Text>
          </View>

          {/* Form Card - Centered */}
          <View style={styles.formContainer}>
            <Card variant="elevated" padding="lg" style={styles.formCard}>
              {/* Currency Selection Field */}
              <View style={styles.fieldContainer}>
                <Text
                  style={[
                    styles.label,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  Currency
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTempCurrency(currency);
                    setPickerVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Card
                    variant="outlined"
                    padding="none"
                    style={{
                      ...styles.inputCard,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <View style={styles.currencyRow}>
                      <Text
                        style={[
                          styles.currencyText,
                          {
                            color: theme.colors.textPrimary,
                            fontSize: theme.typography.fontSize.lg,
                            fontWeight: theme.typography.fontWeight.semibold,
                          },
                        ]}
                      >
                        {currency}
                      </Text>
                      <Text
                        style={[
                          styles.chevron,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        ▼
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              </View>

              {/* Income Input Field */}
              <View style={styles.fieldContainer}>
                <Text
                  style={[
                    styles.label,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  Monthly Income
                </Text>
                <View style={styles.incomeInputContainer}>
                  <Card
                    variant="outlined"
                    padding="none"
                    style={{
                      ...styles.inputCard,
                      borderColor: error
                        ? theme.colors.danger
                        : theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <View style={styles.incomeRow}>
                      <Text
                        style={[
                          styles.currencyPrefix,
                          {
                            color: theme.colors.textMuted,
                            fontSize: theme.typography.fontSize.lg,
                            fontWeight: theme.typography.fontWeight.medium,
                          },
                        ]}
                      >
                        {getCurrencySymbol(currency || 'USD')}
                      </Text>
                      <TextInput
                        placeholder="0"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="numeric"
                        value={income}
                        onChangeText={(text) => {
                          setIncome(text);
                          setError(null);
                        }}
                        style={[
                          styles.input,
                          {
                            color: theme.colors.textPrimary,
                            fontSize: theme.typography.fontSize.lg,
                          },
                        ]}
                        returnKeyType="done"
                        onSubmitEditing={handleSave}
                      />
                    </View>
                  </Card>
                  {error && (
                    <Text
                      style={[
                        styles.errorText,
                        {
                          color: theme.colors.danger,
                          fontSize: theme.typography.fontSize.xs,
                        },
                      ]}
                    >
                      {error}
                    </Text>
                  )}
                </View>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={!isFormValid || isSaving}
                activeOpacity={0.8}
                style={[
                  styles.continueButton,
                  {
                    backgroundColor: isFormValid
                      ? theme.colors.accent
                      : theme.colors.border,
                    opacity: isFormValid && !isSaving ? 1 : 0.6,
                  },
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text
                    style={[
                      styles.continueButtonText,
                      {
                        color: theme.colors.background,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.semibold,
                      },
                    ]}
                  >
                    {t('onboarding.continue')}
                  </Text>
                )}
              </TouchableOpacity>
            </Card>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Currency Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.colors.card,
                borderTopLeftRadius: theme.radii.lg,
                borderTopRightRadius: theme.radii.lg,
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text
              style={[
                styles.modalTitle,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                },
              ]}
            >
              {t('onboarding.currencyLabel')}
            </Text>
            <View style={styles.modalList}>
              {CURRENCIES.map((code) => {
                const selected = tempCurrency === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => handleCurrencySelect(code)}
                    activeOpacity={0.7}
                  >
                    <Card
                      variant={selected ? 'outlined' : 'default'}
                      padding="md"
                      style={{
                        ...styles.currencyOption,
                        ...(selected && {
                          borderColor: theme.colors.accent,
                          backgroundColor: theme.colors.accentLight,
                        }),
                      }}
                    >
                      <Text
                        style={[
                          styles.currencyOptionText,
                          {
                            color: selected
                              ? theme.colors.accent
                              : theme.colors.textPrimary,
                            fontSize: theme.typography.fontSize.md,
                            fontWeight: selected
                              ? theme.typography.fontWeight.semibold
                              : theme.typography.fontWeight.regular,
                          },
                        ]}
                      >
                        {code}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => setPickerVisible(false)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: theme.colors.accent,
                  },
                ]}
                onPress={handleCurrencyConfirm}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    {
                      color: theme.colors.background,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.semibold,
                    },
                  ]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  formCard: {
    width: '100%',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  inputCard: {
    height: 56, // Фиксированная высота для обоих полей
    justifyContent: 'center', // Центрируем содержимое по вертикали
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, // Одинаковый padding как в incomeRow
    height: '100%', // Занимает всю высоту карточки
  },
  currencyText: {
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  incomeInputContainer: {
    width: '100%',
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%', // Занимает всю высоту карточки
  },
  currencyPrefix: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    height: '100%', // Занимает всю высоту родителя
  },
  errorText: {
    marginTop: 6,
    marginLeft: 4,
  },
  continueButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  modalList: {
    gap: 12,
    marginBottom: 24,
  },
  currencyOption: {
    minHeight: 56,
    justifyContent: 'center',
  },
  currencyOptionText: {
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {},
  modalButtonText: {
    textAlign: 'center',
  },
});

export default OnboardingScreen;
