import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSettings } from '../state/SettingsProvider';
import { useTransactions } from '../state/TransactionsProvider';
import { resetStorage } from '../services/storage';
import { useThemeStyles } from '../theme/ThemeProvider';
import { MonthPicker } from '../components/MonthPicker';
import { generateReportHTML, MonthlyReportData } from '../utils/pdfReport';
import { getMonthKey, formatMonthName } from '../utils/month';

type TabType = 'personalization' | 'general';

const SettingsScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { settings, updateSettings } = useSettings();
  const { resetTransactions, transactionsByMonth } = useTransactions();
  const [activeTab, setActiveTab] = useState<TabType>('personalization');
  const [currency, setCurrency] = useState(settings.currency);
  const [income, setIncome] = useState(String(settings.monthlyIncome));
  const [exportMonth, setExportMonth] = useState(getMonthKey());
  const [isExporting, setIsExporting] = useState(false);

  // Sync local state with settings when they change
  React.useEffect(() => {
    setCurrency(settings.currency);
    setIncome(String(settings.monthlyIncome));
  }, [settings.currency, settings.monthlyIncome]);

  const handleSave = async () => {
    const monthlyIncome = Number(income) || 0;
    await updateSettings({ currency: currency || 'USD', monthlyIncome });
    Alert.alert('Success', 'Settings saved successfully!');
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      const monthTransactions = transactionsByMonth[exportMonth] || [];
      
      if (monthTransactions.length === 0) {
        Alert.alert('No Data', 'No transactions found for the selected month.');
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
          dialogTitle: 'Export Monthly Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF Generated',
          `PDF saved to: ${newUri}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[SettingsScreen] PDF export error:', error);
      Alert.alert('Error', 'Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = async () => {
    Alert.alert('Reset all data?', 'This will clear settings and transactions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear storage first
            await resetStorage();
            // Reset both providers to defaults
            await updateSettings({ currency: 'USD', monthlyIncome: 0, isOnboarded: false });
            await resetTransactions();
            Alert.alert('Success', 'All data has been reset.');
          } catch (error) {
            Alert.alert('Error', 'Failed to reset data. Please try again.');
            console.error('[SettingsScreen] Reset error:', error);
          }
        },
      },
    ]);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'personalization', label: 'Personalization' },
    { id: 'general', label: 'General' },
  ];

  const renderPersonalizationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Currency</Text>
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
        />
        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: theme.colors.accent,
              marginTop: theme.spacing.lg,
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
  exportButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    textAlign: 'center',
  },
});

export default SettingsScreen;
