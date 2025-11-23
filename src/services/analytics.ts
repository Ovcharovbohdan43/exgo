/**
 * Analytics Service
 * 
 * Provides centralized event tracking for user actions and app events.
 * Uses Sentry for event tracking (can be extended to support other analytics providers).
 * 
 * @module services/analytics
 */

import * as Sentry from '@sentry/react-native';
import { logInfo, addBreadcrumb } from './sentry';

/**
 * Analytics event types
 */
export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'transaction_created'
  | 'transaction_deleted'
  | 'transaction_updated'
  | 'budget_exceeded'
  | 'screen_view'
  | 'settings_changed';

/**
 * Event properties interface
 */
export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Track an analytics event
 * 
 * @param event - Event name
 * @param properties - Optional event properties
 */
export const trackEvent = (event: AnalyticsEvent, properties?: AnalyticsProperties): void => {
  try {
    // Log to console in development
    if (__DEV__) {
      console.log('[Analytics] Event:', event, properties || {});
    }

    // Add breadcrumb to Sentry for context
    addBreadcrumb(
      `Analytics: ${event}`,
      'analytics',
      'info',
      properties || {}
    );

    // Track as Sentry event with custom context
    Sentry.addBreadcrumb({
      category: 'analytics',
      message: event,
      level: 'info',
      data: properties || {},
      timestamp: Date.now() / 1000,
    });

    // Set custom context for this event
    Sentry.setContext('analytics_event', {
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
    });

    // Also log as info for Sentry
    logInfo(`Analytics event: ${event}`, properties || {});
  } catch (error) {
    // Silently fail analytics to not break app functionality
    if (__DEV__) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }
};

/**
 * Track onboarding completion
 * 
 * @param properties - Onboarding properties (currency, monthlyIncome, etc.)
 */
export const trackOnboardingCompleted = (properties?: {
  currency?: string;
  monthlyIncome?: number;
}): void => {
  trackEvent('onboarding_completed', {
    currency: properties?.currency,
    monthly_income: properties?.monthlyIncome,
  });
};

/**
 * Track transaction creation
 * 
 * @param properties - Transaction properties
 */
export const trackTransactionCreated = (properties?: {
  type?: 'expense' | 'income' | 'saved';
  amount?: number;
  category?: string;
  month?: string;
}): void => {
  trackEvent('transaction_created', {
    transaction_type: properties?.type,
    amount: properties?.amount,
    category: properties?.category,
    month: properties?.month,
  });
};

/**
 * Track transaction deletion
 * 
 * @param properties - Transaction properties
 */
export const trackTransactionDeleted = (properties?: {
  type?: 'expense' | 'income' | 'saved';
  amount?: number;
  category?: string;
  month?: string;
}): void => {
  trackEvent('transaction_deleted', {
    transaction_type: properties?.type,
    amount: properties?.amount,
    category: properties?.category,
    month: properties?.month,
  });
};

/**
 * Track transaction update
 * 
 * @param properties - Transaction properties
 */
export const trackTransactionUpdated = (properties?: {
  type?: 'expense' | 'income' | 'saved';
  amount?: number;
  category?: string;
  month?: string;
}): void => {
  trackEvent('transaction_updated', {
    transaction_type: properties?.type,
    amount: properties?.amount,
    category: properties?.category,
    month: properties?.month,
  });
};

/**
 * Track budget exceeded event
 * 
 * @param properties - Budget exceeded properties
 */
export const trackBudgetExceeded = (properties?: {
  monthly_income?: number;
  total_expenses?: number;
  total_saved?: number;
  remaining?: number;
  month?: string;
  exceeded_by?: number;
}): void => {
  trackEvent('budget_exceeded', {
    monthly_income: properties?.monthly_income,
    total_expenses: properties?.total_expenses,
    total_saved: properties?.total_saved,
    remaining: properties?.remaining,
    month: properties?.month,
    exceeded_by: properties?.exceeded_by,
  });
};

/**
 * Track screen view
 * 
 * @param screenName - Name of the screen
 * @param properties - Optional screen properties
 */
export const trackScreenView = (screenName: string, properties?: AnalyticsProperties): void => {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  });
};

/**
 * Track settings change
 * 
 * @param properties - Settings change properties
 */
export const trackSettingsChanged = (properties?: {
  setting_name?: string;
  old_value?: string | number | boolean;
  new_value?: string | number | boolean;
}): void => {
  trackEvent('settings_changed', {
    setting_name: properties?.setting_name,
    old_value: properties?.old_value?.toString(),
    new_value: properties?.new_value?.toString(),
  });
};

