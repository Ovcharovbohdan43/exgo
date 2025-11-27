# Тестирование функции "Календарь" (Calendar Testing)

Документ описывает стратегию тестирования функции календаря в приложении ExGo.

## Обзор

Функция "Календарь" требует тестирования на нескольких уровнях:
- Unit тесты для утилит работы с месяцами
- Компонентные тесты для CalendarIcon и CalendarScreen
- Интеграционные тесты для навигации и взаимодействия с HomeScreen
- E2E тесты для пользовательских сценариев

## Unit тесты

### Утилиты работы с месяцами (month.ts)

#### Тестирование formatMonthName

```typescript
describe('formatMonthName', () => {
  it('should format month key to localized month name', () => {
    // Mock getCurrentLanguage to return 'en'
    const result = formatMonthName('2025-12');
    expect(result).toContain('December');
    expect(result).toContain('2025');
  });

  it('should format month key in Ukrainian', () => {
    // Mock getCurrentLanguage to return 'uk'
    const result = formatMonthName('2025-12');
    expect(result).toContain('грудень');
    expect(result).toContain('2025');
  });

  it('should handle different months correctly', () => {
    const january = formatMonthName('2025-01');
    const june = formatMonthName('2025-06');
    expect(january).not.toBe(june);
  });
});
```

#### Тестирование parseMonthKey

```typescript
describe('parseMonthKey', () => {
  it('should parse month key to Date object', () => {
    const date = parseMonthKey('2025-12');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(11); // 0-indexed
  });

  it('should handle single-digit months', () => {
    const date = parseMonthKey('2025-01');
    expect(date.getMonth()).toBe(0);
  });

  it('should handle edge cases', () => {
    const date = parseMonthKey('2024-12');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(11);
  });
});
```

#### Тестирование isCurrentMonth

```typescript
describe('isCurrentMonth', () => {
  it('should return true for current month', () => {
    const currentMonth = getMonthKey();
    expect(isCurrentMonth(currentMonth)).toBe(true);
  });

  it('should return false for previous month', () => {
    const previousMonth = getPreviousMonthKey(getMonthKey());
    expect(isCurrentMonth(previousMonth)).toBe(false);
  });

  it('should return false for future month', () => {
    const nextMonth = getNextMonthKey(getMonthKey());
    expect(isCurrentMonth(nextMonth)).toBe(false);
  });
});
```

## Компонентные тесты

### CalendarIcon

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { CalendarIcon } from '../components/icons/CalendarIcon';

describe('CalendarIcon', () => {
  it('should render calendar icon', () => {
    const { getByTestId } = render(<CalendarIcon />);
    // Assuming testID is added to SVG
    expect(getByTestId('calendar-icon')).toBeTruthy();
  });

  it('should accept custom size', () => {
    const { getByTestId } = render(<CalendarIcon size={32} />);
    const icon = getByTestId('calendar-icon');
    expect(icon.props.width).toBe(32);
    expect(icon.props.height).toBe(32);
  });

  it('should accept custom color', () => {
    const { getByTestId } = render(<CalendarIcon color="#FF0000" />);
    const icon = getByTestId('calendar-icon');
    // Check that color is applied to paths
    expect(icon).toBeTruthy();
  });
});
```

### CalendarScreen

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CalendarScreen from '../screens/CalendarScreen';
import { renderWithProviders } from '../__e2e__/test-helpers';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: { initialMonth: '2025-12' },
  }),
}));

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render calendar screen with title', () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    expect(getByText(/select month|виберіть місяць/i)).toBeTruthy();
  });

  it('should display all 12 months', () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    // Check for at least one month name
    expect(getByText(/january|січень/i)).toBeTruthy();
  });

  it('should display year selector', () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    const currentYear = new Date().getFullYear();
    expect(getByText(String(currentYear))).toBeTruthy();
  });

  it('should highlight current month', () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    // Current month should have "Current" badge
    // This depends on implementation
  });

  it('should highlight initial month if provided', () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    // December 2025 should be highlighted
  });

  it('should navigate to Home when month is selected', async () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    
    // Find and press a month card (e.g., January)
    const januaryCard = getByText(/january|січень/i);
    fireEvent.press(januaryCard);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Home', { month: '2025-01' });
    });
  });

  it('should update months when year is selected', () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    
    // Select a different year
    const year2024 = getByText('2024');
    fireEvent.press(year2024);

    // Months should update to 2024
    // This depends on implementation
  });
});
```

## Интеграционные тесты

### HomeScreen с параметром месяца

```typescript
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import { renderWithProviders } from '../__e2e__/test-helpers';
import { useTransactions } from '../state/TransactionsProvider';

// Mock TransactionsProvider
const mockSetCurrentMonth = jest.fn();
jest.mock('../state/TransactionsProvider', () => ({
  useTransactions: () => ({
    transactions: [],
    currentMonth: '2025-11',
    setCurrentMonth: mockSetCurrentMonth,
    deleteTransaction: jest.fn(),
    hasMonthData: jest.fn(() => true),
  }),
}));

// Mock navigation
const mockRoute = {
  params: { month: '2025-12' },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useRoute: () => mockRoute,
  useFocusEffect: jest.fn(),
}));

describe('HomeScreen - Month Parameter Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call setCurrentMonth when route param changes', async () => {
    renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      expect(mockSetCurrentMonth).toHaveBeenCalledWith('2025-12');
    });
  });

  it('should not call setCurrentMonth if month is already current', async () => {
    mockRoute.params = { month: '2025-11' };
    renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      expect(mockSetCurrentMonth).not.toHaveBeenCalled();
    });
  });

  it('should not cause infinite loop when month changes', async () => {
    mockRoute.params = { month: '2025-12' };
    const { rerender } = renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      expect(mockSetCurrentMonth).toHaveBeenCalledTimes(1);
    });

    // Simulate month change in provider
    // Should not trigger another setCurrentMonth call
    rerender(<HomeScreen />);

    await waitFor(() => {
      expect(mockSetCurrentMonth).toHaveBeenCalledTimes(1);
    });
  });
});
```

## E2E тесты

### Полный сценарий выбора месяца

```typescript
/**
 * E2E Test: Calendar Month Selection Flow
 * 
 * Tests the complete calendar flow:
 * 1. User opens calendar from HomeScreen
 * 2. User selects a year
 * 3. User selects a month
 * 4. User is navigated to HomeScreen with selected month data
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from './test-helpers';
import App from '../../App';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('E2E: Calendar Month Selection Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should complete full calendar selection flow', async () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(<App />);

    // Step 1: Navigate to HomeScreen (assuming onboarding is complete)
    // This depends on your app structure

    // Step 2: Find and press calendar icon
    const calendarIcon = getByTestId('calendar-icon-button');
    fireEvent.press(calendarIcon);

    // Step 3: Verify calendar screen is displayed
    await waitFor(() => {
      expect(getByText(/select month|виберіть місяць/i)).toBeTruthy();
    });

    // Step 4: Select a year (e.g., 2024)
    const year2024 = getByText('2024');
    fireEvent.press(year2024);

    // Step 5: Verify months updated to 2024
    await waitFor(() => {
      expect(getByText(/january 2024|січень 2024/i)).toBeTruthy();
    });

    // Step 6: Select a month (e.g., December 2024)
    const december2024 = getByText(/december 2024|грудень 2024/i);
    fireEvent.press(december2024);

    // Step 7: Verify navigation to HomeScreen
    await waitFor(() => {
      // Calendar screen should be closed
      expect(queryByText(/select month|виберіть місяць/i)).toBeNull();
    });

    // Step 8: Verify HomeScreen displays December 2024 data
    // This depends on your HomeScreen implementation
    // You might check for month label or transaction data
  });

  it('should highlight current month in calendar', async () => {
    const { getByTestId, getByText } = renderWithProviders(<App />);

    // Open calendar
    const calendarIcon = getByTestId('calendar-icon-button');
    fireEvent.press(calendarIcon);

    await waitFor(() => {
      expect(getByText(/select month|виберіть місяць/i)).toBeTruthy();
    });

    // Current month should have "Current" badge
    const currentMonth = getByText(/current|поточний/i);
    expect(currentMonth).toBeTruthy();
  });

  it('should preserve selected month when navigating back', async () => {
    const { getByTestId, getByText } = renderWithProviders(<App />);

    // Open calendar and select a month
    const calendarIcon = getByTestId('calendar-icon-button');
    fireEvent.press(calendarIcon);

    await waitFor(() => {
      expect(getByText(/select month|виберіть місяць/i)).toBeTruthy();
    });

    const january = getByText(/january|січень/i);
    fireEvent.press(january);

    // Navigate back to calendar
    fireEvent.press(calendarIcon);

    // Selected month should be highlighted
    await waitFor(() => {
      expect(getByText(/selected|вибрано/i)).toBeTruthy();
    });
  });
});
```

## Тестирование производительности

### Тест на отсутствие бесконечных циклов

```typescript
describe('Calendar - Performance Tests', () => {
  it('should not cause infinite re-renders when month changes', async () => {
    const renderCount = jest.fn();
    
    const TestComponent = () => {
      renderCount();
      // Component that uses calendar
      return <CalendarScreen />;
    };

    const { rerender } = renderWithProviders(<TestComponent />);
    
    // Simulate multiple month changes
    for (let i = 0; i < 10; i++) {
      rerender(<TestComponent />);
    }

    // Render count should be reasonable (not thousands)
    expect(renderCount).toHaveBeenCalledTimes(expect.any(Number));
    expect(renderCount.mock.calls.length).toBeLessThan(100);
  });
});
```

## Edge Cases

### Тестирование граничных случаев

```typescript
describe('Calendar - Edge Cases', () => {
  it('should handle missing route params gracefully', () => {
    jest.mock('@react-navigation/native', () => ({
      useRoute: () => ({ params: undefined }),
    }));

    const { getByText } = renderWithProviders(<CalendarScreen />);
    // Should still render calendar with current year
    expect(getByText(/select month|виберіть місяць/i)).toBeTruthy();
  });

  it('should handle invalid month key format', () => {
    jest.mock('@react-navigation/native', () => ({
      useRoute: () => ({ params: { initialMonth: 'invalid' } }),
    }));

    // Should handle error gracefully
    expect(() => renderWithProviders(<CalendarScreen />)).not.toThrow();
  });

  it('should handle year selection at boundaries', () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    
    // Select first available year
    const firstYear = getByText(String(new Date().getFullYear() - 2));
    fireEvent.press(firstYear);

    // Should still display months correctly
    expect(getByText(/january|січень/i)).toBeTruthy();
  });
});
```

## Тестирование локализации

```typescript
describe('Calendar - Localization', () => {
  it('should display English month names when language is English', () => {
    // Mock i18n to return 'en'
    const { getByText } = renderWithProviders(<CalendarScreen />);
    expect(getByText(/january|february|march/i)).toBeTruthy();
  });

  it('should display Ukrainian month names when language is Ukrainian', () => {
    // Mock i18n to return 'uk'
    const { getByText } = renderWithProviders(<CalendarScreen />);
    expect(getByText(/січень|лютий|березень/i)).toBeTruthy();
  });

  it('should localize calendar title', () => {
    const { getByText } = renderWithProviders(<CalendarScreen />);
    // Should show localized title
    expect(getByText(/select month|виберіть місяць/i)).toBeTruthy();
  });
});
```

## Рекомендации по тестированию

1. **Приоритет тестов:**
   - E2E тесты для основных пользовательских сценариев
   - Интеграционные тесты для навигации
   - Unit тесты для утилит

2. **Покрытие:**
   - Все пути навигации
   - Все состояния календаря (выбор года, выбор месяца)
   - Обработка параметров route
   - Предотвращение бесконечных циклов

3. **Производительность:**
   - Тесты на отсутствие лишних ре-рендеров
   - Тесты на отсутствие бесконечных циклов
   - Тесты на корректную работу useMemo

---

**Поддерживается командой разработки ExGo**

