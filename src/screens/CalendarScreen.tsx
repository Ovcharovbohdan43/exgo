import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/layout';
import { formatMonthName, getMonthKey, parseMonthKey, isCurrentMonth } from '../utils/month';
import { RootStackParamList } from '../navigation/RootNavigator';

type CalendarNav = NativeStackNavigationProp<RootStackParamList, 'Calendar'>;
type CalendarRoute = RouteProp<RootStackParamList, 'Calendar'>;

const CalendarScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { t } = useTranslation();
  const navigation = useNavigation<CalendarNav>();
  const route = useRoute<CalendarRoute>();
  const initialMonth = route.params?.initialMonth;

  // Get current year or year from initial month
  const currentYear = useMemo(() => {
    if (initialMonth) {
      const date = parseMonthKey(initialMonth);
      return date.getFullYear();
    }
    return new Date().getFullYear();
  }, [initialMonth]);

  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate years: current year ± 2 years (5 years total)
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - 2 + i);
  }, []);

  // Generate months for selected year
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
      return {
        monthKey,
        monthIndex: i,
        date: parseMonthKey(monthKey),
      };
    });
  }, [selectedYear]);

  const handleMonthSelect = (monthKey: string) => {
    // Navigate to Home screen with selected month
    navigation.navigate('Home', { month: monthKey });
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
  };

  // Get localized month names
  const getMonthName = (monthKey: string): string => {
    return formatMonthName(monthKey);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
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
        {t('calendar.title', { defaultValue: 'Select Month' })}
      </Text>

      {/* Year Selector */}
      <View style={styles.yearSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScrollContent}>
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              onPress={() => handleYearSelect(year)}
              style={[
                styles.yearButton,
                {
                  backgroundColor: selectedYear === year ? theme.colors.accent : theme.colors.surface,
                  borderColor: selectedYear === year ? theme.colors.accent : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.yearButtonText,
                  {
                    color: selectedYear === year ? theme.colors.background : theme.colors.textPrimary,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight:
                      selectedYear === year
                        ? theme.typography.fontWeight.bold
                        : theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Months Grid */}
      <View style={styles.monthsGrid}>
        {months.map(({ monthKey, monthIndex }) => {
          const isCurrent = isCurrentMonth(monthKey);
          const isSelected = initialMonth === monthKey;

          return (
            <TouchableOpacity
              key={monthKey}
              onPress={() => handleMonthSelect(monthKey)}
              activeOpacity={0.7}
              style={styles.monthCardWrapper}
            >
              <Card
                variant="elevated"
                padding="md"
                style={[
                  styles.monthCard,
                  {
                    backgroundColor:
                      isSelected || isCurrent
                        ? theme.colors.accent + '20'
                        : theme.colors.surface,
                    borderWidth: isSelected || isCurrent ? 2 : 1,
                    borderColor:
                      isSelected || isCurrent ? theme.colors.accent : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthName,
                    {
                      color: theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight:
                        isSelected || isCurrent
                          ? theme.typography.fontWeight.bold
                          : theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {getMonthName(monthKey)}
                </Text>
                {(isSelected || isCurrent) && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: theme.colors.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color: theme.colors.background,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.bold,
                        },
                      ]}
                    >
                      {isCurrent
                        ? t('calendar.current', { defaultValue: 'Current' })
                        : t('calendar.selected', { defaultValue: 'Selected' })}
                    </Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  yearSelector: {
    marginBottom: 24,
  },
  yearScrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  yearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  yearButtonText: {
    textAlign: 'center',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  monthCardWrapper: {
    width: '30%', // 3 columns with gaps
    minWidth: 100,
  },
  monthCard: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  monthName: {
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    textAlign: 'center',
  },
});

export default CalendarScreen;

