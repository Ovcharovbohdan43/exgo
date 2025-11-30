import { Transaction } from '../types';
import { SupportedLanguage } from '../i18n';
import { calculateTotals, categoryBreakdown } from '../modules/calculations';
import { formatCurrency, getCurrencySymbol } from './format';
import { parseMonthKey } from './month';
import { getDateKey } from './date';
import enTranslations from '../i18n/locales/en.json';
import ukTranslations from '../i18n/locales/uk.json';

/**
 * Get translation for a specific language
 */
const getTranslation = (lang: SupportedLanguage, key: string, defaultValue?: string): string => {
  try {
    const translations = lang === 'uk' ? ukTranslations : enTranslations;
    
    // Debug: check if translations object exists
    if (!translations || typeof translations !== 'object') {
      console.error(`[pdfReport] Translations object is invalid for language: ${lang}`, translations);
      return defaultValue || key;
    }
    
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`[pdfReport] Translation key not found: ${key} for language ${lang} at step "${k}", current value:`, value);
        return defaultValue || key;
      }
    }
    
    if (typeof value === 'string') {
      return value;
    } else {
      console.warn(`[pdfReport] Translation value is not a string for key: ${key} (language: ${lang}), got:`, typeof value, value);
      return defaultValue || key;
    }
  } catch (error) {
    console.error(`[pdfReport] Error getting translation for key: ${key} (language: ${lang}):`, error);
    return defaultValue || key;
  }
};

/**
 * Get localized category name for a specific language
 */
const getLocalizedCategoryForLanguage = (category: string, language: SupportedLanguage): string => {
  const translation = getTranslation(language, `categories.${category}`, category);
  return translation;
};

/**
 * Format month name for a specific language
 */
const formatMonthNameForLanguage = (monthKey: string, language: SupportedLanguage): string => {
  const date = parseMonthKey(monthKey);
  const localeMap: Record<SupportedLanguage, string> = {
    'en': 'en-US',
    'uk': 'uk-UA',
  };
  const locale = localeMap[language] || 'en-US';
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};

/**
 * Format date with day of week for a specific language
 */
const formatDateWithDayForLanguage = (isoDate: string, language: SupportedLanguage): string => {
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
  const dayOfWeek = getTranslation(language, `date.daysOfWeek.${dayKey}`, dayKey);

  if (dateOnly.getTime() === today.getTime()) {
    return `${getTranslation(language, 'date.today', 'Today')}, ${dayOfWeek}`;
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `${getTranslation(language, 'date.yesterday', 'Yesterday')}, ${dayOfWeek}`;
  }

  // Format as "Jan 15, Monday" or "Dec 31, Friday" using localized month names
  const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december'];
  const monthKey = monthKeys[date.getMonth()];
  const monthShort = getTranslation(language, `date.monthsShort.${monthKey}`, monthKey);
  return `${monthShort} ${date.getDate()}, ${dayOfWeek}`;
};

/**
 * PDF Report localization strings getter
 */
const getPdfReportStrings = (language: SupportedLanguage) => {
  console.log('[pdfReport] getPdfReportStrings called with language:', language);
  console.log('[pdfReport] Available translations:', language === 'uk' ? 'ukTranslations' : 'enTranslations');
  
  const title = getTranslation(language, 'pdfReport.title', 'Monthly Financial Report');
  console.log('[pdfReport] Title translation:', title, 'for language:', language);
  
  return {
    title,
    totalIncome: getTranslation(language, 'pdfReport.totalIncome', 'Total Income'),
    totalExpenses: getTranslation(language, 'pdfReport.totalExpenses', 'Total Expenses'),
    totalSaved: getTranslation(language, 'pdfReport.totalSaved', 'Total Saved'),
    remaining: getTranslation(language, 'pdfReport.remaining', 'Remaining'),
    budgetOverview: getTranslation(language, 'pdfReport.budgetOverview', 'Budget Overview'),
    expenses: getTranslation(language, 'pdfReport.expenses', 'Expenses'),
    saved: getTranslation(language, 'pdfReport.saved', 'Saved'),
    dailySpending: getTranslation(language, 'pdfReport.dailySpending', 'Daily Spending'),
    topExpenseCategories: getTranslation(language, 'pdfReport.topExpenseCategories', 'Top Expense Categories'),
    transactionHistory: getTranslation(language, 'pdfReport.transactionHistory', 'Transaction History'),
    date: getTranslation(language, 'pdfReport.date', 'Date'),
    type: getTranslation(language, 'pdfReport.type', 'Type'),
    category: getTranslation(language, 'pdfReport.category', 'Category'),
    amount: getTranslation(language, 'pdfReport.amount', 'Amount'),
    ofTotalExpenses: getTranslation(language, 'pdfReport.ofTotalExpenses', 'of total expenses'),
    generatedOn: getTranslation(language, 'pdfReport.generatedOn', 'Generated on'),
    appName: getTranslation(language, 'pdfReport.appName', 'ExGo Budgeting App'),
    expense: getTranslation(language, 'transactions.type.expense', 'expense'),
    income: getTranslation(language, 'transactions.type.income', 'income'),
    savedType: getTranslation(language, 'transactions.type.saved', 'saved'),
    credit: getTranslation(language, 'transactions.type.credit', 'credit'),
  };
};

export interface MonthlyReportData {
  monthKey: string;
  transactions: Transaction[];
  monthlyIncome: number;
  currency: string;
  language?: 'en' | 'uk'; // Language for report localization
}

/**
 * Generate daily spending data for chart
 */
const getDailySpendingData = (transactions: Transaction[]): Array<{ date: string; amount: number }> => {
  const dailyData: Record<string, number> = {};
  
  transactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      const dateKey = getDateKey(tx.createdAt);
      if (dateKey) {
        dailyData[dateKey] = (dailyData[dateKey] || 0) + tx.amount;
      }
    });

  return Object.entries(dailyData)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Generate SVG donut chart for PDF
 */
const generateDonutChartSVG = (
  expenses: number,
  saved: number,
  remaining: number,
  totalIncome: number,
  currency: string,
  remainingLabel: string,
  size: number = 200,
): string => {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const expensesPercent = totalIncome > 0 ? (expenses / totalIncome) * 100 : 0;
  const savedPercent = totalIncome > 0 ? (saved / totalIncome) * 100 : 0;
  const remainingPercent = totalIncome > 0 ? (Math.max(remaining, 0) / totalIncome) * 100 : 0;

  // Calculate dash offsets for each segment
  // Each segment starts where the previous one ended
  const expensesLength = (expensesPercent / 100) * circumference;
  const savedLength = (savedPercent / 100) * circumference;
  const remainingLength = (remainingPercent / 100) * circumference;

  const expensesOffset = circumference - expensesLength;
  const savedOffset = circumference - savedLength;
  const remainingOffset = circumference - remainingLength;

  // Format remaining amount with currency (show actual value, even if negative)
  const remainingFormatted = formatCurrency(remaining, currency);
  
  // Color for center label: red if negative (over budget), otherwise dark gray
  const centerLabelColor = remaining < 0 ? '#ef4444' : '#1f2937';

  // Calculate total for segment positioning (same logic as in app)
  // Clamp remaining at 0 for visual representation (same as chartRemaining)
  const clampedRemaining = Math.max(remaining, 0);
  const total = Math.max(expenses + saved + clampedRemaining, 1);
  
  // Calculate segment lengths based on total (not totalIncome) to match app logic
  // This matches the logic in DonutChart component: spent / total, saved / total, clampedRemaining / total
  const expensesSegmentLength = (expenses / total) * circumference;
  const savedSegmentLength = (saved / total) * circumference;
  const remainingSegmentLength = (clampedRemaining / total) * circumference;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <!-- Background circle -->
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="none"
        stroke="#e0e0e0"
        stroke-width="20"
      />
      <!-- Expenses segment (red) - first segment -->
      ${expenses > 0 ? `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="none"
        stroke="#ef4444"
        stroke-width="20"
        stroke-dasharray="${expensesSegmentLength} ${circumference}"
        stroke-dashoffset="${circumference - expensesSegmentLength}"
        stroke-linecap="round"
        transform="rotate(-90 ${center} ${center})"
      />
      ` : ''}
      <!-- Saved segment (green) - second segment, starts after expenses -->
      ${saved > 0 ? `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="none"
        stroke="#10b981"
        stroke-width="20"
        stroke-dasharray="${savedSegmentLength} ${circumference}"
        stroke-dashoffset="${circumference - savedSegmentLength - expensesSegmentLength}"
        stroke-linecap="round"
        transform="rotate(-90 ${center} ${center})"
      />
      ` : ''}
      <!-- Remaining segment (blue) - third segment, starts after expenses + saved -->
      ${clampedRemaining > 0 ? `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="none"
        stroke="#3b82f6"
        stroke-width="20"
        stroke-dasharray="${remainingSegmentLength} ${circumference}"
        stroke-dashoffset="${circumference - remainingSegmentLength - expensesSegmentLength - savedSegmentLength}"
        stroke-linecap="round"
        transform="rotate(-90 ${center} ${center})"
      />
      ` : ''}
      <!-- Center text -->
      <text
        x="${center}"
        y="${center - 10}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="20"
        font-weight="bold"
        fill="${centerLabelColor}"
      >${remainingFormatted}</text>
      <text
        x="${center}"
        y="${center + 15}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="14"
        fill="#6b7280"
      >${remainingLabel}</text>
    </svg>
  `;
};

/**
 * Generate bar chart SVG for daily spending
 */
const generateDailySpendingChart = (
  dailyData: Array<{ date: string; amount: number }>,
  maxAmount: number,
  width: number = 600,
  height: number = 200,
): string => {
  const barWidth = width / Math.max(dailyData.length, 1);
  const maxBarHeight = height - 40;

  const bars = dailyData
    .map((item, index) => {
      const barHeight = maxAmount > 0 ? (item.amount / maxAmount) * maxBarHeight : 0;
      const x = index * barWidth;
      const y = height - barHeight - 20;
      const dateLabel = new Date(item.date).getDate().toString();

      return `
        <g>
          <rect
            x="${x + 2}"
            y="${y}"
            width="${barWidth - 4}"
            height="${barHeight}"
            fill="#3b82f6"
            rx="2"
          />
          <text
            x="${x + barWidth / 2}"
            y="${height - 5}"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="10"
            fill="#6b7280"
          >${dateLabel}</text>
        </g>
      `;
    })
    .join('');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${bars}
    </svg>
  `;
};

/**
 * Generate HTML report for PDF export
 */
export const generateReportHTML = (data: MonthlyReportData): string => {
  const { monthKey, transactions, monthlyIncome, currency, language = 'en' } = data;
  
  // Ensure language is valid - normalize to 'en' or 'uk'
  const languageStr = String(language);
  let validLanguage: SupportedLanguage = 'en';
  if (languageStr === 'uk' || languageStr.startsWith('uk')) {
    validLanguage = 'uk';
  } else if (languageStr === 'en' || languageStr.startsWith('en')) {
    validLanguage = 'en';
  }
  
  console.log('[pdfReport] Generating report with language:', validLanguage, 'original:', language, 'type:', typeof language, 'stringified:', languageStr);
  
  const t = getPdfReportStrings(validLanguage);
  const totals = calculateTotals(transactions, monthlyIncome);
  const categoryData = categoryBreakdown(transactions);
  const dailySpending = getDailySpendingData(transactions);
  const maxDailyAmount = dailySpending.length > 0 
    ? Math.max(...dailySpending.map((d) => d.amount)) 
    : 0;

  const monthName = formatMonthNameForLanguage(monthKey, validLanguage);
  const currencySymbol = getCurrencySymbol(currency);

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Group transactions by date
  const groupedTransactions: Record<string, Transaction[]> = {};
  sortedTransactions.forEach((tx) => {
    const dateKey = getDateKey(tx.createdAt);
    if (dateKey) {
      if (!groupedTransactions[dateKey]) {
        groupedTransactions[dateKey] = [];
      }
      groupedTransactions[dateKey].push(tx);
    }
  });

  // Get top expense categories
  const topCategories = Object.entries(categoryData)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5);

  const donutChartSVG = generateDonutChartSVG(
    totals.expenses,
    totals.saved,
    totals.remaining,
    totals.income,
    currency,
    t.remaining,
  );

  const dailyChartSVG = generateDailySpendingChart(dailySpending, maxDailyAmount);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      padding: 40px;
      background: #ffffff;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-left {
      flex: 1;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .header .subtitle {
      font-size: 16px;
      color: #6b7280;
    }
    .header-logo {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
      letter-spacing: 2px;
    }
    .summary-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 20px;
    }
    .summary-card {
      flex: 1;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      min-height: 140px;
    }
    .summary-card h3 {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1.4;
    }
    .summary-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      flex-grow: 1;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      line-height: 1.2;
      margin-top: auto;
      padding-top: 8px;
    }
    .summary-card.income .value { color: #10b981; }
    .summary-card.expenses .value { color: #ef4444; }
    .summary-card.saved .value { color: #3b82f6; }
    .summary-card.remaining .value { color: ${totals.remaining >= 0 ? '#10b981' : '#ef4444'}; }
    .chart-section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .chart-container {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
    }
    .chart-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111827;
    }
    .chart-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 20px 0;
    }
    .chart-legend {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
    .legend-color.expenses { background: #ef4444; }
    .legend-color.saved { background: #10b981; }
    .legend-color.remaining { background: #3b82f6; }
    .categories-section {
      margin-bottom: 40px;
    }
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 20px;
    }
    .category-item {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
    }
    .category-name {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    .category-amount {
      font-size: 18px;
      font-weight: 700;
      color: #ef4444;
      margin-bottom: 4px;
    }
    .category-percent {
      font-size: 12px;
      color: #6b7280;
    }
    .transactions-section {
      margin-bottom: 40px;
      page-break-before: always;
    }
    .transactions-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .transactions-table thead {
      background: #f9fafb;
    }
    .transactions-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .transactions-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    .transactions-table tbody tr:last-child td {
      border-bottom: none;
    }
    .transaction-type {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .transaction-type.expense {
      background: #fee2e2;
      color: #991b1b;
    }
    .transaction-type.income {
      background: #d1fae5;
      color: #065f46;
    }
    .transaction-type.saved {
      background: #dbeafe;
      color: #1e40af;
    }
    .transaction-amount {
      font-weight: 600;
    }
    .transaction-amount.expense { color: #ef4444; }
    .transaction-amount.income { color: #10b981; }
    .transaction-amount.saved { color: #3b82f6; }
    .date-group {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .chart-section {
        page-break-inside: avoid;
      }
      .transactions-section {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${t.title}</h1>
      <div class="subtitle">${monthName}</div>
    </div>
    <div class="header-logo">ExGo</div>
  </div>

  <div class="summary-section">
    <div class="summary-card income">
      <h3>${t.totalIncome}</h3>
      <div class="value">${formatCurrency(totals.income, currency)}</div>
    </div>
    <div class="summary-card expenses">
      <h3>${t.totalExpenses}</h3>
      <div class="value">${formatCurrency(totals.expenses, currency)}</div>
    </div>
    <div class="summary-card saved">
      <h3>${t.totalSaved}</h3>
      <div class="value">${formatCurrency(totals.saved, currency)}</div>
    </div>
    <div class="summary-card remaining">
      <h3>${t.remaining}</h3>
      <div class="value">${formatCurrency(totals.remaining, currency)}</div>
    </div>
  </div>

  <div class="chart-section">
    <div class="chart-container">
      <div class="chart-title">${t.budgetOverview}</div>
      <div class="chart-wrapper">
        ${donutChartSVG}
      </div>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color expenses"></div>
          <span>${t.expenses}: ${formatCurrency(totals.expenses, currency)}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color saved"></div>
          <span>${t.saved}: ${formatCurrency(totals.saved, currency)}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color remaining"></div>
          <span>${t.remaining}: ${formatCurrency(totals.remaining, currency)}</span>
        </div>
      </div>
    </div>
  </div>

  ${dailySpending.length > 0 ? `
  <div class="chart-section">
    <div class="chart-container">
      <div class="chart-title">${t.dailySpending}</div>
      <div class="chart-wrapper">
        ${dailyChartSVG}
      </div>
    </div>
  </div>
  ` : ''}

  ${topCategories.length > 0 ? `
  <div class="categories-section">
    <h2 class="chart-title">${t.topExpenseCategories}</h2>
    <div class="categories-grid">
        ${topCategories
        .map(
          ([category, data]) => {
            const localizedCategory = getLocalizedCategoryForLanguage(category, validLanguage);
            return `
        <div class="category-item">
          <div class="category-name">${localizedCategory}</div>
          <div class="category-amount">${formatCurrency(data.amount, currency)}</div>
          <div class="category-percent">${data.percent.toFixed(1)}% ${t.ofTotalExpenses}</div>
        </div>
      `;
          },
        )
        .join('')}
    </div>
  </div>
  ` : ''}

  <div class="transactions-section">
    <h2 class="chart-title">${t.transactionHistory}</h2>
    <table class="transactions-table">
      <thead>
        <tr>
          <th>${t.date}</th>
          <th>${t.type}</th>
          <th>${t.category}</th>
          <th>${t.amount}</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(groupedTransactions)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([dateKey, txs]) => {
            const dateLabel = formatDateWithDayForLanguage(txs[0].createdAt, validLanguage);
            return `
              <tr class="date-group">
                <td colspan="4">${dateLabel}</td>
              </tr>
              ${txs
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(
                  (tx) => {
                    const localizedCategory = tx.category ? getLocalizedCategoryForLanguage(tx.category, validLanguage) : getTranslation(validLanguage, 'transactions.uncategorized', '-');
                    return `
                <tr>
                  <td>${new Date(tx.createdAt).toLocaleTimeString(validLanguage === 'uk' ? 'uk-UA' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</td>
                  <td>
                    <span class="transaction-type ${tx.type}">${tx.type === 'expense' ? t.expense : tx.type === 'income' ? t.income : tx.type === 'saved' ? t.savedType : tx.type === 'credit' ? t.credit : tx.type}</span>
                  </td>
                  <td>${localizedCategory}</td>
                  <td class="transaction-amount ${tx.type}">
                    ${tx.type === 'expense' ? '-' : '+'}${formatCurrency(tx.amount, currency)}
                  </td>
                </tr>
              `;
                  },
                )
                .join('')}
            `;
          })
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>${t.generatedOn} ${new Date().toLocaleDateString(validLanguage === 'uk' ? 'uk-UA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}</p>
    <p>${t.appName}</p>
  </div>
</body>
</html>
  `;
};

