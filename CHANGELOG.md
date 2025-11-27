# Changelog

All notable changes to the ExGo project will be documented in this file.

## [Unreleased]

### [2025-01-27] - Feature: Goals (Financial Goals Tracking)

#### Added
- **Goals feature**: Complete implementation of financial goals tracking system
  - Users can create financial goals with target amounts (e.g., "buy a car", "save for down payment")
  - Goals can be linked to "saved" transactions to track progress automatically
  - Progress bars and statistics display current progress towards each goal
  - Automatic goal completion detection when `currentAmount >= targetAmount`
  - Goal completion triggers confetti animation and notification
  - Goals screen displays active and completed goals separately
  - Completed goals are highlighted with green border

- **Goal management**:
  - Create, edit, and delete goals
  - Optional emoji and note for each goal
  - Automatic progress calculation based on linked saved transactions
  - Manual goal completion option
  - Goal selection step when adding saved transactions

- **Integration with notifications**:
  - Goal completion creates notification in notification system
  - Notification includes congratulatory message from ExGo team
  - Notifications are persistent and appear in Notifications screen

- **Confetti animation**:
  - Global confetti animation provider (`ConfettiProvider`)
  - Animation triggers automatically when goal is completed
  - Works from any screen in the app

#### Technical Details
- New `Goal` type with fields: `id`, `name`, `targetAmount`, `currentAmount`, `currency`, `emoji`, `status`, `note`, `createdAt`, `updatedAt`, `completedAt`
- `GoalsProvider` manages goal state and automatic progress recalculation
- Progress recalculation uses transaction hash tracking for efficiency
- Functional state updates ensure accurate progress calculation
- Integration with `TransactionsProvider` for automatic updates
- New `goal_completed` notification type
- Storage key: `goals` in AsyncStorage
- Localization: All goal-related strings translated (en, uk)

#### Files Changed
- `src/types/index.ts` - Added `Goal`, `GoalStatus` types, updated `Transaction` with `goalId`
- `src/state/GoalsProvider.tsx` - Complete goals state management implementation
- `src/screens/GoalsScreen.tsx` - Goals display screen with active/completed sections
- `src/components/AddGoalModal.tsx` - Goal creation/editing modal
- `src/components/AddTransaction/GoalSelectionStep.tsx` - Goal selection step for saved transactions
- `src/components/AddTransaction/AddTransactionModal.tsx` - Integration with goal selection
- `src/components/AddTransaction/ConfirmStep.tsx` - Display goal in transaction confirmation
- `src/components/ConfettiAnimation.tsx` - Confetti animation component
- `src/state/ConfettiProvider.tsx` - Global confetti state management
- `src/state/AppProvider.tsx` - Integration of GoalsProvider with callbacks
- `src/state/NotificationProvider.tsx` - Added `createGoalCompletedNotification` method
- `src/services/storage.ts` - Added goals storage functions
- `src/i18n/locales/en.json` - Added goals translations
- `src/i18n/locales/uk.json` - Added Ukrainian goals translations
- `babel.config.js` - Added react-native-reanimated plugin
- `docs/GOALS_FEATURE_RU.md` - Complete feature documentation
- `docs/FEATURES_INDEX.md` - Updated with Goals feature entry

### [2025-01-XX] - Localization: PDF Reports

#### Added
- **Complete localization of PDF reports**: PDF reports are now fully localized based on the selected language in settings
  - All report strings (titles, labels, headers) are now translated
  - Category names are localized in the report
  - Date formatting (month names, day names, "Today", "Yesterday") uses the selected language
  - Transaction types (expense, income, saved, credit) are localized
  - Generated date and time use the correct locale format
  - Report language is automatically determined from user settings (`settings.language`)

#### Technical Details
- Updated `src/utils/pdfReport.ts` to use i18n translation resources instead of static strings
- Created helper functions for language-aware localization:
  - `getTranslation()` - Get translation for a specific language (not current i18n language)
  - `getLocalizedCategoryForLanguage()` - Get localized category name for a specific language
  - `formatMonthNameForLanguage()` - Format month name for a specific language
  - `formatDateWithDayForLanguage()` - Format date with day of week for a specific language
- Added new translation keys in `src/i18n/locales/en.json` and `src/i18n/locales/uk.json`:
  - `pdfReport.*` - All PDF report specific strings (title, labels, etc.)
- PDF reports now use the language from `settings.language` parameter, ensuring consistency even if i18n language changes
- Category names in reports are now properly localized using the same translation keys as the app UI

#### Files Changed
- `src/utils/pdfReport.ts` - Complete refactoring to use i18n translations with language parameter
- `src/i18n/locales/en.json` - Added `pdfReport` section with all PDF report strings
- `src/i18n/locales/uk.json` - Added Ukrainian translations for PDF report strings

### [2025-01-XX] - Localization: Spending Breakdown (Details Screen)

#### Added
- **Complete localization of Spending Breakdown screen**: All elements of the Details screen are now fully localized
  - Donut chart legend labels (Spent, Saved, Remaining, Over budget) are now translated
  - Section headers and empty states are localized
  - Category accessibility labels are localized
  - All user-facing strings use i18n translations

#### Technical Details
- Updated `src/components/DonutChartWithPercentages.tsx` to use `useTranslation` hook and translate legend labels
- Updated `src/screens/DetailsScreen.tsx` to use localized accessibility labels for categories
- Added new translation keys in `src/i18n/locales/en.json` and `src/i18n/locales/uk.json`:
  - `details.chart.spent`, `details.chart.saved`, `details.chart.remaining`, `details.chart.overBudget`
  - `details.categoryAccessibility` - for accessibility labels
- DetailsScreen was already using translations for most strings, now all strings are localized
- Navigation title for Details screen already uses `t('details.title')`

#### Files Changed
- `src/components/DonutChartWithPercentages.tsx` - Added useTranslation and localized legend labels
- `src/screens/DetailsScreen.tsx` - Localized accessibility labels
- `src/i18n/locales/en.json` - Added chart and category accessibility translations
- `src/i18n/locales/uk.json` - Added Ukrainian translations for chart and category accessibility

### [2025-01-XX] - Bug Fix: Language Switching - Date and Notification Updates

#### Fixed
- **Date labels not updating on language change**: Fixed issue where date labels in Recent Transactions list remained in previous language when switching back from Ukrainian to English
  - Root cause: `useMemo` in `TransactionsList` didn't have dependency on i18n language, so dates weren't re-formatted when language changed
  - Solution: Added `i18n.language` to `useMemo` dependencies in `TransactionsList` component
  - Date labels now update immediately when language changes

- **Notifications not updating on language change**: Fixed issue where notifications remained in previous language when switching languages
  - Root cause: `FlatList` in `NotificationsScreen` didn't re-render when language changed
  - Solution: Added `key={i18n.language}` to `FlatList` to force re-render when language changes
  - Notifications now update immediately when language changes

- **LastTransactionPreview not updating on language change**: Fixed issue where date in last transaction preview didn't update when language changed
  - Root cause: Component wasn't subscribed to language changes via `useTranslation` hook
  - Solution: Added `useTranslation` hook to `LastTransactionPreview` component
  - Date now updates immediately when language changes

#### Technical Details
- Updated `src/components/TransactionsList.tsx` to include `i18n.language` in `useMemo` dependencies
- Updated `src/screens/NotificationsScreen.tsx` to add `key={i18n.language}` to `FlatList` for forced re-render
- Updated `src/components/LastTransactionPreview.tsx` to use `useTranslation` hook
- All date formatting functions (`formatDate`, `formatDateWithDay`) already use i18n directly, so they always use current language
- Components now properly subscribe to language changes and re-render when language is switched

#### Files Changed
- `src/components/TransactionsList.tsx` - Added i18n.language dependency to useMemo
- `src/screens/NotificationsScreen.tsx` - Added key prop to FlatList for language change detection
- `src/components/LastTransactionPreview.tsx` - Added useTranslation hook

### [2025-01-XX] - Localization: Dynamic Notification Translation

#### Added
- **Dynamic notification translation**: Notifications in the Notifications screen are now translated dynamically based on current language
  - Created `getLocalizedNotificationTitle()` and `getLocalizedNotificationMessage()` utilities
  - Notifications are translated at display time, not at creation time
  - Existing notifications automatically update when user changes language
  - Works for all notification types: high spending, funds exhausted, overspending, large expense, low balance

#### Technical Details
- Created `src/utils/notificationLocalization.ts` with functions for dynamic notification translation
- Updated `src/screens/NotificationsScreen.tsx` to use dynamic translation functions
- Notifications are now translated based on their `type` field, not stored text
- Fallback to original title/message if translation not found

#### Files Changed
- `src/utils/notificationLocalization.ts` - New utility for dynamic notification translation
- `src/screens/NotificationsScreen.tsx` - Uses dynamic translation for notification titles and messages

### [2025-01-XX] - Localization: All Notifications and Alerts

#### Added
- **Complete notification and alert localization**: All user notifications, alerts, and dialog messages are now fully localized
  - All Alert.alert dialogs are now translated
  - All system notifications (high spending, funds exhausted, overspending, etc.) are localized
  - NotificationsScreen is fully localized
  - Error messages and success messages are localized
  - PIN-related alerts are localized
  - Transaction creation/update alerts are localized
  - Category creation alerts are localized
  - Settings alerts (save, reset, export) are localized

#### Technical Details
- Updated `src/state/NotificationProvider.tsx` to use i18n for all notification titles and messages
- Updated all Alert.alert calls in:
  - `src/screens/SettingsScreen.tsx` - All settings-related alerts
  - `src/components/AddTransaction/AddTransactionModal.tsx` - Transaction alerts
  - `src/components/AddTransaction/AddCategoryModal.tsx` - Category alerts
- Updated `src/screens/NotificationsScreen.tsx` to use localized strings
- Updated `src/navigation/RootNavigator.tsx` - Notifications screen title
- Updated `src/AppRoot.tsx` - Error boundary messages
- Added new translation keys in `src/i18n/locales/en.json` and `src/i18n/locales/uk.json`:
  - `notifications.*` - All notification types and messages
  - `alerts.*` - All alert dialog messages (success, error, confirmations, etc.)

#### Files Changed
- `src/state/NotificationProvider.tsx` - Uses i18n for notification creation
- `src/screens/SettingsScreen.tsx` - All Alert.alert calls use t()
- `src/components/AddTransaction/AddTransactionModal.tsx` - All Alert.alert calls use t()
- `src/components/AddTransaction/AddCategoryModal.tsx` - All Alert.alert calls use t()
- `src/screens/NotificationsScreen.tsx` - Uses t() for UI strings
- `src/navigation/RootNavigator.tsx` - Notifications title uses t()
- `src/AppRoot.tsx` - Error boundary uses t()
- `src/i18n/locales/en.json` - Added notification and alert translations
- `src/i18n/locales/uk.json` - Added Ukrainian notification and alert translations

### [2025-01-XX] - Localization: Date and Day of Week Labels

#### Added
- **Date and day of week localization**: All date labels in transaction lists are now fully localized
  - "Today" and "Yesterday" labels are now translated
  - Day of week names (Sunday, Monday, etc.) are now localized
  - Short month names (Jan, Feb, etc.) are now localized
  - Date headers in Recent Transactions section automatically use user's selected language

#### Technical Details
- Updated `src/utils/date.ts` to use i18n for all date formatting
- `formatDate()` now uses localized "Today", "Yesterday", and month names
- `formatDateWithDay()` now uses localized day of week names and month names
- Added new translation keys in `src/i18n/locales/en.json` and `src/i18n/locales/uk.json`:
  - `date.today`, `date.yesterday`
  - `date.daysOfWeek.*` - all 7 days of week
  - `date.monthsShort.*` - all 12 short month names

#### Files Changed
- `src/utils/date.ts` - Updated to use i18n for date formatting
- `src/i18n/locales/en.json` - Added date translations
- `src/i18n/locales/uk.json` - Added Ukrainian date translations

### [2025-01-XX] - Localization: Categories and Month Names

#### Added
- **Category localization**: All expense categories are now fully localized
  - Added translation keys for all 14 default expense categories (Groceries, Fuel, Rent, etc.)
  - Added translations for Income and Savings categories
  - Created `getLocalizedCategory()` utility function for easy category localization
  - Categories are now displayed in user's selected language throughout the app

- **Month names localization**: Month names in donut chart and other components now use i18n locale
  - Updated `formatMonthShort()` to use current i18n language (en-US or uk-UA)
  - Updated `formatMonthName()` to use current i18n language
  - Month names automatically change when user switches language

#### Technical Details
- Created `src/utils/categoryLocalization.ts` with `getLocalizedCategory()` function
- Updated `src/utils/month.ts` to import and use `getCurrentLanguage()` from i18n
- Updated all components displaying categories:
  - `CategorySelectionStep` - category selection in add transaction flow
  - `TransactionsList` - category display in transaction items
  - `ConfirmStep` - category display in transaction confirmation
  - `DetailsScreen` - category display in spending breakdown
- Added new translation keys in `src/i18n/locales/en.json` and `src/i18n/locales/uk.json`:
  - `categories.*` - all category translations
  - `details.expenseCategories`, `details.viewCategoryHint`, `details.noExpensesAccessibility`
  - `addTransaction.addCustomCategory`

#### Files Changed
- `src/utils/categoryLocalization.ts` - New utility for category localization
- `src/utils/month.ts` - Updated to use i18n locale for date formatting
- `src/components/AddTransaction/CategorySelectionStep.tsx` - Uses localized categories
- `src/components/AddTransaction/ConfirmStep.tsx` - Uses localized categories
- `src/components/TransactionsList.tsx` - Uses localized categories
- `src/screens/DetailsScreen.tsx` - Uses localized categories and month names
- `src/i18n/locales/en.json` - Added category translations
- `src/i18n/locales/uk.json` - Added Ukrainian category translations

### [2025-01-XX] - Localization: Complete HomeScreen Localization

#### Added
- **Complete HomeScreen localization**: Fully localized all text elements on HomeScreen and related components
  - Added missing translation keys for HomeScreen: summary, error messages, reset onboarding dialogs
  - Added missing translation keys for TransactionsList: delete confirmations, accessibility labels, uncategorized label
  - All user-facing strings now use i18n translations
  - Support for both English and Ukrainian languages

#### Technical Details
- Updated `src/screens/HomeScreen.tsx` to use `t()` for all text strings
- Updated `src/components/TransactionsList.tsx` to use `t()` for all text strings
- Added new translation keys in `src/i18n/locales/en.json` and `src/i18n/locales/uk.json`:
  - `home.summary`, `home.deleteError`, `home.resetOnboardingTitle`, etc.
  - `transactions.deleteTitle`, `transactions.deleteConfirm`, `transactions.uncategorized`, etc.
- All Alert dialogs, accessibility labels, and UI text are now localized

#### Files Changed
- `src/i18n/locales/en.json` - Added missing translation keys
- `src/i18n/locales/uk.json` - Added Ukrainian translations
- `src/screens/HomeScreen.tsx` - Replaced hardcoded strings with `t()` calls
- `src/components/TransactionsList.tsx` - Replaced hardcoded strings with `t()` calls

### [2025-01-XX] - Bug Fix: Language Switching Issue

#### Fixed
- **Language switching bug**: Fixed issue where switching from Ukrainian back to English language would not apply the change
  - Root cause: `SettingsProvider.persist` was comparing new language with stale `settings.language` from closure
  - Solution: Changed comparison to use current i18n language via `getCurrentLanguage()` instead of `settings.language`
  - Language changes now work correctly in both directions (en ↔ uk)

#### Technical Details
- Modified `src/state/SettingsProvider.tsx` to import and use `getCurrentLanguage()` from i18n
- Updated language change detection logic to compare with actual i18n state instead of React state
- Added debug logging for language changes

### [2025-01-XX] - Internationalization (i18n): Ukrainian Language Support

#### Added
- **Internationalization (i18n)**: Added support for Ukrainian language
  - Integrated i18next and react-i18next for localization
  - Created translation files for English (en) and Ukrainian (uk) in `src/i18n/locales/`
  - Added language selector in Settings > Personalization tab
  - Language preference is persisted in user settings (`UserSettings.language`)
  - Language changes apply immediately without app restart
  - Translated main screens: Onboarding, Home, Settings, Navigation, Lock Screen
  - Translated common UI elements: buttons, labels, error messages, empty states

#### Technical Details
- Language is stored in `UserSettings.language` field (`'en' | 'uk'`)
- i18n is initialized in `App.tsx` before any other code
- `SettingsProvider` automatically applies language changes when settings are loaded/updated
- All translations use i18next's `useTranslation` hook
- Translation keys follow hierarchical structure (e.g., `home.title`, `settings.language`)

#### Files Changed
- `src/i18n/` - New i18n configuration and translation files
- `src/types/index.ts` - Added `SupportedLanguage` type and `language` field to `UserSettings`
- `src/state/SettingsProvider.tsx` - Added language initialization and change handling
- `src/screens/SettingsScreen.tsx` - Added language selector in Personalization tab
- `src/screens/OnboardingScreen.tsx` - Translated all user-facing strings
- `src/screens/HomeScreen.tsx` - Translated labels and messages
- `src/navigation/RootNavigator.tsx` - Translated screen titles
- `src/services/storage.ts` - Added validation for `language` field

### [2025-01-XX] - Analytics: Event Tracking for User Actions

#### Added
- **Analytics Service**: Created `src/services/analytics.ts` for centralized event tracking
  - Uses Sentry for event tracking (can be extended to support other analytics providers)
  - Provides helper functions for common events
  - Tracks events as Sentry breadcrumbs and custom context

- **Event Tracking**:
  - `onboarding_completed` - Tracked when user completes onboarding (currency, monthly income)
  - `transaction_created` - Tracked when a new transaction is created (type, amount, category, month)
  - `transaction_deleted` - Tracked when a transaction is deleted (type, amount, category, month)
  - `transaction_updated` - Tracked when a transaction is updated (type, amount, category, month)
  - `budget_exceeded` - Tracked when budget is exceeded (monthly income, expenses, saved, remaining, exceeded by)

- **Integration Points**:
  - `OnboardingScreen`: Tracks onboarding completion
  - `AddTransactionModal`: Tracks transaction creation and updates
  - `TransactionsProvider`: Tracks transaction deletion
  - `HomeScreen`: Tracks budget exceeded events (when remaining transitions from non-negative to negative)

#### Technical Details
- Events are logged to Sentry as breadcrumbs and custom context
- All events include relevant metadata (amounts, categories, months, etc.)
- Analytics failures are silently handled to not break app functionality
- Development mode includes console logging for debugging

### [2025-01-XX] - Security & Privacy: Biometric Authentication, PIN Protection & Privacy Policy

#### Added
- **Biometric Authentication**: Added Face ID, Touch ID, and Fingerprint support
  - Installed `expo-local-authentication` for biometric authentication
  - Created `src/services/authentication.ts` service module with:
    - `checkBiometricAvailability()` - Check if biometric is available
    - `authenticateBiometric()` - Authenticate using biometric
    - `verifyPIN()`, `validatePIN()`, `hashPIN()` - PIN management
    - `isAuthenticationRequired()` - Check if auth is needed
    - `authenticate()` - Unified authentication function
  - Automatic biometric prompt on app launch (if enabled)
  - Fallback to PIN if biometric fails

- **PIN Code Authentication**: Added PIN code protection
  - 4-6 digit PIN support
  - PIN setup and change functionality
  - PIN validation and verification
  - Secure PIN storage (hashed)

- **Lock Screen**: Created `src/screens/LockScreen.tsx`
  - Beautiful lock screen UI with biometric and PIN options
  - Automatic biometric prompt
  - PIN input with validation
  - Error handling and retry functionality
  - Full accessibility support

- **App Locking**: Integrated app locking functionality
  - App locks automatically when going to background (if auth enabled)
  - App locks on launch if authentication is required
  - Uses AppState to detect background/foreground transitions
  - Seamless unlock experience

- **Security Settings**: Added Security tab in Settings
  - Toggle for biometric authentication
  - Toggle for PIN authentication
  - PIN setup/change/remove functionality
  - Biometric availability detection
  - Clear UI with toggles and descriptions

- **Privacy Documentation**:
  - Created `docs/PRIVACY_POLICY.md` - Full privacy policy
  - Created `docs/APP_PRIVACY_DESCRIPTION.md` - App Store Connect privacy description
  - Created `docs/PRIVACY_INFO.md` - User-facing privacy information
  - Detailed data collection and usage descriptions
  - Compliance with GDPR, CCPA, App Store guidelines

#### Changed
- **UserSettings Type**: Added security settings fields
  - `enableBiometric?: boolean` - Enable biometric authentication
  - `enablePIN?: boolean` - Enable PIN authentication
  - `pin?: string` - Stored PIN (hashed)

- **SettingsProvider**: Updated default settings to include security fields

- **SettingsScreen**: Added Security tab
  - New tab for security settings
  - Biometric toggle with availability check
  - PIN toggle with setup flow
  - PIN management (setup, change, remove)

- **AppRoot**: Integrated lock screen
  - Shows lock screen when app is locked
  - Monitors AppState for background/foreground transitions
  - Automatic locking when returning from background

- **app.json**: Added expo-local-authentication plugin
  - Face ID permission description
  - iOS configuration for biometric authentication

#### Security
- All authentication handled locally on device
- PIN stored as hash (should be improved with proper hashing in production)
- Biometric authentication uses device's secure enclave
- No authentication data transmitted or stored remotely
- App locks automatically when backgrounded (if enabled)

#### Privacy
- Complete privacy policy documentation
- App Store Connect privacy description
- Clear data collection disclosure (only error tracking)
- No financial data collection or transmission
- Full user control over data

### [2025-01-XX] - UX Improvements: Empty States, Error Handling & Accessibility

#### Added
- **Empty State Components**: Created reusable `EmptyState`, `LoadingState`, and `ErrorState` components
  - `EmptyState`: Displays empty states with icon, title, message, and optional action button
  - `LoadingState`: Shows loading spinner with optional message
  - `ErrorState`: Displays error messages with retry functionality
  - All components include full accessibility support

- **Accessibility Improvements**:
  - Added `accessibility.ts` utility with constants and helpers
  - Minimum hit target size (44x44 points) for all interactive elements
  - `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` for all buttons and interactive elements
  - `hitSlop` for all touchable elements to ensure minimum touch target size
  - Accessibility labels for transactions, charts, and all UI elements
  - VoiceOver support throughout the app

- **Empty States**:
  - HomeScreen: Empty state with CTA when no transactions exist
  - DetailsScreen: Improved empty state for expense categories
  - All empty states include helpful messages and action buttons

- **Error Handling UI**:
  - SettingsScreen: Error states for save and export operations with retry functionality
  - Visual error feedback with retry buttons
  - Error messages displayed inline with context

#### Changed
- **HomeScreen**:
  - Added empty state component when no transactions
  - Improved accessibility for FAB and chart
  - Better empty state messaging with CTA

- **DetailsScreen**:
  - Replaced simple text empty state with `EmptyState` component
  - Added accessibility labels for category items
  - Improved touch targets for category cards

- **SettingsScreen**:
  - Added error handling UI for save and export operations
  - All buttons now have proper accessibility labels and hit slop
  - Theme selector buttons have accessibility states
  - Input fields have accessibility hints

- **TransactionsList**:
  - Added accessibility labels for all transaction items
  - Improved accessibility for delete and load more buttons
  - Better empty state handling

- **FloatingActionButton**:
  - Added accessibility label and hint
  - Added hit slop for better touch targets

- **DonutChart**:
  - Added accessibility labels describing chart data
  - Accessibility role and hints for interactive charts

#### Technical
- Created `src/utils/accessibility.ts` with accessibility constants and helpers
- Created `src/components/states/` directory for state components
- All interactive elements meet WCAG 2.1 AA standards for touch targets
- Consistent accessibility patterns across all components

### [2025-01-XX] - Crash & Error Reporting with Sentry

#### Added
- **Sentry Integration**: Added comprehensive error tracking and crash reporting
  - Installed `@sentry/react-native` for React Native error tracking
  - Created `src/services/sentry.ts` service module with:
    - `initSentry()` - Initialize Sentry SDK with configuration
    - `logError()` - Log errors with context
    - `logWarning()` - Log warnings
    - `logInfo()` - Log info messages
    - `addBreadcrumb()` - Add debugging breadcrumbs
    - `setUser()`, `setContext()`, `setTag()` - Context management
    - `withErrorTracking()` - Wrap functions with error tracking
    - `SentryErrorBoundary` - React Error Boundary wrapper
  - Integrated Sentry in `App.tsx` (early initialization)
  - Added Error Boundary in `AppRoot.tsx` for React component errors
  - Added error logging in `SettingsProvider`:
    - Hydration errors
    - Save errors with context
    - Breadcrumbs for successful operations
  - Added error logging in `TransactionsProvider`:
    - Hydration errors
    - Persist/save errors with transaction counts
    - Sync errors when switching months
    - Current month save errors
    - Breadcrumbs for successful operations
  - Navigation breadcrumbs for debugging
  - Performance monitoring enabled (100% in dev, 10% in prod)
  - Native crash handling enabled
  - Screenshot attachments on errors

#### Configuration
- Added `sentryDsn` field to `app.json` extra configuration
- Sentry DSN can be set via:
  - `EXPO_PUBLIC_SENTRY_DSN` environment variable
  - `app.json` extra.sentryDsn
- Automatic environment detection (development/production)
- Release tracking with app version and build number
- Error filtering to exclude development errors in production

#### Changed
- Error handling now includes Sentry reporting in addition to console logging
- All critical errors are automatically tracked with context

#### Notes
- Sentry initialization is skipped if DSN is not configured (development/local builds)
- Sensitive data (emails, etc.) is automatically filtered from error reports
- Error tracking respects privacy and doesn't log user financial data

### [2025-01-XX] - Transaction Editing Feature

#### Added
- **Transaction Editing**: Added ability to edit existing transactions (amount, type, category)
  - Added `updateTransaction` function to `TransactionsProvider` for updating existing transactions
  - Modified `AddTransactionModal` to support both add and edit modes
  - Added tap-to-edit functionality in `TransactionsList` on Home screen
  - All data (donut charts, totals, lists) automatically update when transactions are edited
  - Edit mode preserves original transaction creation date
  - Modal header and button text change based on mode ("Add Transaction" vs "Edit Transaction", "Confirm & Save" vs "Save Changes")

#### Changed
- `AddTransactionModal` now accepts optional `transactionToEdit` prop to enable edit mode
- `TransactionsList` items are now tappable to open edit modal via `onTransactionPress` callback
- Transaction updates use optimistic updates for instant UI feedback

### [2025-01-XX] - Phase 5: Add Transaction Flow

#### Added
- **AddTransactionModal Component**
  - Full modal flow with 4 steps: Type → Amount → Category → Confirm
  - Step navigation with Back/Next buttons
  - Progress indicator showing current step
  - Validation on each step
  - Automatic category selection for income ("Income") and saved ("Savings")

- **AmountInputStep Component**
  - Currency-formatted input with symbol prefix
  - Real-time validation for positive numbers
  - Decimal support (up to 2 places)
  - Formatted amount preview

- **CategorySelectionStep Component**
  - Category selection for expense transactions (13 categories)
  - Visual indication of selected category
  - Automatic category for income and saved types
  - Scrollable list for long category lists

- **ConfirmStep Component**
  - Review all transaction details before saving
  - Color-coded transaction type
  - Formatted display of amount, category, and date

- **Integration**
  - Integrated AddTransactionModal into HomeScreen
  - Replaced placeholder TransactionTypeModal
  - Success notifications using Alert

- **Data Updates**
  - Automatic data updates in all components via optimistic updates
  - DetailsScreen now uses memoized selectors for automatic updates
  - All totals, charts, and lists update immediately after adding transaction

- **Documentation**
  - `docs/PHASE5_ADD_TRANSACTION.md` - Complete Phase 5 documentation

#### Changed
- **DetailsScreen**: Now uses memoized selectors (`useMonthlyTotals`, `useCategoryBreakdown`) for automatic updates
- **HomeScreen**: Replaced TransactionTypeModal with AddTransactionModal

#### Technical Details
- Optimistic updates ensure instant UI feedback
- Memoized selectors automatically recalculate when transactions change
- React Context propagates updates to all consuming components
- Full validation on each step before allowing progression
- Error handling with user-friendly messages

#### Files Added
- `src/components/AddTransaction/AddTransactionModal.tsx` - Main modal component
- `src/components/AddTransaction/AmountInputStep.tsx` - Amount input step
- `src/components/AddTransaction/CategorySelectionStep.tsx` - Category selection step
- `src/components/AddTransaction/ConfirmStep.tsx` - Confirmation step
- `src/components/AddTransaction/index.ts` - Component exports
- `docs/PHASE5_ADD_TRANSACTION.md` - Phase 5 documentation

#### Files Modified
- `src/screens/HomeScreen.tsx` - Integrated AddTransactionModal
- `src/screens/DetailsScreen.tsx` - Updated to use memoized selectors

#### Next Steps
- Phase 6: Details (Spending Breakdown) screen enhancements
- Phase 8: Theming & Polish (animations, better toast notifications)

### [2025-01-XX] - Phase 4: Home Experience

#### Added
- **Enhanced DonutChart Component**
  - Theme integration with semantic colors
  - Tap handler for navigation to Details screen
  - Clamping remaining at 0 for visuals while showing negative text
  - Configurable size and stroke width
  - Optional labels support

- **Enhanced FloatingActionButton**
  - Full theme integration
  - Configurable size
  - Proper shadow styling from theme
  - Better positioning support

- **New Components**
  - `SummaryCard` - Reusable card for displaying statistics with variants (positive/negative/neutral)
  - `LastTransactionPreview` - Component to display last transaction with formatting
  - `TransactionTypeModal` - Modal for selecting transaction type (placeholder for Phase 5)

- **Redesigned HomeScreen**
  - Header section with monthly balance and income
  - Interactive donut chart with tap-to-details
  - Summary stats section with three cards (Remaining, Spent, Saved)
  - Last transaction preview section
  - Floating action button for adding transactions
  - Over budget warning when remaining is negative
  - Full theme integration
  - Uses memoized selectors for performance

- **Date Formatting**
  - `formatDate` utility function with "Today", "Yesterday", or "Jan 15" format

- **Documentation**
  - `docs/PHASE4_HOME_EXPERIENCE.md` - Complete Phase 4 documentation

#### Changed
- **DonutChart**: Now uses theme colors and supports tap interaction
- **FloatingActionButton**: Now uses theme colors and shadows
- **HomeScreen**: Complete redesign with modern layout and components

#### Technical Details
- All components use theme tokens for consistency
- Memoized selectors for optimal performance
- Proper handling of negative remaining balance
- ScrollView for long content
- Modal bottom sheet for transaction type selection

#### Files Modified
- `src/components/DonutChart.tsx` - Enhanced with theme and tap handler
- `src/components/FloatingActionButton.tsx` - Enhanced with theme
- `src/screens/HomeScreen.tsx` - Complete redesign
- `src/utils/date.ts` - Added formatDate function

#### Files Added
- `src/components/SummaryCard.tsx` - Summary card component
- `src/components/LastTransactionPreview.tsx` - Last transaction preview
- `src/components/TransactionTypeModal.tsx` - Transaction type modal
- `src/components/index.ts` - Component exports
- `docs/PHASE4_HOME_EXPERIENCE.md` - Phase 4 documentation

#### Next Steps
- Phase 5: Add Transaction Flow (full implementation)
- Phase 6: Details (Spending Breakdown) screen
- Phase 8: Theming & Polish (animations)

### [2025-01-XX] - Phase 2: State & Persistence

#### Added
- **Enhanced Storage Service**
  - Retry mechanism with exponential backoff (3 attempts, 500ms delay)
  - Data validation for settings and transactions
  - Safe JSON parsing with error handling
  - Comprehensive error logging

- **Improved State Providers**
  - `SettingsProvider` with error states, loading states, and retry logic
  - `TransactionsProvider` with error states, loading states, and retry logic
  - Error objects with retry functions
  - Fallback to defaults on hydration errors
  - In-memory state consistency even on save failures

- **Memoized Selectors**
  - `useMonthlyTotals` - Memoized monthly totals calculation
  - `useCategoryBreakdown` - Memoized category breakdown
  - `useCurrentMonthTransactions` - Filtered current month transactions
  - `useTransactionsByType` - Filtered transactions by type
  - `useLastTransaction` - Last transaction by date

- **Enhanced AppRoot**
  - Improved hydration gate with error handling
  - Error screen with retry button
  - Separate error handling for settings and transactions
  - Better loading states

- **Testing**
  - Comprehensive test suite for storage service
  - Tests for SettingsProvider (hydration, errors, retry)
  - Tests for TransactionsProvider (hydration, errors, retry)
  - Tests for memoized selectors
  - ~85% code coverage for Phase 2 components
  - Jest setup with AsyncStorage mocking
  - All 35 tests passing

- **Documentation**
  - `docs/PHASE2_STATE_PERSISTENCE.md` - Complete Phase 2 documentation
  - `docs/PHASE2_TESTING.md` - Testing documentation and examples

#### Changed
- **Storage Service**
  - All operations now use retry mechanism
  - Added validation before save operations
  - Better error messages and logging

- **State Providers**
  - Added `loading` state to track async operations
  - Added `error` state with retry capability
  - Added `retryHydration` method
  - Improved error handling and recovery

- **SettingsScreen**
  - Improved reset logic with error handling
  - Better user feedback on errors

#### Technical Details
- Retry mechanism: 3 attempts with exponential backoff (500ms, 1000ms, 1500ms)
- Data validation ensures type safety
- Memoized selectors optimize performance
- Error states allow graceful degradation
- All changes are backward compatible

#### Files Modified
- `src/services/storage.ts` - Enhanced with retry and validation
- `src/state/SettingsProvider.tsx` - Added error/loading states
- `src/state/TransactionsProvider.tsx` - Added error/loading states
- `src/state/selectors.ts` - New memoized selectors
- `src/AppRoot.tsx` - Enhanced hydration gate
- `src/screens/SettingsScreen.tsx` - Improved reset logic

#### Files Added
- `src/state/selectors.ts` - Memoized selectors
- `src/services/__tests__/storage.test.ts` - Storage tests (13 tests)
- `src/state/__tests__/SettingsProvider.test.tsx` - SettingsProvider tests (7 tests)
- `src/state/__tests__/TransactionsProvider.test.tsx` - TransactionsProvider tests (8 tests)
- `src/state/__tests__/selectors.test.ts` - Selectors tests (7 tests)
- `docs/PHASE2_STATE_PERSISTENCE.md` - Phase 2 documentation
- `docs/PHASE2_TESTING.md` - Testing documentation
- `jest.setup.js` - Jest setup with AsyncStorage mocking

#### Next Steps
- Phase 3: Polish onboarding screen (already completed)
- Phase 4: Home screen implementation
- Phase 5: Add transaction flow

### [2025-01-XX] - Onboarding Screen Redesign

#### Changed
- **OnboardingScreen** - Complete redesign with centered layout
  - Two centered input fields: currency selector and monthly income
  - Currency field displays selected currency (USD, GBP, EUR) with dropdown modal
  - Income field shows currency symbol prefix ($, £, €) based on selection
  - Improved validation with error messages
  - Loading state during save operation
  - Modern card-based design using Phase 1 layout components
  - Full theme integration with light/dark mode support
  - Better keyboard handling and UX

#### Technical Details
- Uses `ScreenContainer`, `Card` components from Phase 1
- Fully themed with `useThemeStyles` hook
- Improved error handling and validation
- Better accessibility with proper labels and feedback

### [2025-01-XX] - Phase 1: Routing & Shell

#### Added
- **Theme System**
  - `ThemeProvider` with support for light/dark themes and system preference
  - Design tokens: `spacing`, `typography`, `radii`, `shadows`
  - Extended color palette with semantic colors for light and dark modes
  - Theme hooks: `useTheme()`, `useThemeStyles()`

- **Layout Components**
  - `ScreenContainer` - Base container with safe area handling and optional scrolling
  - `SectionHeader` - Reusable section header with title, subtitle, and action support
  - `Card` - Flexible card component with variants (default, elevated, outlined)

- **Navigation**
  - Enhanced `RootNavigator` with themed header options
  - Settings header button in Details screen
  - Onboarding guard with gesture prevention
  - Modal presentation for Settings screen (iOS)

#### Changed
- Updated `AppRoot` to integrate `ThemeProvider` at the root level
- Improved loading state with themed ActivityIndicator
- Navigation headers now use theme colors and typography

#### Technical Details
- All components use TypeScript with strict typing
- Theme system supports system color scheme detection
- Layout components are fully typed and documented
- No breaking changes to existing screens (backward compatible)

#### Files Modified
- `src/AppRoot.tsx` - Added ThemeProvider integration
- `src/navigation/RootNavigator.tsx` - Enhanced with header options and theming
- `src/theme/colors.ts` - Extended with dark mode support
- `src/theme/tokens.ts` - New file with design tokens
- `src/theme/ThemeProvider.tsx` - New theme provider component
- `src/components/layout/` - New directory with layout components

#### Next Steps
- Phase 2: Harden state management and persistence
- Phase 3: Polish onboarding screen
- Phase 4: Home screen implementation

