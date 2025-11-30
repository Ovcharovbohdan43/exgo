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
  recurringTransactionId?: string; // Link to recurring transaction if this was created from a recurring schedule
}

// Recurring Transactions Types
export type RecurringTransactionType = 'subscription' | 'rent' | 'salary' | 'bill' | 'other';

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type RecurringTransactionStatus = 'active' | 'paused' | 'completed';

export interface RecurringTransaction {
  id: string;
  name: string; // User-defined name for the recurring transaction
  type: TransactionType; // Type of transaction (expense, income, etc.)
  recurringType: RecurringTransactionType; // Category: subscription, rent, salary, etc.
  amount: number;
  category?: string;
  frequency: RecurringFrequency; // How often it repeats
  startDate: string; // ISO string - when the recurring transaction starts
  nextDueDate: string; // ISO string - next scheduled date
  endDate?: string; // ISO string - optional end date
  creditProductId?: string; // For credit transactions
  paidByCreditProductId?: string; // For expense transactions paid by credit card
  goalId?: string; // For saved transactions
  status: RecurringTransactionStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  note?: string; // Optional note
}

// Upcoming Transaction (virtual transaction shown 3 days before due date)
export interface UpcomingTransaction {
  id: string; // Generated ID for display purposes
  recurringTransactionId: string; // Link to the recurring transaction
  name: string; // Name from recurring transaction
  type: TransactionType;
  amount: number;
  category?: string;
  scheduledDate: string; // ISO string - when this transaction will occur
  daysUntil: number; // Number of days until the transaction occurs
}

// Credit Products Types
export type CreditType = 'credit_card' | 'loan' | 'installment';

export interface CreditProduct {
  id: string;
  name: string;
  creditType: CreditType;
  creditLimit: number; // Total credit limit
  currentBalance: number; // Current balance (for credit cards) or remaining principal (for loans)
  interestRate?: number; // Annual interest rate (optional)
  minimumPayment?: number; // Minimum payment amount (for credit cards)
  dueDate?: number; // Day of month when payment is due (for credit cards)
  startDate: string; // ISO string - when the credit product was opened
  endDate?: string; // ISO string - when the credit product will be closed (for loans/installments)
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Goal Types
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  emoji?: string;
  note?: string; // Optional note
  createdAt: string; // ISO string
  completedAt?: string; // ISO string - when the goal was completed
  updatedAt: string; // ISO string
}

// Mini Budget Types
export interface MiniBudget {
  id: string;
  name: string;
  category: string;
  limit: number;
  month: string; // Month key in format YYYY-MM
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface MiniBudgetState {
  budgetId: string;
  month: string; // Month key in format YYYY-MM
  spent: number;
  remaining: number;
  status: 'ok' | 'warning' | 'over';
  updatedAt: string; // ISO string
}

// Notification Types
export interface Notification {
  id: string;
  type: 'large_expense' | 'budget_warning' | 'budget_exceeded' | 'goal_milestone' | 'goal_completed' | 'recurring_due';
  title: string;
  message: string;
  transactionId?: string; // For transaction-related notifications
  goalId?: string; // For goal-related notifications
  budgetId?: string; // For budget-related notifications
  recurringTransactionId?: string; // For recurring transaction notifications
  createdAt: string; // ISO string
  read: boolean;
}

// Settings Types
export interface Settings {
  currency: string;
  monthlyIncome: number;
  language: string;
  themePreference: 'light' | 'dark' | 'system';
  enablePIN: boolean;
  enableBiometric: boolean;
  pin?: string; // Hashed PIN
  isOnboarded: boolean;
  firstMonthKey?: string; // First month key in format YYYY-MM
  customCategories?: Array<{
    name: string;
    emoji: string;
    type?: 'expense' | 'income';
  }>;
}

// Analytics Types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: string; // ISO string
}

// Gamification Types
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string; // ISO string
}

export interface UserProgress {
  level: number;
  experience: number;
  streak: number;
  badges: Badge[];
}
