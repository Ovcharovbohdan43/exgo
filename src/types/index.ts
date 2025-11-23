export type TransactionType = 'expense' | 'income' | 'saved';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category?: string;
  createdAt: string; // ISO string
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserSettings {
  currency: string;
  monthlyIncome: number;
  isOnboarded: boolean;
  firstMonthKey?: string; // First month when user started using the app (YYYY-MM)
  themePreference?: ThemePreference; // Theme preference: 'light', 'dark', or 'system'
}

export type NotificationType = 
  | 'monthly_start_high_spending' 
  | 'budget_warning' 
  | 'overspending' 
  | 'achievement' 
  | 'negative_balance'
  | 'overspending_50_percent'
  | 'large_expense_spike'
  | 'low_balance_20_percent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO string
  read: boolean;
  monthKey?: string; // Month key (YYYY-MM) this notification is related to
}
