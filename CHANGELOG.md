# Changelog

All notable changes to the ExGo project will be documented in this file.

## [Unreleased]

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

