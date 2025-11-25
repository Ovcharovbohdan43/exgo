import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadCreditProducts, saveCreditProducts } from '../services/storage';
import { CreditProduct, CreditProductType, CreditProductStatus } from '../types';
import { useSettings } from './SettingsProvider';
import { logError, addBreadcrumb } from '../services/sentry';

export type CreditProductsError = {
  message: string;
  code?: string;
  retry?: () => Promise<void>;
};

type CreditProductsContextValue = {
  creditProducts: CreditProduct[];
  hydrated: boolean;
  loading: boolean;
  error: CreditProductsError | null;
  getActiveCreditProducts: () => CreditProduct[];
  getCreditProductById: (id: string) => CreditProduct | null;
  createCreditProduct: (input: {
    name: string;
    principal: number;
    apr: number;
    creditType: CreditProductType;
    loanTermMonths?: number;
    monthlyMinimumPayment?: number;
    dueDate?: number;
    note?: string;
  }) => Promise<CreditProduct>;
  updateCreditProduct: (id: string, input: {
    name?: string;
    principal?: number;
    apr?: number;
    creditType?: CreditProductType;
    loanTermMonths?: number;
    monthlyMinimumPayment?: number;
    dueDate?: number;
    note?: string;
  }) => Promise<void>;
  deleteCreditProduct: (id: string) => Promise<void>;
  applyPayment: (productId: string, amount: number) => Promise<void>;
  addCharge: (productId: string, amount: number) => Promise<void>; // Add charge to credit card (increase balance)
  retryHydration: () => Promise<void>;
};

const CreditProductsContext = createContext<CreditProductsContextValue | undefined>(undefined);

/**
 * Calculate daily interest rate from APR
 */
const calculateDailyInterestRate = (apr: number): number => {
  return apr / 100 / 365;
};

export const CreditProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  const [creditProducts, setCreditProducts] = useState<CreditProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CreditProductsError | null>(null);

  const hasHydratedRef = useRef(false);

  // Persist credit products to storage
  const persistProducts = useCallback(
    async (products: CreditProduct[]): Promise<void> => {
      setError(null);
      try {
        await saveCreditProducts(products);
        addBreadcrumb('Credit products saved', 'storage', 'info', {
          count: products.length,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save credit products';
        const errorObj = err instanceof Error ? err : new Error(errorMessage);
        
        setError({
          message: errorMessage,
          code: 'SAVE_ERROR',
          retry: async () => {
            await persistProducts(products);
          },
        });
        
        logError(errorObj, {
          component: 'CreditProductsProvider',
          operation: 'persist',
          errorCode: 'SAVE_ERROR',
        });
        throw err;
      }
    },
    [],
  );

  // Hydrate from storage
  const hydrate = useCallback(async () => {
    if (hasHydratedRef.current) {
      console.log('[CreditProductsProvider] Already hydrated, skipping re-hydration');
      return;
    }

    hasHydratedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const storedProducts = await loadCreditProducts();

      console.log('[CreditProductsProvider] Loaded from storage:', {
        productsCount: storedProducts.length,
      });

      setCreditProducts(storedProducts);
      setHydrated(true);
      
      addBreadcrumb('Credit products loaded', 'storage', 'info', {
        count: storedProducts.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load credit products';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      
      setError({
        message: errorMessage,
        code: 'HYDRATION_ERROR',
        retry: hydrate,
      });
      
      setCreditProducts([]);
      setHydrated(true); // Still mark as hydrated to allow app to continue
      console.error('[CreditProductsProvider] Hydration error:', err);
      
      logError(errorObj, {
        component: 'CreditProductsProvider',
        operation: 'hydrate',
        errorCode: 'HYDRATION_ERROR',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Get active credit products
  const getActiveCreditProducts = useCallback(() => {
    return creditProducts.filter((product) => product.status === 'active');
  }, [creditProducts]);

  // Get credit product by ID
  const getCreditProductById = useCallback(
    (id: string): CreditProduct | null => {
      return creditProducts.find((product) => product.id === id) || null;
    },
    [creditProducts],
  );

  // Create credit product
  const createCreditProduct = useCallback(
    async (input: {
      name: string;
      principal: number;
      apr: number;
      creditType: CreditProductType;
      loanTermMonths?: number;
      monthlyMinimumPayment?: number;
      dueDate?: number;
      note?: string;
    }): Promise<CreditProduct> => {
      if (input.principal <= 0) {
        throw new Error('Principal amount must be greater than 0');
      }

      if (input.apr < 0) {
        throw new Error('APR must be non-negative');
      }

      const now = new Date().toISOString();
      const dailyInterestRate = calculateDailyInterestRate(input.apr);

      const newProduct: CreditProduct = {
        id: uuidv4(),
        name: input.name,
        principal: input.principal,
        remainingBalance: input.principal,
        apr: input.apr,
        dailyInterestRate,
        creditType: input.creditType,
        loanTermMonths: input.loanTermMonths,
        monthlyMinimumPayment: input.monthlyMinimumPayment,
        dueDate: input.dueDate,
        accruedInterest: 0,
        totalPaid: 0,
        status: 'active',
        startDate: now,
        createdAt: now,
        updatedAt: now,
        note: input.note,
      };

      const updated = [...creditProducts, newProduct];
      setCreditProducts(updated);
      await persistProducts(updated);

      // If this is the first credit product, add "Credits" category to expense categories
      if (creditProducts.length === 0) {
        try {
          const currentCategories = settings.customCategories || [];
          // Check if "Credits" category already exists
          const creditsCategoryExists = currentCategories.some(
            (cat) => cat.name === 'Credits' && cat.type === 'expense'
          );
          
          if (!creditsCategoryExists) {
            const updatedCategories = [
              ...currentCategories,
              {
                name: 'Credits',
                emoji: '💳',
                type: 'expense' as const,
              },
            ];
            await updateSettings({ customCategories: updatedCategories });
            addBreadcrumb('Credits category added to expense categories', 'user', 'info');
          }
        } catch (err) {
          // Don't fail product creation if category addition fails
          console.warn('[CreditProductsProvider] Failed to add Credits category:', err);
        }
      }

      addBreadcrumb('Credit product created', 'user', 'info', {
        productId: newProduct.id,
        name: newProduct.name,
        principal: newProduct.principal,
        creditType: newProduct.creditType,
      });

      return newProduct;
    },
    [creditProducts, persistProducts],
  );

  // Update credit product
  const updateCreditProduct = useCallback(
    async (
      id: string,
      input: {
        name?: string;
        principal?: number;
        apr?: number;
        creditType?: CreditProductType;
        loanTermMonths?: number;
        monthlyMinimumPayment?: number;
        dueDate?: number;
        note?: string;
      },
    ): Promise<void> => {
      const product = creditProducts.find((p) => p.id === id);
      if (!product) {
        throw new Error(`Credit product ${id} not found`);
      }

      const updatedProduct: CreditProduct = {
        ...product,
        ...input,
        dailyInterestRate: input.apr !== undefined ? calculateDailyInterestRate(input.apr) : product.dailyInterestRate,
        updatedAt: new Date().toISOString(),
      };

      const updated = creditProducts.map((p) => (p.id === id ? updatedProduct : p));
      setCreditProducts(updated);
      await persistProducts(updated);

      addBreadcrumb('Credit product updated', 'user', 'info', {
        productId: id,
        fieldsChanged: Object.keys(input),
      });
    },
    [creditProducts, persistProducts],
  );

  // Delete credit product
  const deleteCreditProduct = useCallback(
    async (id: string): Promise<void> => {
      const updated = creditProducts.filter((p) => p.id !== id);
      setCreditProducts(updated);
      await persistProducts(updated);

      addBreadcrumb('Credit product deleted', 'user', 'info', {
        productId: id,
      });
    },
    [creditProducts, persistProducts],
  );

  // Apply payment to credit product
  const applyPayment = useCallback(
    async (productId: string, amount: number): Promise<void> => {
      const product = creditProducts.find((p) => p.id === productId);
      if (!product) {
        throw new Error(`Credit product ${productId} not found`);
      }

      if (amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      let updatedProduct: CreditProduct = { ...product };

      // For credit cards: apply payment to interest first, then principal
      if (product.creditType === 'credit_card') {
        if (amount >= product.accruedInterest) {
          // Pay off all interest, remainder goes to principal
          const remainingAfterInterest = amount - product.accruedInterest;
          updatedProduct.accruedInterest = 0;
          updatedProduct.remainingBalance = Math.max(0, product.remainingBalance - remainingAfterInterest);
        } else {
          // Only pay off part of interest
          updatedProduct.accruedInterest = product.accruedInterest - amount;
        }
      } else {
        // For fixed loans and installment plans: apply directly to principal
        updatedProduct.remainingBalance = Math.max(0, product.remainingBalance - amount);
      }

      // Calculate total paid based on principal and remaining balance
      // totalPaid = principal - remainingBalance (how much of the principal has been paid off)
      // This automatically decreases when remainingBalance increases (when user uses card)
      updatedProduct.totalPaid = Math.max(0, updatedProduct.principal - updatedProduct.remainingBalance);

      // Update status
      if (updatedProduct.remainingBalance === 0 && updatedProduct.accruedInterest === 0) {
        updatedProduct.status = 'paid_off';
      }

      updatedProduct.updatedAt = new Date().toISOString();

      const updated = creditProducts.map((p) => (p.id === productId ? updatedProduct : p));
      setCreditProducts(updated);
      await persistProducts(updated);

      addBreadcrumb('Payment applied to credit product', 'user', 'info', {
        productId,
        amount,
        remainingBalance: updatedProduct.remainingBalance,
      });
    },
    [creditProducts, persistProducts],
  );

  // Add charge to credit card (increase balance when user spends money using credit card)
  const addCharge = useCallback(
    async (productId: string, amount: number): Promise<void> => {
      const product = creditProducts.find((p) => p.id === productId);
      if (!product) {
        throw new Error(`Credit product ${productId} not found`);
      }

      if (product.creditType !== 'credit_card') {
        throw new Error('addCharge can only be used for credit cards');
      }

      if (amount <= 0) {
        throw new Error('Charge amount must be greater than 0');
      }

      // Increase remaining balance (user spent money, increasing debt)
      const updatedProduct: CreditProduct = {
        ...product,
        remainingBalance: product.remainingBalance + amount,
        // Recalculate totalPaid: it decreases when remainingBalance increases
        // totalPaid = principal - remainingBalance
        totalPaid: Math.max(0, product.principal - (product.remainingBalance + amount)),
        updatedAt: new Date().toISOString(),
      };

      // Update status if needed
      if (updatedProduct.remainingBalance > 0 && updatedProduct.status === 'paid_off') {
        updatedProduct.status = 'active';
      }

      const updated = creditProducts.map((p) => (p.id === productId ? updatedProduct : p));
      setCreditProducts(updated);
      await persistProducts(updated);

      addBreadcrumb('Charge added to credit card', 'user', 'info', {
        productId,
        amount,
        newBalance: updatedProduct.remainingBalance,
      });
    },
    [creditProducts, persistProducts],
  );

  const retryHydration = useCallback(async () => {
    hasHydratedRef.current = false;
    await hydrate();
  }, [hydrate]);

  const value = useMemo(
    () => ({
      creditProducts,
      hydrated,
      loading,
      error,
      getActiveCreditProducts,
      getCreditProductById,
      createCreditProduct,
      updateCreditProduct,
      deleteCreditProduct,
      applyPayment,
      addCharge,
      retryHydration,
    }),
    [
      creditProducts,
      hydrated,
      loading,
      error,
      getActiveCreditProducts,
      getCreditProductById,
      createCreditProduct,
      updateCreditProduct,
      deleteCreditProduct,
      applyPayment,
      addCharge,
      retryHydration,
    ],
  );

  return <CreditProductsContext.Provider value={value}>{children}</CreditProductsContext.Provider>;
};

export const useCreditProducts = () => {
  const ctx = useContext(CreditProductsContext);
  if (!ctx) throw new Error('useCreditProducts must be used within CreditProductsProvider');
  return ctx;
};

