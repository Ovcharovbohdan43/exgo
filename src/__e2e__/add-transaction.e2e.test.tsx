/**
 * E2E Test: Add Transaction Flow
 * 
 * Tests the complete transaction addition flow:
 * 1. User opens add transaction modal
 * 2. User selects transaction type
 * 3. User enters amount
 * 4. User selects category
 * 5. User confirms transaction
 * 6. Transaction is saved and displayed
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
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

describe('E2E: Add Transaction Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        monthlyIncome: 5000,
        isOnboarded: true,
        customCategories: [],
      })
    );
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      visible: true,
      onClose: jest.fn(),
      currentMonth: '2025-11',
      ...props,
    };

    return renderWithProviders(<AddTransactionModal {...defaultProps} />);
  };

  it('should complete expense transaction flow', async () => {
    const onClose = jest.fn();
    const { getByText, getByPlaceholderText, getByTestId } = renderModal({ onClose });

    // Step 1: Select transaction type (Expense)
    const expenseButton = getByText(/expense|расход/i);
    fireEvent.press(expenseButton);

    // Step 2: Enter amount
    await waitFor(() => {
      const amountInput = getByPlaceholderText(/amount|сумма/i);
      fireEvent.changeText(amountInput, '100');
    });

    // Step 3: Go to next step (category selection)
    const nextButton = getByText(/next|далее/i);
    fireEvent.press(nextButton);

    // Step 4: Select category
    await waitFor(() => {
      const categoryButton = getByText(/groceries|продукты/i);
      if (categoryButton) {
        fireEvent.press(categoryButton);
      }
    });

    // Step 5: Go to confirm step
    const nextButton2 = getByText(/next|далее/i);
    fireEvent.press(nextButton2);

    // Step 6: Confirm transaction
    await waitFor(() => {
      const confirmButton = getByText(/confirm|подтвердить/i);
      fireEvent.press(confirmButton);
    });

    // Step 7: Verify transaction is saved
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'transactions',
        expect.stringContaining('"type":"expense"')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'transactions',
        expect.stringContaining('"amount":100')
      );
    });

    // Step 8: Verify modal closes
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should complete income transaction flow', async () => {
    const onClose = jest.fn();
    const { getByText, getByPlaceholderText } = renderModal({ onClose });

    // Select income type
    const incomeButton = getByText(/income|доход/i);
    fireEvent.press(incomeButton);

    // Enter amount
    await waitFor(() => {
      const amountInput = getByPlaceholderText(/amount|сумма/i);
      fireEvent.changeText(amountInput, '500');
    });

    // Go to confirm (category is auto-selected for income)
    const nextButton = getByText(/next|далее/i);
    fireEvent.press(nextButton);

    // Confirm transaction
    await waitFor(() => {
      const confirmButton = getByText(/confirm|подтвердить/i);
      fireEvent.press(confirmButton);
    });

    // Verify transaction is saved
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'transactions',
        expect.stringContaining('"type":"income"')
      );
    });
  });

  it('should validate amount input', async () => {
    const { getByText, getByPlaceholderText } = renderModal();

    // Select expense type
    const expenseButton = getByText(/expense|расход/i);
    fireEvent.press(expenseButton);

    // Try to proceed with invalid amount
    await waitFor(() => {
      const amountInput = getByPlaceholderText(/amount|сумма/i);
      fireEvent.changeText(amountInput, '0');
    });

    const nextButton = getByText(/next|далее/i);
    fireEvent.press(nextButton);

    // Should show validation error
    await waitFor(() => {
      expect(getByText(/invalid|неверно/i)).toBeTruthy();
    });
  });

  it('should allow canceling transaction', async () => {
    const onClose = jest.fn();
    const { getByText } = renderModal({ onClose });

    // Select expense type
    const expenseButton = getByText(/expense|расход/i);
    fireEvent.press(expenseButton);

    // Try to close modal
    const backButton = getByText(/back|назад/i) || getByText(/cancel|отмена/i);
    if (backButton) {
      fireEvent.press(backButton);
    }

    // Modal should close
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});

