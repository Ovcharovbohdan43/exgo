# ExGo

Minimal Expo/React Native budgeting app. See `ARCHITECTURE.md` for the blueprint and `DEVELOPMENT_PLAN.md` for the delivery steps.

## Getting Started
- Install deps: `npm install`
- Run in Expo Go: `npm start` then scan the QR from the Metro console.
- Tests: `npm test` (Jest + jest-expo)

## Project Structure (MVP)
- `App.tsx` and `index.js` entrypoints (Expo)
- `src/` modules: navigation, screens, components, state, services, utils, theme, types, constants
- Docs: `ARCHITECTURE.md`, `DEVELOPMENT_PLAN.md`, `CHANGELOG.md`

## Development Status

### ✅ Phase 1 - Routing & Shell (Completed)
- ✅ Theme Provider with design tokens (colors, spacing, typography, radii, shadows)
- ✅ RootNavigator with header options and onboarding guard
- ✅ Reusable layout components (ScreenContainer, SectionHeader, Card)

### ✅ Phase 2 - State & Persistence (Completed)
- ✅ Enhanced storage service with retry mechanism and validation
- ✅ Improved SettingsProvider and TransactionsProvider with error/loading states
- ✅ Memoized selectors for performance optimization
- ✅ Enhanced hydration gate with error handling and retry
- ✅ Comprehensive test suite (~85% coverage)
- ✅ Complete documentation

### ✅ Phase 3 - Onboarding (Completed)
- ✅ Polished onboarding screen with centered layout
- ✅ Currency selector (USD, GBP, EUR)
- ✅ Monthly income input with validation
- ✅ Full theme integration

### ✅ Phase 4 - Home Experience (Completed)
- ✅ Redesigned HomeScreen with modern layout
- ✅ Interactive donut chart with tap-to-details
- ✅ Summary stats cards (Remaining, Spent, Saved)
- ✅ Last transaction preview
- ✅ Floating action button
- ✅ Transaction type modal (placeholder for Phase 5)
- ✅ Over budget warning
- ✅ Complete documentation

### ✅ Phase 5 - Add Transaction Flow (Completed)
- ✅ Full modal flow with 4 steps (Type → Amount → Category → Confirm)
- ✅ Amount input with currency formatting
- ✅ Category selection for expense transactions
- ✅ Automatic category for income and saved
- ✅ Validation on each step
- ✅ Success notifications
- ✅ Automatic data updates in all components
- ✅ Complete documentation

### 🚧 Next: Phase 6 - Details (Spending Breakdown)

## Notes
- Expo Go compatible (managed workflow, no native modules beyond Expo-compatible libs).
- Keep docs updated as features ship.
