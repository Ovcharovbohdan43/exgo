export type TransactionType = 'expense' | 'income' | 'saved' | 'credit';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category?: string;
  creditProductId?: string; // Link to credit product for credit transactions (payments)
  paidByCreditProductId?: string; // Link to credit card used for payment (for expense transactions)
  goalId?: string; // Link to goal for saved transactions
  createdAt: string; // ISO string
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface CustomCategory {
  name: string;
  emoji: string;
  type: 'expense' | 'income'; // Type of transaction this category belongs to
}

export type SupportedLanguage = 'en' | 'uk';

export interface UserSettings {
  currency: string;
  monthlyIncome: number;
  isOnboarded: boolean;
  firstMonthKey?: string; // First month when user started using the app (YYYY-MM)
  themePreference?: ThemePreference; // Theme preference: 'light', 'dark', or 'system'
  language?: SupportedLanguage; // Interface language: 'en' (English) or 'uk' (Ukrainian)
  customCategories?: CustomCategory[]; // User-defined categories for expenses and income
  // Security settings
  enableBiometric?: boolean; // Enable biometric authentication (Face ID, Touch ID, Fingerprint)
  enablePIN?: boolean; // Enable PIN code authentication
  pin?: string; // Stored PIN (should be hashed in production)
}

export type NotificationType = 
  | 'monthly_start_high_spending' 
  | 'budget_warning' 
  | 'overspending' 
  | 'achievement' 
  | 'negative_balance'
  | 'overspending_50_percent'
  | 'large_expense_spike'
  | 'low_balance_20_percent'
  | 'mini_budget_warning'
  | 'mini_budget_over';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO string
  read: boolean;
  monthKey?: string; // Month key (YYYY-MM) this notification is related to
}

export type MiniBudgetStatus = 'active' | 'archived';

export type MiniBudgetState = 'ok' | 'warning' | 'over';

export interface MiniBudget {
  id: string;
  name: string;
  month: string; // Month key (YYYY-MM)
  currency: string;
  limitAmount: number;
  linkedCategoryIds: string[]; // Array of category names
  status: MiniBudgetStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  note?: string; // Optional note
}

export interface MiniBudgetMonthlyState {
  budgetId: string;
  month: string; // Month key (YYYY-MM)
  spentAmount: number;
  remaining: number; // limitAmount - spentAmount
  pace: number; // spent / daysElapsed
  forecast: number; // pace * daysInMonth
  state: MiniBudgetState; // 'ok' | 'warning' | 'over'
  daysElapsed: number;
  daysInMonth: number;
}

export interface MiniBudgetWithState extends MiniBudget {
  state: MiniBudgetMonthlyState;
}

// Credit Products Types
export type CreditProductType = 'credit_card' | 'fixed_loan' | 'installment';

export type CreditProductStatus = 'active' | 'paid_off' | 'overdue';

export interface CreditProduct {
  id: string;
  name: string;
  principal: number; // Initial debt amount
  remainingBalance: number; // Current remaining balance
  apr: number; // Annual percentage rate (%)
  dailyInterestRate: number; // Calculated: apr / 100 / 365
  creditType: CreditProductType;
  loanTermMonths?: number; // For amortization loans
  monthlyMinimumPayment?: number;
  dueDate?: number; // Day of month (1-31)
  accruedInterest: number; // Daily interest accrued
  totalPaid: number; // Total amount paid so far
  status: CreditProductStatus;
  startDate: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  lastInterestCalculationDate: string; // ISO string - last date when interest was calculated
  note?: string; // Optional note
}

// Goals Types
export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number; // Target amount to save
  currentAmount: number; // Current amount saved (sum of related saved transactions)
  currency: string;
  emoji?: string; // Optional emoji for the goal
  status: GoalStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  completedAt?: string; // ISO string - when goal was completed
  note?: string; // Optional note
}
