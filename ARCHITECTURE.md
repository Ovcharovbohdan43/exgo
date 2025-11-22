# ExGo – Architecture Plan

This document defines the architectural blueprint for the ExGo iOS MVP built with React Native (Expo, TypeScript). It is a living plan to keep implementation cohesive, reliable, and well-documented.

## Goals
- Ultra-fast, low-friction budgeting: log expense/income/saved in a few taps.
- Local-first, resilient: works offline; data persists via AsyncStorage.
- Minimal surface area: small, readable codebase with clear module boundaries.
- Safe calculations: defensive handling of edge cases (negative balances, missing data).
- Ship-ready: predictable navigation, theming, and error behavior.

## Tech Stack
- **Platform:** React Native (Expo managed workflow), iOS-first (Expo Go compatible).
- **Language:** TypeScript.
- **Navigation:** `@react-navigation/native`, `@react-navigation/native-stack`.
- **Storage:** `@react-native-async-storage/async-storage` (keys: `settings`, `transactions`).
- **State:** React hooks + a lightweight store (Context + reducer or Zustand) wrapping settings/transactions.
- **Charts:** `react-native-svg` with a custom donut component (no native deps).
- **UI Primitives:** React Native core components; optional `expo-linear-gradient` for accents.
- **Testing (scope-aware):** Jest + React Native Testing Library for logic/components; lightweight domain tests for calculators.

## App Structure (conceptual)
- `app/` (or `src/`) root for all code.
  - `navigation/` – stack navigator config, typed routes, deep-link config placeholder.
  - `screens/` – feature screens:
    - `OnboardingScreen` – capture `currency`, `monthlyIncome`; sets `isOnboarded`.
    - `HomeScreen` – greeting, remaining balance, donut chart, summary cards, floating plus button.
    - `DetailsScreen` (Spending Breakdown) – expanded donut, percentages, per-category totals.
    - `SettingsScreen` – edit income/currency, reset data, theme toggle placeholder.
    - (Optional) `CategoryTransactionsScreen` – list transactions by category.
  - `components/` – reusable UI:
    - `DonutChart` (svg-based, animated values, clamps negative remaining to 0 for visuals).
    - `FloatingActionButton` (plus).
    - `SummaryCard`, `StatRow`, `SectionHeader`.
    - `TransactionForm` subcomponents (type selector, amount input, category grid, confirm).
  - `modules/` or `state/` – app store and domain logic:
    - `settingsStore` – load/save settings, onboarding flag.
    - `transactionsStore` – load, add, list filtered transactions.
    - `selectors`/`calc` – totals, remaining, category breakdown, percent helpers.
  - `services/` – impure boundaries:
    - `storage` – AsyncStorage wrapper with schema guards and versioning stub.
    - `persistence` – uses storage to read/write typed models.
  - `constants/` – `categories.ts` (13 defaults), color tokens, spacing, typography scales.
  - `theme/` – light/dark palettes, semantic tokens (bg, card, text, accent).
  - `utils/` – date helpers (month filtering), formatting (currency).
  - `types/` – shared TypeScript types/interfaces and enums.
  - `hooks/` – `useMonthlyTotals`, `useCategoryBreakdown`, `useHydration` for stores.
  - `mocks/` (tests) – sample transactions/settings.

## Data Model
- `TransactionType = 'expense' | 'income' | 'saved'`
- `Transaction { id: string; type: TransactionType; amount: number; category?: string; createdAt: string }`
- `UserSettings { currency: string; monthlyIncome: number; isOnboarded: boolean }`
- Storage keys:
  - `settings` → `UserSettings`
  - `transactions` → `Transaction[]`

## Domain Logic
- Monthly scope: filter transactions where `createdAt` month/year == current month.
- Totals:
  - `expenses = sum(amount where type==='expense')`
  - `saved = sum(amount where type==='saved')`
  - `income = settings.monthlyIncome`
  - `remaining = income - (expenses + saved)` (can be negative; chart clamps at 0)
- Chart slices: `[expenses, saved, max(remaining, 0)]`
- Category breakdown: group expense transactions by category, compute sums and percentages of total expenses.

## Navigation
- Stack navigator: `Onboarding` → `Main` (Home) → `Details` → `Settings` (modal or push).
- Onboarding gate: if `!isOnboarded`, redirect to `Onboarding`.
- Home modals: plus-button opens action sheet/bottom sheet; inline stepper modal for add flow.
- Back behavior: hardware back closes modal first, then navigates.

## UI & Interaction
- Home:
  - Header: “Monthly balance”, large remaining figure, “Of $X monthly income”.
  - Donut chart: tap → Details screen.
  - Summary band: Remaining, Spent, Saved mini-cards; last transaction row.
  - Floating plus button (center-bottom) triggers add flow sheet with 3 options.
- Add flow (modal/steps):
  1) Select type (Expense/Income/Saved)
  2) Enter amount (numeric, currency suffix/prefix)
  3) Pick category (expense: 13 defaults; saved: “Savings” default; income: fixed “Income”)
  4) Confirm (shows type/amount/category/date)
  - On save: persist, recalc, toast “Expense added” etc.
- Details (Spending Breakdown):
  - Period label: “This month”
  - Large donut with percentages
  - List of categories with amount + percentage; tap → (optional) category transactions.
- Settings:
  - Monthly income numeric field
  - Currency dropdown
  - Reset all data (confirm)
  - Theme toggle placeholder (light/dark/system)

## Theming & Styling
- Token-based: `colors` (bg, card, textPrimary, textSecondary, accent, positive, warning), `spacing`, `radii`, `shadow`.
- Light/dark palettes; chart uses accent for spent, secondary accent for saved, muted for remaining.
- Typography: system/Inter/SF Pro with scale for headings/numbers/body/captions.
- Motion: subtle opacity/scale for modal open; chart value tween on updates.

## Persistence & Hydration
- On app start:
  - Load settings and transactions from AsyncStorage.
  - If missing, init defaults (`isOnboarded=false`, `monthlyIncome=0`, `currency` from locale fallback USD).
- Saving:
  - On add transaction: append to array, write to storage, update in-memory store.
  - On settings change: merge and persist.
- Reset: clear both keys, reinit defaults, route to Onboarding.
- Defensive: parse/validate JSON; if corrupt, fall back to defaults and surface a non-blocking warning.

## Error Handling & Validation
- Inputs: numeric parsing with min > 0 for amounts, income >= 0; required category for expense/saved.
- Storage failures: show toast/snackbar with retry option; keep in-memory state consistent.
- Chart safety: clamp remaining at 0 for slices, but display negative text if over budget.
- Navigation guard: block Home until onboarding is complete.

## Performance & Reliability
- Keep state minimal; derive computed totals with memoized selectors.
- Batch writes to AsyncStorage; avoid unnecessary re-renders by slicing state selectors.
- Use `useFocusEffect` or subscriptions to refresh derived data after navigation where needed.
- Avoid heavy libraries; prefer custom svg donut for predictable Expo support.

## Testing (MVP scope)
- Unit: calculators (totals, remaining, category breakdown), formatting, month filter.
- Component: DonutChart renders slices given totals; add-flow stepper validation paths.
- Integration (lightweight): store hydration and add-transaction flow with mocked storage.

## Security & Privacy
- Local-only data; no network calls.
- Avoid logging sensitive values in production builds.

## Delivery Rules (self-discipline)
- Always document architecture and feature changes (update this file + README/CHANGELOG as features land).
- Favor reliable, simple solutions over fragile/flashy ones; stick to this architecture unless revised intentionally.
- Keep UX minimal and consistent with the plan; align new work to these module boundaries.
