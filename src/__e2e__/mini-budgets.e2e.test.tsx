/**
 * E2E Test: Mini Budgets Flow
 * 
 * Tests the complete mini budgets flow:
 * 1. User creates a mini budget
 * 2. User adds expense transactions
 * 3. Verify budget tracking updates
 * 4. Verify budget status changes
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import AddMiniBudgetModal from '../components/AddMiniBudgetModal';
import AddTransactionModal from '../components/AddTransaction/AddTransactionModal';
import { renderWithProviders } from './test-helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Alert
jest.spyOn(require('react-native'), 'Alert').mockImplementation((title, message, buttons) => {
  if (buttons && buttons[0] && buttons[0].onPress) {
    buttons[0].onPress();
  }
});

describe('E2E: Mini Budgets Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        monthlyIncome: 5000,
        isOnboarded: true,
        customCategories: [],
        miniBudgets: [],
        miniBudgetStates: {},
        transactions: {},
      })
    );
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should create mini budget and verify initial state', async () => {
    const onClose = jest.fn();
    const onBudgetCreated = jest.fn();

    const { getByPlaceholderText, getByText } = renderWithProviders(
      <AddMiniBudgetModal
        visible={true}
        onClose={onClose}
        onBudgetCreated={onBudgetCreated}
      />
    );

    // Fill in mini budget form
    const nameInput = getByPlaceholderText(/name|название/i);
    fireEvent.changeText(nameInput, 'Groceries Budget');

    const limitInput = getByPlaceholderText(/limit|лимит/i);
    fireEvent.changeText(limitInput, '500');

    const categoryInput = getByPlaceholderText(/category|категория/i);
    fireEvent.changeText(categoryInput, 'Groceries');

    // Save budget
    const saveButton = getByText(/save|сохранить/i);
    fireEvent.press(saveButton);

    // Verify budget is created
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'miniBudgets',
        expect.stringContaining('"name":"Groceries Budget"')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'miniBudgets',
        expect.stringContaining('"limit":500')
      );
    });
  });

  it('should track expenses against mini budget', async () => {
    const mockBudget = {
      id: 'test-budget-id',
      name: 'Groceries Budget',
      category: 'Groceries',
      limit: 500,
      month: '2025-11',
      createdAt: new Date().toISOString(),
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        monthlyIncome: 5000,
        isOnboarded: true,
        customCategories: [],
        miniBudgets: [mockBudget],
        miniBudgetStates: {
          '2025-11': {
            'test-budget-id': {
              limit: 500,
              spent: 0,
              remaining: 500,
              status: 'ok',
            },
          },
        },
        transactions: {},
      })
    );

    const onClose = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <SettingsProvider>
        <AppProvider>
          <NavigationContainer>
            <AddTransactionModal
              visible={true}
              onClose={onClose}
              currentMonth="2025-11"
              initialType="expense"
            />
          </NavigationContainer>
        </AppProvider>
      </SettingsProvider>
    );

    // Select expense type (might already be selected if initialType is set)
    const expenseButton = getByText(/expense|расход/i);
    if (expenseButton) {
      fireEvent.press(expenseButton);
    }

    // Enter amount
    await waitFor(() => {
      const amountInput = getByPlaceholderText(/amount|сумма/i);
      fireEvent.changeText(amountInput, '100');
    });

    // Select category (Groceries)
    const nextButton = getByText(/next|далее/i);
    fireEvent.press(nextButton);

    await waitFor(() => {
      const categoryButton = getByText(/groceries|продукты/i);
      if (categoryButton) {
        fireEvent.press(categoryButton);
      }
    });

    // Confirm transaction
    const nextButton2 = getByText(/next|далее/i);
    fireEvent.press(nextButton2);

    await waitFor(() => {
      const confirmButton = getByText(/confirm|подтвердить/i);
      fireEvent.press(confirmButton);
    });

    // Verify budget state is updated
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'miniBudgetStates',
        expect.stringContaining('"spent":100')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'miniBudgetStates',
        expect.stringContaining('"remaining":400')
      );
    });
  });

  it('should update budget status when limit is exceeded', async () => {
    const mockBudget = {
      id: 'test-budget-id',
      name: 'Groceries Budget',
      category: 'Groceries',
      limit: 500,
      month: '2025-11',
      createdAt: new Date().toISOString(),
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        monthlyIncome: 5000,
        isOnboarded: true,
        customCategories: [],
        miniBudgets: [mockBudget],
        miniBudgetStates: {
          '2025-11': {
            'test-budget-id': {
              limit: 500,
              spent: 450,
              remaining: 50,
              status: 'ok',
            },
          },
        },
        transactions: {},
      })
    );

    const onClose = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <AppProvider>
        <NavigationContainer>
          <AddTransactionModal
            visible={true}
            onClose={onClose}
            currentMonth="2025-11"
            initialType="expense"
          />
        </NavigationContainer>
      </AppProvider>
    );

    // Add expense that exceeds budget
    const expenseButton = getByText(/expense|расход/i);
    fireEvent.press(expenseButton);

    await waitFor(() => {
      const amountInput = getByPlaceholderText(/amount|сумма/i);
      fireEvent.changeText(amountInput, '100');
    });

    const nextButton = getByText(/next|далее/i);
    fireEvent.press(nextButton);

    await waitFor(() => {
      const categoryButton = getByText(/groceries|продукты/i);
      if (categoryButton) {
        fireEvent.press(categoryButton);
      }
    });

    const nextButton2 = getByText(/next|далее/i);
    fireEvent.press(nextButton2);

    await waitFor(() => {
      const confirmButton = getByText(/confirm|подтвердить/i);
      fireEvent.press(confirmButton);
    });

    // Verify budget status changed to 'over'
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'miniBudgetStates',
        expect.stringContaining('"status":"over"')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'miniBudgetStates',
        expect.stringContaining('"spent":550')
      );
    });
  });
});

