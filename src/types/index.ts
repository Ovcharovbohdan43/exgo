export type TransactionType = 'expense' | 'income' | 'saved';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category?: string;
  createdAt: string; // ISO string
}

export interface UserSettings {
  currency: string;
  monthlyIncome: number;
  isOnboarded: boolean;
  firstMonthKey?: string; // First month when user started using the app (YYYY-MM)
}
