import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSettings } from '../state/SettingsProvider';
import { useTransactions } from '../state/TransactionsProvider';
import { resetStorage } from '../services/storage';
import { useThemeStyles, useTheme } from '../theme/ThemeProvider';
import { MonthPicker } from '../components/MonthPicker';
import { ErrorState } from '../components/states';
import { generateReportHTML, MonthlyReportData } from '../utils/pdfReport';
import { getMonthKey, formatMonthName } from '../utils/month';
import { ThemePreference, SupportedLanguage } from '../types';
import { BUTTON_HIT_SLOP } from '../utils/accessibility';
import { checkBiometricAvailability, validatePIN, hashPIN } from '../services/authentication';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n';

type TabType = 'personalization' | 'general' | 'security';

const SettingsScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { setColorScheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { resetTransactions, transactionsByMonth } = useTransactions();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('personalization');
  const [currency, setCurrency] = useState(settings.currency);
  const [income, setIncome] = useState(String(settings.monthlyIncome));
  const currentLanguage = settings.language || 'en';
  const [exportMonth, setExportMonth] = useState(getMonthKey());
  const [isExporting, setIsExporting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Security settings state
  const [enableBiometric, setEnableBiometric] = useState(settings.enableBiometric || false);
  const [enablePIN, setEnablePIN] = useState(settings.enablePIN || false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('');
  const [showPINSetup, setShowPINSetup] = useState(false);
  
  const currentThemePreference: ThemePreference = settings.themePreference || 'system';
  const { error: settingsError } = useSettings();

  // Check biometric availability
  React.useEffect(() => {
    const checkBiometric = async () => {
      const biometric = await checkBiometricAvailability();
      setBiometricAvailable(biometric.available);
      setBiometricName(biometric.name);
    };
    checkBiometric();
  }, []);

  // Sync security settings with state
  React.useEffect(() => {
    setEnableBiometric(settings.enableBiometric || false);
    setEnablePIN(settings.enablePIN || false);
  }, [settings.enableBiometric, settings.enablePIN]);

  // Sync local state with settings when they change
  React.useEffect(() => {
    setCurrency(settings.currency);
    setIncome(String(settings.monthlyIncome));
  }, [settings.currency, settings.monthlyIncome]);

  const handleSave = async () => {
    try {
      setSaveError(null);
      const monthlyIncome = Number(income) || 0;
      await updateSettings({ currency: currency || 'USD', monthlyIncome });
      Alert.alert(t('alerts.success'), t('alerts.settingsSaved'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setSaveError(errorMessage);
      console.error('[SettingsScreen] Save error:', error);
    }
  };

  const handleThemeChange = async (preference: ThemePreference) => {
    await updateSettings({ themePreference: preference });
    setColorScheme(preference);
  };

  const handleLanguageChange = async (language: SupportedLanguage) => {
    await updateSettings({ language });
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      const monthTransactions = transactionsByMonth[exportMonth] || [];
      
      if (monthTransactions.length === 0) {
        Alert.alert(t('alerts.noData'), t('alerts.noTransactionsForMonth'));
        setIsExporting(false);
        return;
      }

      const reportData: MonthlyReportData = {
        monthKey: exportMonth,
        transactions: monthTransactions,
        monthlyIncome: settings.monthlyIncome,
        currency: settings.currency,
      };

      const html = generateReportHTML(reportData);

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612, // US Letter width in points
        height: 792, // US Letter height in points
      });

      // Create readable filename
      const monthName = formatMonthName(exportMonth);
      // Replace spaces with underscores and remove special characters for valid filename
      const sanitizedMonthName = monthName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const fileName = `exgo_report_${sanitizedMonthName}.pdf`;
      const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      const newUri = `${directory}${fileName}`;

      // Rename the file to have a readable name using legacy API
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Share the PDF
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: t('alerts.exportMonthlyReport'),
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          t('alerts.pdfGenerated'),
          t('alerts.pdfSavedTo', { path: newUri }),
          [{ text: t('alerts.ok') }]
        );
      }
    } catch (error) {
      console.error('[SettingsScreen] PDF export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export PDF. Please try again.';
      setExportError(errorMessage);
      Alert.alert(t('alerts.error'), errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = async () => {
    Alert.alert(t('alerts.resetAllData'), t('alerts.resetConfirm'), [
      { text: t('alerts.cancel'), style: 'cancel' },
      {
        text: t('alerts.reset'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear storage first
            await resetStorage();
            // Reset both providers to defaults
            await updateSettings({ currency: 'USD', monthlyIncome: 0, isOnboarded: false });
            await resetTransactions();
            Alert.alert(t('alerts.success'), t('alerts.allDataReset'));
          } catch (error) {
            Alert.alert(t('alerts.error'), t('alerts.resetError'));
            console.error('[SettingsScreen] Reset error:', error);
          }
        },
      },
    ]);
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled && !biometricAvailable) {
      Alert.alert(
        t('settings.biometricAuth'),
        t('settings.biometricNotAvailable', { name: biometricName })
      );
      return;
    }
    setEnableBiometric(enabled);
    await updateSettings({ enableBiometric: enabled });
  };

  const handlePINToggle = async (enabled: boolean) => {
    if (enabled && !settings.pin) {
      // Show PIN setup
      setShowPINSetup(true);
      return;
    }
    setEnablePIN(enabled);
    await updateSettings({ enablePIN: enabled });
  };

  const handlePINSetup = async () => {
    if (!validatePIN(pin)) {
      Alert.alert(t('alerts.invalidPIN'), t('alerts.pinMustBeDigits'));
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert(t('alerts.pinMismatch'), t('alerts.pinsDoNotMatch'));
      setPin('');
      setConfirmPin('');
      return;
    }

    const hashedPIN = hashPIN(pin);
    console.log('[SettingsScreen] Setting PIN:', { 
      pinLength: pin.length, 
      hashedLength: hashedPIN.length,
      pin: pin.replace(/./g, '*'), // Mask in logs
    });
    await updateSettings({
      enablePIN: true,
      pin: hashedPIN,
    });
    setPin('');
    setConfirmPin('');
    setShowPINSetup(false);
    setEnablePIN(true);
    Alert.alert(t('alerts.success'), t('alerts.pinSetSuccess'));
  };

  const handlePINChange = async () => {
    if (!validatePIN(pin)) {
      Alert.alert(t('alerts.invalidPIN'), t('alerts.pinMustBeDigits'));
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert(t('alerts.pinMismatch'), t('alerts.pinsDoNotMatch'));
      setPin('');
      setConfirmPin('');
      return;
    }

    const hashedPIN = hashPIN(pin);
    await updateSettings({ pin: hashedPIN });
    setPin('');
    setConfirmPin('');
    setShowPINSetup(false);
    Alert.alert(t('alerts.success'), t('alerts.pinChangedSuccess'));
  };

  const handlePINRemove = async () => {
    Alert.alert(
      t('settings.removePin'),
      t('alerts.removePINConfirm'),
      [
        { text: t('alerts.cancel'), style: 'cancel' },
        {
          text: t('settings.removePin'),
          style: 'destructive',
          onPress: async () => {
            await updateSettings({
              enablePIN: false,
              pin: undefined,
            });
            setEnablePIN(false);
            Alert.alert(t('alerts.success'), t('alerts.pinRemovedSuccess'));
          },
        },
      ]
    );
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'personalization', label: 'Personalization' },
    { id: 'security', label: 'Security' },
    { id: 'general', label: 'General' },
  ];

  const renderPersonalizationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>
          Theme
        </Text>
        <View style={styles.themeOptions}>
          {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => {
            const isSelected = currentThemePreference === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => handleThemeChange(option)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                    borderWidth: 1,
                  },
                ]}
                accessible={true}
                accessibilityLabel={`${option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'} theme${isSelected ? ', selected' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityHint="Double tap to change theme"
                hitSlop={BUTTON_HIT_SLOP}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color: isSelected ? theme.colors.background : theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: isSelected
                        ? theme.typography.fontWeight.semibold
                        : theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.xs }]}>
          {t('settings.language')}
        </Text>
        <View style={styles.themeOptions}>
          {supportedLanguages.map((lang) => {
            const isSelected = currentLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                    borderWidth: 1,
                  },
                ]}
                accessible={true}
                accessibilityLabel={`${lang.name}${isSelected ? ', selected' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityHint="Double tap to change language"
                hitSlop={BUTTON_HIT_SLOP}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color: isSelected ? theme.colors.background : theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: isSelected
                        ? theme.typography.fontWeight.semibold
                        : theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {lang.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>Currency</Text>
        <TextInput
          value={currency}
          onChangeText={setCurrency}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          autoCapitalize="characters"
          placeholder="USD"
          placeholderTextColor={theme.colors.textSecondary}
          accessible={true}
          accessibilityLabel="Currency input"
          accessibilityHint="Enter your currency code, for example USD, EUR, or GBP"
        />
        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
          Monthly income
        </Text>
        <TextInput
          value={income}
          onChangeText={setIncome}
          keyboardType="numeric"
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          placeholder="0"
          placeholderTextColor={theme.colors.textSecondary}
          accessible={true}
          accessibilityLabel="Monthly income input"
          accessibilityHint="Enter your monthly income amount"
        />
        {saveError && (
          <ErrorState
            message={saveError}
            onRetry={handleSave}
            retryLabel="Retry Save"
            style={{ marginTop: theme.spacing.md }}
          />
        )}
        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: theme.colors.accent,
              marginTop: theme.spacing.lg,
            },
          ]}
          accessible={true}
          accessibilityLabel="Save settings"
          accessibilityRole="button"
          accessibilityHint="Double tap to save your settings"
          hitSlop={BUTTON_HIT_SLOP}
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
            Save
          </Text>
        </TouchableOpacity>

        <View style={[styles.section, { marginTop: theme.spacing.xl, paddingTop: theme.spacing.xl, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing.md,
              },
            ]}
          >
            Export Report
          </Text>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.xs,
              },
            ]}
          >
            Select month to export
          </Text>
          <MonthPicker value={exportMonth} onChange={setExportMonth} />
          {exportError && (
            <ErrorState
              message={exportError}
              onRetry={() => {
                setExportError(null);
                handleExportPDF();
              }}
              retryLabel="Retry Export"
              style={{ marginTop: theme.spacing.md }}
            />
          )}
          <TouchableOpacity
            onPress={handleExportPDF}
            disabled={isExporting}
            style={[
              styles.exportButton,
              {
                backgroundColor: isExporting ? theme.colors.border : theme.colors.accent,
                marginTop: theme.spacing.md,
              },
            ]}
            accessible={true}
            accessibilityLabel={isExporting ? 'Exporting PDF' : 'Export PDF report'}
            accessibilityRole="button"
            accessibilityState={{ disabled: isExporting }}
            accessibilityHint="Double tap to export monthly report as PDF"
            hitSlop={BUTTON_HIT_SLOP}
          >
            {isExporting ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text
                style={[
                  styles.exportButtonText,
                  {
                    color: theme.colors.background,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight: theme.typography.fontWeight.semibold,
                  },
                ]}
              >
                Export PDF Report
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSecurityTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        {/* Biometric Authentication */}
        <View style={styles.securitySection}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing.md,
              },
            ]}
          >
            Biometric Authentication
          </Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {biometricName || 'Biometric'}
              </Text>
              <Text
                style={[
                  styles.description,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                    marginTop: 4,
                  },
                ]}
              >
                {biometricAvailable
                  ? `Use ${biometricName} to unlock the app`
                  : `${biometricName || 'Biometric'} is not available on this device`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleBiometricToggle(!enableBiometric)}
              disabled={!biometricAvailable}
              style={[
                styles.toggle,
                {
                  backgroundColor: enableBiometric ? theme.colors.accent : theme.colors.border,
                  opacity: biometricAvailable ? 1 : 0.5,
                },
              ]}
              accessible={true}
              accessibilityLabel={`${enableBiometric ? 'Disable' : 'Enable'} ${biometricName || 'biometric'} authentication`}
              accessibilityRole="switch"
              accessibilityState={{ checked: enableBiometric, disabled: !biometricAvailable }}
              hitSlop={BUTTON_HIT_SLOP}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: theme.colors.background,
                    transform: [{ translateX: enableBiometric ? 20 : 0 }],
                  },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* PIN Authentication */}
        <View style={[styles.securitySection, { marginTop: theme.spacing.xl, paddingTop: theme.spacing.xl, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing.md,
              },
            ]}
          >
            PIN Code
          </Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                PIN Authentication
              </Text>
              <Text
                style={[
                  styles.description,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                    marginTop: 4,
                  },
                ]}
              >
                Use a PIN code to unlock the app
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handlePINToggle(!enablePIN)}
              style={[
                styles.toggle,
                {
                  backgroundColor: enablePIN ? theme.colors.accent : theme.colors.border,
                },
              ]}
              accessible={true}
              accessibilityLabel={`${enablePIN ? 'Disable' : 'Enable'} PIN authentication`}
              accessibilityRole="switch"
              accessibilityState={{ checked: enablePIN }}
              hitSlop={BUTTON_HIT_SLOP}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: theme.colors.background,
                    transform: [{ translateX: enablePIN ? 20 : 0 }],
                  },
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* PIN Setup/Change */}
          {showPINSetup && (
            <View style={[styles.pinSetup, { marginTop: theme.spacing.lg }]}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.xs,
                  },
                ]}
              >
                {settings.pin ? 'Change PIN' : 'Set PIN'}
              </Text>
              <TextInput
                value={pin}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Enter PIN (4-6 digits)"
                placeholderTextColor={theme.colors.textSecondary}
                accessible={true}
                accessibilityLabel="PIN input"
                accessibilityHint="Enter a 4 to 6 digit PIN code"
              />
              <TextInput
                value={confirmPin}
                onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    marginTop: theme.spacing.md,
                  },
                ]}
                placeholder="Confirm PIN"
                placeholderTextColor={theme.colors.textSecondary}
                accessible={true}
                accessibilityLabel="Confirm PIN input"
                accessibilityHint="Re-enter your PIN to confirm"
              />
              <View style={styles.pinButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowPINSetup(false);
                    setPin('');
                    setConfirmPin('');
                  }}
                  style={[
                    styles.pinButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderWidth: 1,
                      marginRight: theme.spacing.sm,
                    },
                  ]}
                  accessible={true}
                  accessibilityLabel="Cancel PIN setup"
                  accessibilityRole="button"
                  hitSlop={BUTTON_HIT_SLOP}
                >
                  <Text
                    style={[
                      styles.pinButtonText,
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
                  onPress={settings.pin ? handlePINChange : handlePINSetup}
                  disabled={pin.length < 4 || pin !== confirmPin}
                  style={[
                    styles.pinButton,
                    {
                      backgroundColor: pin.length >= 4 && pin === confirmPin ? theme.colors.accent : theme.colors.border,
                      flex: 1,
                    },
                  ]}
                  accessible={true}
                  accessibilityLabel={settings.pin ? 'Change PIN' : 'Set PIN'}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: pin.length < 4 || pin !== confirmPin }}
                  hitSlop={BUTTON_HIT_SLOP}
                >
                  <Text
                    style={[
                      styles.pinButtonText,
                      {
                        color: pin.length >= 4 && pin === confirmPin ? theme.colors.background : theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.semibold,
                      },
                    ]}
                  >
                    {settings.pin ? 'Change' : 'Set'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Change/Remove PIN */}
          {settings.pin && !showPINSetup && (
            <View style={[styles.pinActions, { marginTop: theme.spacing.md }]}>
              <TouchableOpacity
                onPress={() => setShowPINSetup(true)}
                style={[
                  styles.pinActionButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    marginRight: theme.spacing.sm,
                  },
                ]}
                accessible={true}
                accessibilityLabel="Change PIN"
                accessibilityRole="button"
                hitSlop={BUTTON_HIT_SLOP}
              >
                <Text
                  style={[
                    styles.pinActionText,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.sm,
                    },
                  ]}
                >
                  Change PIN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePINRemove}
                style={[
                  styles.pinActionButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.danger,
                    borderWidth: 1,
                  },
                ]}
                accessible={true}
                accessibilityLabel="Remove PIN"
                accessibilityRole="button"
                hitSlop={BUTTON_HIT_SLOP}
              >
                <Text
                  style={[
                    styles.pinActionText,
                    {
                      color: theme.colors.danger,
                      fontSize: theme.typography.fontSize.sm,
                    },
                  ]}
                >
                  Remove PIN
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderGeneralTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        <TouchableOpacity
          onPress={handleReset}
          style={[
            styles.resetButton,
            {
              backgroundColor: theme.colors.danger,
            },
          ]}
          accessible={true}
          accessibilityLabel="Reset all data"
          accessibilityRole="button"
          accessibilityHint="Double tap to reset all settings and transactions. This action cannot be undone."
          hitSlop={BUTTON_HIT_SLOP}
        >
          <Text
            style={[
              styles.resetButtonText,
              {
                color: theme.colors.background,
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
          >
            Reset all data
          </Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.resetDescription,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
              marginTop: theme.spacing.sm,
            },
          ]}
        >
          This will clear all settings and transactions. This action cannot be undone.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Tabs */}
      <View
        style={[
          styles.tabsContainer,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && {
                borderBottomColor: theme.colors.accent,
                borderBottomWidth: 2,
              },
            ]}
            accessible={true}
            accessibilityLabel={`${tab.label} tab${activeTab === tab.id ? ', selected' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
            accessibilityHint={`Double tap to switch to ${tab.label} tab`}
            hitSlop={BUTTON_HIT_SLOP}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: activeTab === tab.id ? theme.colors.accent : theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.md,
                  fontWeight:
                    activeTab === tab.id
                      ? theme.typography.fontWeight.semibold
                      : theme.typography.fontWeight.medium,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'personalization' && renderPersonalizationTab()}
        {activeTab === 'security' && renderSecurityTab()}
        {activeTab === 'general' && renderGeneralTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    textAlign: 'center',
  },
  resetButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    textAlign: 'center',
  },
  resetDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  exportButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    textAlign: 'center',
  },
  securitySection: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flex: 1,
    marginRight: 16,
  },
  description: {
    lineHeight: 18,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  pinSetup: {
    marginTop: 16,
  },
  pinButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  pinButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButtonText: {
    textAlign: 'center',
  },
  pinActions: {
    flexDirection: 'row',
  },
  pinActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinActionText: {
    textAlign: 'center',
  },
});

export default SettingsScreen;
