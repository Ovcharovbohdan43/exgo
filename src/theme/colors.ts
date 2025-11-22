/**
 * Color tokens for ExGo app
 * Supports light and dark themes
 */

export const lightColors = {
  // Background colors
  background: '#ffffff',
  surface: '#f6f7fb',
  card: '#ffffff',
  
  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  
  // Semantic colors
  accent: '#2563eb',
  accentLight: '#dbeafe',
  positive: '#10b981',
  positiveLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  
  // Border colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
} as const;

export const darkColors = {
  // Background colors
  background: '#111827',
  surface: '#1f2937',
  card: '#374151',
  
  // Text colors
  textPrimary: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  
  // Semantic colors
  accent: '#3b82f6',
  accentLight: '#1e3a8a',
  positive: '#10b981',
  positiveLight: '#065f46',
  warning: '#f59e0b',
  warningLight: '#78350f',
  danger: '#ef4444',
  dangerLight: '#7f1d1d',
  
  // Border colors
  border: '#374151',
  borderLight: '#4b5563',
} as const;

export type ColorScheme = 'light' | 'dark';

// Union type for theme colors (both light and dark have same structure)
export type ThemeColors = typeof lightColors | typeof darkColors;

// Default export for backward compatibility
export const colors = lightColors;
