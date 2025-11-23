# ExGo

Minimal Expo/React Native budgeting app. See `ARCHITECTURE.md` for the blueprint and `DEVELOPMENT_PLAN.md` for the delivery steps.

## Getting Started
- Install deps: `npm install`
- Run in Expo Go: `npm start` then scan the QR from the Metro console.
- Tests: `npm test` (Jest + jest-expo)

## Error Tracking (Sentry)
- Error tracking and crash reporting is integrated via Sentry
- To enable Sentry, set `EXPO_PUBLIC_SENTRY_DSN` environment variable or configure `app.json` extra.sentryDsn
- Get your DSN from https://sentry.io/settings/[your-org]/projects/[your-project]/keys/
- If DSN is not configured, error tracking is disabled (useful for local development)

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

### ✅ Error Tracking & Monitoring (Completed)
- ✅ Sentry integration for crash reporting and error tracking
- ✅ Automatic error logging in state providers (Settings, Transactions)
- ✅ React Error Boundary for component errors
- ✅ Performance monitoring (100% in dev, 10% in prod)
- ✅ Breadcrumbs for debugging
- ✅ Native crash handling

### ✅ UX Improvements & Accessibility (Completed)
- ✅ Empty state components (EmptyState, LoadingState, ErrorState)
- ✅ Empty states on all screens (Home, Details, Settings)
- ✅ Error handling UI with retry functionality
- ✅ Full accessibility support (VoiceOver, accessibilityLabel, accessibilityRole, accessibilityHint)
- ✅ Minimum hit targets (44x44 points) for all interactive elements
- ✅ Accessibility utilities and helpers
- ✅ WCAG 2.1 AA compliance for touch targets

### ✅ Security & Privacy (Completed)
- ✅ Biometric authentication (Face ID, Touch ID, Fingerprint)
- ✅ PIN code authentication (4-6 digits)
- ✅ App locking on background/foreground transitions
- ✅ Lock screen with biometric and PIN support
- ✅ Security settings in Settings screen
- ✅ Privacy Policy documentation
- ✅ App Store Connect privacy description
- ✅ Local-only data storage (no cloud sync)
- ✅ No financial data collection or transmission

### ✅ Analytics (Completed)
- ✅ Analytics service for event tracking
- ✅ Onboarding completion tracking
- ✅ Transaction creation/update/deletion tracking
- ✅ Budget exceeded event tracking
- ✅ Events sent to Sentry as breadcrumbs and custom context
- ✅ Development mode console logging

## Notes
- Expo Go compatible (managed workflow, no native modules beyond Expo-compatible libs).
- Keep docs updated as features ship.
- Biometrics (Face ID/Touch ID): requires a custom dev/production build so `NSFaceIDUsageDescription` from `app.json` is included. On iOS, build with `eas build --profile development --platform ios` (or production) or `eas run:ios` on a dev client; Face ID will fail with `missing_usage_description` inside Expo Go.
- Temporary switch: biometric lock is currently bypassed via `TEMP_DISABLE_BIOMETRIC_LOCK` in `src/AppRoot.tsx`. Set it to `false` before TestFlight/production to re-enable Face ID/Touch ID.
