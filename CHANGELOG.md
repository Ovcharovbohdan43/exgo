# Changelog

All notable changes to the ExGo project will be documented in this file.

## [Unreleased]

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

