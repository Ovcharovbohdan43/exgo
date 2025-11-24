import i18n from '../i18n';

export const isCurrentMonth = (isoDate: string): boolean => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

/**
 * Format date to readable string
 * @param isoDate - ISO date string
 * @returns Formatted date string (e.g., "Jan 15" or "Today", "Yesterday")
 * Uses i18n for localization
 */
export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) {
    return i18n.t('date.today');
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return i18n.t('date.yesterday');
  }

  // Format as "Jan 15" or "Dec 31" using localized month names
  const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december'];
  const monthKey = monthKeys[date.getMonth()];
  const monthShort = i18n.t(`date.monthsShort.${monthKey}`);
  return `${monthShort} ${date.getDate()}`;
};

/**
 * Get date key for grouping transactions by date
 * @param isoDate - ISO date string
 * @returns Date key string (YYYY-MM-DD) in local timezone
 */
export const getDateKey = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  
  // Use local date components to avoid timezone issues
  // This ensures that a transaction created on Monday in local time
  // is grouped under Monday, not Sunday (which could happen with UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Format date with day of week for section headers
 * @param isoDate - ISO date string
 * @returns Formatted date string with day of week (e.g., "Today, Saturday" or "Jan 15, Monday")
 * Uses i18n for localization
 */
export const formatDateWithDay = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Get localized day of week
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayKeys[date.getDay()];
  const dayOfWeek = i18n.t(`date.daysOfWeek.${dayKey}`);

  if (dateOnly.getTime() === today.getTime()) {
    return `${i18n.t('date.today')}, ${dayOfWeek}`;
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `${i18n.t('date.yesterday')}, ${dayOfWeek}`;
  }

  // Format as "Jan 15, Monday" or "Dec 31, Friday" using localized month names
  const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december'];
  const monthKey = monthKeys[date.getMonth()];
  const monthShort = i18n.t(`date.monthsShort.${monthKey}`);
  return `${monthShort} ${date.getDate()}, ${dayOfWeek}`;
};
