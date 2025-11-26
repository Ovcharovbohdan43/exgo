/**
 * E2E Test: Credit Products Flow
 * 
 * Tests the complete credit products flow:
 * 1. User creates a credit product
 * 2. User makes a payment to credit product
 * 3. User uses credit card for expense
 * 4. Verify balances are updated correctly
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { useCreditProducts } from '../state/CreditProductsProvider';
import AddCreditProductModal from '../components/AddTransaction/AddCreditProductModal';
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

describe('E2E: Credit Products Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        monthlyIncome: 5000,
        isOnboarded: true,
        customCategories: [],
        creditProducts: [],
        transactions: {},
      })
    );
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  const TestComponent = ({ onProductCreated }: { onProductCreated: (id: string) => void }) => {
    const { creditProducts, createCreditProduct } = useCreditProducts();

    React.useEffect(() => {
      if (creditProducts.length > 0 && onProductCreated) {
        onProductCreated(creditProducts[0].id);
      }
    }, [creditProducts, onProductCreated]);

    return null;
  };

  it('should create credit product and verify initial state', async () => {
    const onProductCreated = jest.fn();
    const onClose = jest.fn();

    const { getByPlaceholderText, getByText } = renderWithProviders(
      <>
        <AddCreditProductModal
          visible={true}
          onClose={onClose}
          onProductCreated={onProductCreated}
        />
        <TestComponent onProductCreated={onProductCreated} />
      </>
    );

    // Fill in credit product form
    const nameInput = getByPlaceholderText(/name|название/i);
    fireEvent.changeText(nameInput, 'Test Credit Card');

    const principalInput = getByPlaceholderText(/principal|начальная сумма/i);
    fireEvent.changeText(principalInput, '1000');

    const aprInput = getByPlaceholderText(/apr|процентная ставка/i);
    fireEvent.changeText(aprInput, '18.5');

    // Select credit card type (default)
    // Save product
    const saveButton = getByText(/save|сохранить/i);
    fireEvent.press(saveButton);

    // Verify product is created
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'creditProducts',
        expect.stringContaining('"name":"Test Credit Card"')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'creditProducts',
        expect.stringContaining('"principal":1000')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'creditProducts',
        expect.stringContaining('"remainingBalance":1000')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'creditProducts',
        expect.stringContaining('"totalPaid":0')
      );
    });
  });

  it('should make payment to credit product and verify balance update', async () => {
    // First create a credit product
    const mockProduct = {
      id: 'test-product-id',
      name: 'Test Card',
      principal: 1000,
      remainingBalance: 1000,
      apr: 18.5,
      dailyInterestRate: 0.0005068,
      creditType: 'credit_card' as const,
      accruedInterest: 0,
      totalPaid: 0,
      status: 'active' as const,
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        monthlyIncome: 5000,
        isOnboarded: true,
        customCategories: [],
        creditProducts: [mockProduct],
        transactions: {},
      })
    );

    const onClose = jest.fn();
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <AddTransactionModal
        visible={true}
        onClose={onClose}
        currentMonth="2025-11"
        initialType="credit"
      />
    );

    // Select credit product
    await waitFor(() => {
      const productButton = getByText('Test Card');
      if (productButton) {
        fireEvent.press(productButton);
      }
    });

    // Enter payment amount
    await waitFor(() => {
      const amountInput = getByPlaceholderText(/amount|сумма/i);
      fireEvent.changeText(amountInput, '200');
    });

    // Go to confirm
    const nextButton = getByText(/next|далее/i);
    fireEvent.press(nextButton);

    // Confirm payment
    await waitFor(() => {
      const confirmButton = getByText(/confirm|подтвердить/i);
      fireEvent.press(confirmButton);
    });

    // Verify payment is applied
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'creditProducts',
        expect.stringContaining('"remainingBalance":800')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'creditProducts',
        expect.stringContaining('"totalPaid":200')
      );
    });
  });

  it('should use credit card for expense and verify balance increase', async () => {
    const mockProduct = {
      id: 'test-product-id',
      name: 'Test Card',
      principal: 1000,
      remainingBalance: 800,
      apr: 18.5,
      dailyInterestRate: 0.0005068,
      creditType: 'credit_card' as const,
      accruedInterest: 0,
      totalPaid: 200,
      status: 'active' as const,
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        currency: 'USD',
        monthlyIncome: 5000,
        isOnboarded: true,
        customCategories: [],
        creditProducts: [mockProduct],
        transactions: {},
      })
    );

    const onClose = jest.fn();
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <AddTransactionModal
        visible={true}
        onClose={onClose}
        currentMonth="2025-11"
        initialType="expense"
      />
    );

    // Select expense type
    const expenseButton = getByText(/expense|расход/i);
    fireEvent.press(expenseButton);

    // Enter amount
    await waitFor(() => {
      const amountInput = getByPlaceholderText(/amount|сумма/i);
      fireEvent.changeText(amountInput, '50');
    });

    // Select category
    const nextButton = getByText(/next|далее/i);
    fireEvent.press(nextButton);

    await waitFor(() => {
      const categoryButton = getByText(/groceries|продукты/i);
      if (categoryButton) {
        fireEvent.press(categoryButton);
      }
    });

    // Go to confirm
    const nextButton2 = getByText(/next|далее/i);
    fireEvent.press(nextButton2);

    // Select credit card as payment method
    await waitFor(() => {
      const paymentMethod = getByText(/payment method|способ оплаты/i);
      if (paymentMethod) {
        fireEvent.press(paymentMethod);
      }
    });

    await waitFor(() => {
      const cardOption = getByText('Test Card');
      if (cardOption) {
        fireEvent.press(cardOption);
      }
    });

    // Confirm transaction
    await waitFor(() => {
      const confirmButton = getByText(/confirm|подтвердить/i);
      fireEvent.press(confirmButton);
    });

    // Verify balance increased and totalPaid decreased
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'creditProducts',
        expect.stringContaining('"remainingBalance":850')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'creditProducts',
        expect.stringContaining('"totalPaid":150')
      );
    });

    // Verify transaction has paidByCreditProductId
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'transactions',
        expect.stringContaining('"paidByCreditProductId":"test-product-id"')
      );
    });
  });
});

