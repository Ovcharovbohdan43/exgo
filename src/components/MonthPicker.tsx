import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useThemeStyles } from '../theme/ThemeProvider';
import { getMonthKey, parseMonthKey, formatMonthName } from '../utils/month';

type MonthPickerProps = {
  value: string; // Month key (YYYY-MM)
  onChange: (monthKey: string) => void;
  availableMonths?: string[]; // Optional list of available months
};

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  availableMonths,
}) => {
  const theme = useThemeStyles();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => {
    const date = parseMonthKey(value);
    return date.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = parseMonthKey(value);
    return date.getMonth() + 1;
  });

  // Generate list of years (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Generate list of months
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const handleConfirm = () => {
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    onChange(monthKey);
    setModalVisible(false);
  };

  const handleCancel = () => {
    // Reset to original value
    const date = parseMonthKey(value);
    setSelectedYear(date.getFullYear());
    setSelectedMonth(date.getMonth() + 1);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[
          styles.pickerButton,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.pickerButtonText,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.md,
            },
          ]}
        >
          {formatMonthName(value)}
        </Text>
        <Text
          style={[
            styles.pickerButtonIcon,
            {
              color: theme.colors.textSecondary,
            },
          ]}
        >
          ▼
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                {
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
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
                Select Month
              </Text>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.pickerColumn}>
                <Text
                  style={[
                    styles.pickerLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm,
                    },
                  ]}
                >
                  Year
                </Text>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  style={[
                    styles.picker,
                    {
                      color: theme.colors.textPrimary,
                    },
                  ]}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={year.toString()} value={year} />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerColumn}>
                <Text
                  style={[
                    styles.pickerLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm,
                    },
                  ]}
                >
                  Month
                </Text>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={setSelectedMonth}
                  style={[
                    styles.picker,
                    {
                      color: theme.colors.textPrimary,
                    },
                  ]}
                >
                  {months.map((month) => (
                    <Picker.Item
                      key={month}
                      label={monthNames[month - 1]}
                      value={month}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleCancel}
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  {
                    borderColor: theme.colors.border,
                  },
                ]}
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
                onPress={handleConfirm}
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  {
                    backgroundColor: theme.colors.accent,
                  },
                ]}
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
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  pickerButtonText: {
    flex: 1,
  },
  pickerButtonIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  modalTitle: {
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 20,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  picker: {
    height: 150,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  modalButtonText: {
    textAlign: 'center',
  },
});


