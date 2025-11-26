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
import { supportedLanguages, changeLanguage, getCurrentLanguage } from '../i18n';
import i18n from '../i18n';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type SettingsNav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

type TabType = 'personalization' | 'general' | 'security';

const SettingsScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { setColorScheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const { resetTransactions, transactionsByMonth } = useTransactions();
  const { t } = useTranslation();
  const navigation = useNavigation<SettingsNav>();
  const [activeTab, setActiveTab] = useState<TabType>('personalization');
  const [currency, setCurrency] = useState(settings.currency);
  const [income, setIncome] = useState(String(settings.monthlyIncome));
  const [themePreference, setThemePreference] = useState<ThemePreference>(settings.themePreference || 'system');
  const [language, setLanguage] = useState<SupportedLanguage>(settings.language || 'en');
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
  const [newPIN, setNewPIN] = useState(''); // Store new PIN for saving
  const [newPINConfirm, setNewPINConfirm] = useState(''); // Store new PIN confirmation for saving
  const [shouldRemovePIN, setShouldRemovePIN] = useState(false); // Flag to remove PIN on save
  
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

  // Track if language was manually selected by user
  const [languageManuallySelected, setLanguageManuallySelected] = React.useState(false);

  // Sync local state with settings when they change (only on mount or external changes)
  // Don't sync language if user has manually selected it
  React.useEffect(() => {
    setCurrency(settings.currency);
    setIncome(String(settings.monthlyIncome));
    setThemePreference(settings.themePreference || 'system');
    setEnableBiometric(settings.enableBiometric || false);
    setEnablePIN(settings.enablePIN || false);
    
    // Only sync language if user hasn't manually selected it
    if (!languageManuallySelected) {
      setLanguage(settings.language || 'en');
    }
  }, [settings.currency, settings.monthlyIncome, settings.themePreference, settings.enableBiometric, settings.enablePIN, settings.language, languageManuallySelected]);

  // Sync language state with i18n language changes only after save
  React.useEffect(() => {
    const updateLanguage = () => {
      const currentLang = getCurrentLanguage();
      // Only update if language was actually changed (after save) and matches settings
      if (currentLang !== language && settings.language === currentLang) {
        setLanguage(currentLang);
        setLanguageManuallySelected(false); // Reset flag after save
      }
    };
    
    // Listen for language changes (only after save)
    i18n.on('languageChanged', updateLanguage);
    
    return () => {
      i18n.off('languageChanged', updateLanguage);
    };
  }, [language, settings.language]);

  const handleSave = async () => {
    try {
      setSaveError(null);
      const monthlyIncome = Number(income) || 0;
      
      // Prepare settings update object
      const settingsUpdate: {
        currency?: string;
        monthlyIncome?: number;
        themePreference?: ThemePreference;
        language?: SupportedLanguage;
        enableBiometric?: boolean;
        enablePIN?: boolean;
        pin?: string;
      } = {
        currency: currency || 'USD',
        monthlyIncome,
        themePreference,
        language,
        enableBiometric,
      };

      // Handle PIN settings
      if (shouldRemovePIN) {
        settingsUpdate.enablePIN = false;
        settingsUpdate.pin = undefined;
      } else if (enablePIN) {
        if (newPIN && newPINConfirm && newPIN === newPINConfirm) {
          // New PIN is being set
          if (!validatePIN(newPIN)) {
            Alert.alert(t('alerts.invalidPIN'), t('alerts.pinMustBeDigits'));
            return;
          }
          settingsUpdate.enablePIN = true;
          settingsUpdate.pin = hashPIN(newPIN);
        } else if (settings.pin) {
          // PIN is already set, just enable/disable
          settingsUpdate.enablePIN = true;
        } else {
          // PIN is already set, just enable/disable
          settingsUpdate.enablePIN = true;
        }
      } else {
        settingsUpdate.enablePIN = false;
      }

      // Apply all settings
      await updateSettings(settingsUpdate);
      
      // Apply theme change immediately for better UX
      setColorScheme(themePreference);
      
      // Apply language change immediately for better UX
      const currentI18nLanguage = getCurrentLanguage();
      if (language && language !== currentI18nLanguage) {
        console.log('[SettingsScreen] Changing language from', currentI18nLanguage, 'to', language);
        changeLanguage(language);
      }
      
      // Clear PIN setup state
      setPin('');
      setConfirmPin('');
      setNewPIN('');
      setNewPINConfirm('');
      setShowPINSetup(false);
      setShouldRemovePIN(false);
      
      // Reset language manual selection flag after save
      setLanguageManuallySelected(false);
      
      Alert.alert(t('alerts.success'), t('alerts.settingsSaved'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      setSaveError(errorMessage);
      console.error('[SettingsScreen] Save error:', error);
    }
  };

  const handleThemeChange = (preference: ThemePreference) => {
    setThemePreference(preference);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setLanguageManuallySelected(true); // Mark as manually selected
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

      // Always use current i18n language for PDF reports to ensure it matches the UI
      // i18n language is always up-to-date, while settings.language might be stale
      const currentI18nLang = getCurrentLanguage();
      const reportLanguage: SupportedLanguage = (currentI18nLang === 'uk' || currentI18nLang === 'en') 
        ? currentI18nLang 
        : (settings.language || 'en') as SupportedLanguage;
      
      const reportData: MonthlyReportData = {
        monthKey: exportMonth,
        transactions: monthTransactions,
        monthlyIncome: settings.monthlyIncome,
        currency: settings.currency,
        language: reportLanguage,
      };
      
      console.log('[SettingsScreen] Generating PDF report with language:', reportLanguage, 'i18n.language:', currentI18nLang, 'settings.language:', settings.language);

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

  const handleBiometricToggle = (enabled: boolean) => {
    if (enabled && !biometricAvailable) {
      Alert.alert(
        t('settings.biometricAuth'),
        t('settings.biometricNotAvailable', { name: biometricName })
      );
      return;
    }
    setEnableBiometric(enabled);
  };

  const handlePINToggle = (enabled: boolean) => {
    if (enabled && !settings.pin && !newPIN) {
      // Show PIN setup
      setShowPINSetup(true);
      return;
    }
    setEnablePIN(enabled);
    if (!enabled) {
      // If disabling, clear PIN setup
      setShowPINSetup(false);
      setPin('');
      setConfirmPin('');
      setNewPIN('');
      setNewPINConfirm('');
    }
  };

  const handlePINSetup = () => {
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

    // Store PIN for saving later
    setNewPIN(pin);
    setNewPINConfirm(confirmPin);
    setPin('');
    setConfirmPin('');
    setShowPINSetup(false);
    setEnablePIN(true);
    Alert.alert(t('alerts.success'), t('alerts.pinWillBeSetOnSave'));
  };

  const handlePINChange = () => {
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

    // Store new PIN for saving later
    setNewPIN(pin);
    setNewPINConfirm(confirmPin);
    setPin('');
    setConfirmPin('');
    setShowPINSetup(false);
    Alert.alert(t('alerts.success'), t('alerts.pinWillBeChangedOnSave'));
  };

  const handlePINRemove = () => {
    Alert.alert(
      t('settings.removePin'),
      t('alerts.removePINConfirm'),
      [
        { text: t('alerts.cancel'), style: 'cancel' },
        {
          text: t('settings.removePin'),
          style: 'destructive',
          onPress: () => {
            setShouldRemovePIN(true);
            setEnablePIN(false);
            setNewPIN('');
            setNewPINConfirm('');
            setShowPINSetup(false);
            Alert.alert(t('alerts.success'), t('alerts.pinWillBeRemovedOnSave'));
          },
        },
      ]
    );
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'personalization', label: t('settings.personalization') },
    { id: 'security', label: t('settings.security') },
    { id: 'general', label: t('settings.general') },
  ];

  const renderPersonalizationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>
          {t('settings.theme')}
        </Text>
        <View style={styles.themeOptions}>
          {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => {
            const isSelected = themePreference === option;
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
                  {option === 'light' ? t('settings.themeLight') : option === 'dark' ? t('settings.themeDark') : t('settings.themeSystem')}
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
            const isSelected = language === lang.code;
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
        
        <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>{t('settings.currency')}</Text>
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
          {t('settings.monthlyIncome')}
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
            {t('common.save')}
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
            {t('settings.exportReport')}
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
            {t('settings.selectMonth')}
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
                {t('settings.exportPDF')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSecurityTab = () => {
    const hasSecurityChanges = 
      enableBiometric !== (settings.enableBiometric || false) ||
      enablePIN !== (settings.enablePIN || false) ||
      newPIN !== '' ||
      shouldRemovePIN;

    return (
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
            {t('settings.biometricAuth')}
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
            {t('settings.pinAuth')}
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
                {t('settings.pinAuth')}
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
                {t('settings.usePin')}
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
                {settings.pin ? t('settings.changePin') : t('settings.setPin')}
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
                placeholder={t('settings.enterPin')}
                placeholderTextColor={theme.colors.textSecondary}
                accessible={true}
                accessibilityLabel={t('settings.pinInput')}
                accessibilityHint={t('settings.pinHint')}
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
                placeholder={t('settings.confirmPin')}
                placeholderTextColor={theme.colors.textSecondary}
                accessible={true}
                accessibilityLabel={t('settings.confirmPinInput')}
                accessibilityHint={t('settings.confirmPinHint')}
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
                    {t('common.cancel')}
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
                  accessibilityLabel={settings.pin ? t('settings.changePin') : t('settings.setPin')}
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
                    {settings.pin ? t('settings.changePin') : t('settings.setPin')}
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
                accessibilityLabel={t('settings.changePin')}
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
                  {t('settings.changePin')}
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
                accessibilityLabel={t('settings.removePin')}
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
                  {t('settings.removePin')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Save Button for Security Tab */}
        {hasSecurityChanges && (
          <View style={{ marginTop: theme.spacing.xl }}>
            {saveError && (
              <ErrorState
                message={saveError}
                onRetry={handleSave}
                retryLabel="Retry Save"
                style={{ marginBottom: theme.spacing.md }}
              />
            )}
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme.colors.accent,
                },
              ]}
              accessible={true}
              accessibilityLabel="Save security settings"
              accessibilityRole="button"
              accessibilityHint="Double tap to save your security settings"
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
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
    );
  };

  const renderGeneralTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        {/* Goals Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Goals')}
          style={[
            styles.resetButton,
            {
              backgroundColor: theme.colors.accent,
              marginBottom: theme.spacing.md,
            },
          ]}
          accessible={true}
          accessibilityLabel={t('goals.title', { defaultValue: 'Goals' })}
          accessibilityRole="button"
          accessibilityHint={t('goals.title', { defaultValue: 'View and manage your savings goals' })}
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
            🎯 {t('goals.title', { defaultValue: 'Goals' })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleReset}
          style={[
            styles.resetButton,
            {
              backgroundColor: theme.colors.danger,
            },
          ]}
          accessible={true}
          accessibilityLabel={t('settings.resetAllData')}
          accessibilityRole="button"
          accessibilityHint={t('settings.resetDescription')}
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
            {t('settings.resetAllData')}
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
          {t('settings.resetDescription')}
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
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
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
