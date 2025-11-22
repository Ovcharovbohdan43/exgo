# ExGo – Development Plan

This plan converts the architecture into actionable steps for the MVP. Follow in order; keep it updated as work completes.

## Phase 0 – Tooling & Baseline
- Verify toolchain: Expo CLI works (`npm start`), Jest runs (`npm test`).
- Create README scaffold referencing ARCHITECTURE.md and this plan.
- Add basic CI script (optional local check) to run `npm test`.

## Phase 1 – Routing & Shell
- Implement `RootNavigator` to guard onboarding and wire header options.
- Add global theme provider (colors/spacing tokens) and wrap app with basic styling defaults.
- Add reusable layout components: screen container, section header, cards.

## Phase 2 – State & Persistence
- Harden SettingsProvider and TransactionsProvider: error surfacing (toast/log), loading/error states, memoized selectors.
- Add hydration gate to block navigation until stores load; add retry on storage failures.
- Implement reset logic that clears storage and reinitializes defaults.

## Phase 3 – Onboarding
- Build polished onboarding screen: currency dropdown (pre-fill from locale), income numeric input with validation, primary CTA.
- On save: persist settings, set `isOnboarded`, navigate Home. Add inline validation and error messaging.

## Phase 4 – Home Experience
- Layout Home per design: header with remaining/income, donut chart, summary stats (spent/saved/remaining), last transaction preview.
- Connect chart to totals; clamp remaining for visuals but show negative text when over budget.
- Add floating plus button; open add-transaction flow as bottom sheet/modal.
- Add tap-to-details on chart.

## Phase 5 – Add Transaction Flow
- Modal stepper: type selection → amount input (currency format) → category (expense/saved) → confirm.
- Validation: positive amount, category required for expense/saved.
- On confirm: save transaction, recalc totals, toast success, close modal.
- Pre-fill defaults (current date, “Income” category fixed).

## Phase 6 – Details (Spending Breakdown)
- Render large donut + percentages.
- List expense categories with amounts and percentages; empty state message.
- (Optional) navigate into CategoryTransactions list; otherwise stub with TODO.

## Phase 7 – Settings
- Inputs for monthly income and currency; persist on change with success feedback.
- Reset all data with confirmation dialog; return to onboarding on reset.
- Theme toggle placeholder wired to tokens.

## Phase 8 – Theming & Polish
- Apply color/spacing/typography tokens across components.
- Add subtle shadows/rounding, gradient accents (e.g., header background).
- Add small animations: modal open, chart value transitions.
- Ensure accessibility basics: touch targets, contrast, labels.

## Phase 9 – Testing
- Unit: calculators (totals, category breakdown), date filter, currency formatter.
- Component: DonutChart renders slices; Add flow validation paths; Settings save/reset interactions.
- Integration (lightweight): store hydration + add transaction with mocked storage.

## Phase 10 – QA & Handoff
- Manual run-through: onboarding → add transactions → breakdown → settings/reset.
- Document known limitations and future work in README/CHANGELOG.
- Clean up lint warnings, ensure no unused exports, verify build via `npm start` (Expo Go).

## Ongoing Rules (self)
- Keep docs updated (ARCHITECTURE.md, this plan, README).
- Favor stable, Expo-compatible libs; avoid native-only dependencies.
- Maintain defensive coding: validate inputs, handle storage errors, guard navigation states.
