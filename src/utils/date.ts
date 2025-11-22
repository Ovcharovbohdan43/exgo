export const isCurrentMonth = (isoDate: string): boolean => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};
