/**
 * Notification Localization Utilities
 * 
 * Provides functions to get localized notification titles and messages
 */

import i18n from '../i18n';
import { Notification, NotificationType } from '../types';

/**
 * Get localized title for a notification based on its type
 * @param notification - Notification object
 * @returns Localized title or original if translation not found
 */
export const getLocalizedNotificationTitle = (notification: Notification): string => {
  try {
    const typeKey = notification.type;
    const translationKey = `notifications.${typeKey}.title`;
    const translation = i18n.t(translationKey, { defaultValue: notification.title });
    
    // If translation key doesn't exist, try alternative mapping
    if (translation === translationKey) {
      // Map notification types to translation keys
      const typeMap: Record<NotificationType, string> = {
        'monthly_start_high_spending': 'notifications.highSpendingAlert.title',
        'negative_balance': 'notifications.fundsExhausted.title',
        'overspending_50_percent': 'notifications.overspendingAlert.title',
        'large_expense_spike': 'notifications.largeExpenseAlert.title',
        'low_balance_20_percent': 'notifications.lowBalanceWarning.title',
        'budget_warning': 'notifications.budgetWarning.title', // Fallback if exists
        'overspending': 'notifications.overspendingAlert.title', // Fallback
        'achievement': 'notifications.achievement.title', // Fallback if exists
        'mini_budget_warning': 'notifications.miniBudgetWarning.title',
        'mini_budget_over': 'notifications.miniBudgetOver.title',
      };
      
      const mappedKey = typeMap[typeKey];
      if (mappedKey) {
        return i18n.t(mappedKey, { defaultValue: notification.title });
      }
    }
    
    return translation;
  } catch (error) {
    // Fallback to original title if translation fails
    return notification.title;
  }
};

/**
 * Get localized message for a notification based on its type
 * @param notification - Notification object
 * @returns Localized message or original if translation not found
 */
export const getLocalizedNotificationMessage = (notification: Notification): string => {
  try {
    const typeKey = notification.type;
    const translationKey = `notifications.${typeKey}.message`;
    const translation = i18n.t(translationKey, { defaultValue: notification.message });
    
    // If translation key doesn't exist, try alternative mapping
    if (translation === translationKey) {
      // Map notification types to translation keys
      const typeMap: Record<NotificationType, string> = {
        'monthly_start_high_spending': 'notifications.highSpendingAlert.message',
        'negative_balance': 'notifications.fundsExhausted.message',
        'overspending_50_percent': 'notifications.overspendingAlert.message',
        'large_expense_spike': 'notifications.largeExpenseAlert.message',
        'low_balance_20_percent': 'notifications.lowBalanceWarning.message',
        'budget_warning': 'notifications.budgetWarning.message', // Fallback if exists
        'overspending': 'notifications.overspendingAlert.message', // Fallback
        'achievement': 'notifications.achievement.message', // Fallback if exists
        'mini_budget_warning': 'notifications.miniBudgetWarning.message',
        'mini_budget_over': 'notifications.miniBudgetOver.message',
      };
      
      const mappedKey = typeMap[typeKey];
      if (mappedKey) {
        return i18n.t(mappedKey, { defaultValue: notification.message });
      }
    }
    
    return translation;
  } catch (error) {
    // Fallback to original message if translation fails
    return notification.message;
  }
};

