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
    return 'Today';
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  // Format as "Jan 15" or "Dec 31"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
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
 */
export const formatDateWithDay = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[date.getDay()];

  if (dateOnly.getTime() === today.getTime()) {
    return `Today, ${dayOfWeek}`;
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday, ${dayOfWeek}`;
  }

  // Format as "Jan 15, Monday" or "Dec 31, Friday"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${dayOfWeek}`;
};
