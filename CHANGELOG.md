# Changelog

All notable changes to the ExGo project will be documented in this file.

## [Unreleased]

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

