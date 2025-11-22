import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSettings } from '../state/SettingsProvider';

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;

const OnboardingScreen: React.FC = () => {
  const { settings, updateSettings, setOnboarded } = useSettings();
  const [currency, setCurrency] = useState(settings.currency || 'USD');
  const [income, setIncome] = useState(settings.monthlyIncome ? String(settings.monthlyIncome) : '');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tempCurrency, setTempCurrency] = useState(currency);

  const handleSave = async () => {
    const parsedIncome = Number(income) || 0;
    await updateSettings({
      currency: currency || 'USD',
      monthlyIncome: parsedIncome,
    });
    await setOnboarded();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ExGo</Text>
      <Text style={styles.subtitle}>Set your monthly income to get started</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Currency</Text>
        <TouchableOpacity
          style={[styles.fieldBase, styles.fieldPress]}
          onPress={() => {
            setTempCurrency(currency);
            setPickerVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.fieldValue}>{currency}</Text>
        </TouchableOpacity>

        <Modal visible={pickerVisible} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Select currency</Text>
              <View style={styles.modalList}>
                {CURRENCIES.map((code) => {
                  const selected = tempCurrency === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => setTempCurrency(code)}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.modalActions}>
                <Button title="Cancel" onPress={() => setPickerVisible(false)} />
                <Button
                  title="Done"
                  onPress={() => {
                    setCurrency(tempCurrency);
                    setPickerVisible(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Monthly income</Text>
        <TextInput
          placeholder="2000"
          keyboardType="numeric"
          value={income}
          onChangeText={setIncome}
          style={[styles.fieldBase, styles.input]}
        />
        <Button title="Save & Continue" onPress={handleSave} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f6f7fb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
  },
  form: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  fieldBase: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fff',
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  input: {
    paddingHorizontal: 12,
    fontSize: 16,
  },
  fieldItem: {
    fontSize: 16,
  },
  fieldPress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldValue: {
    fontSize: 16,
    color: '#111',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalPicker: {
    height: 200,
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  modalList: {
    gap: 10,
    marginVertical: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9fafb',
  },
  optionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#e0e7ff',
  },
  optionText: {
    fontSize: 16,
    color: '#111',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: '#1d4ed8',
  },
});

export default OnboardingScreen;
