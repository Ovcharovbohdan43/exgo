# Gamification System Plan (ExGo)

This document defines a modern, unobtrusive gamification layer for ExGo. It focuses on motivation (clarity, progress, small wins) without noisy vanity rewards. All elements run locally; notifications are low-friction and user-controlled.

## Principles
- **Purpose over points:** Every reward ties to healthier money habits (logging, budgeting, goal progress).
- **Calm defaults:** Opt-in for push alerts; in-app toasts are subtle. No daily nags.
- **Progress always visible:** Light, glanceable indicators (streak dots, level chip, next badge preview).
- **Fairness and honesty:** No dark patterns; challenges are achievable with clear rules and end dates.

## Game Loop
1) Set intent: goals, mini-budgets, and recurring plans.
2) Act: log expenses/savings, update budgets, pay debts.
3) Feedback: streaks, badges, progress bars, “next unlock” hints.
4) Reflect: weekly/monthly digest with highlights and one suggestion.

## Core Mechanics
- **Streaks (logging discipline):**
  - Tracks consecutive days with at least one transaction logged.
  - Break forgiveness: 1 “skip token” per 14 days to avoid frustration.
  - UI: small dot row on Home; tap to see streak detail and best streak.
- **Badges (milestones):**
  - Categories: Logging (e.g., 7/30 days), Goals (50/80/100% funded), Budgets (3 months under budget), Debts (on-time payments N months), Consistency (no overspend vs budget).
  - Tiered: bronze/silver/gold; show next requirement.
  - Unlock animation: short, silent confetti; optional haptic.
- **Challenges (time-boxed, opt-in):**
  - Weekly “No Delivery”, “Groceries -10% vs avg”, “Log daily”.
  - Clear start/end date; success = badge + streak boost.
  - One active challenge at a time to reduce noise.
- **Levels (soft progression):**
  - XP from meaningful actions: +X for logging, +Y for hitting goal checkpoint, +Z for closing month under budget.
  - Levels gate only cosmetic flair (card accent, profile ring), never features.
- **Progress previews:**
  - For each badge, show “Next: log 3 more days” or “Save £200 to hit Gold”.
  - For goals: ETA based on pace; counts toward badge track.

## UX Surfaces
- **Home ribbon:** compact streak + level chip; tap opens Profile/Gamification hub.
- **Gamification hub:** badges grid, streak history, active challenge, next unlocks.
- **Toasts:** minimal, once per unlock; “Badge earned: On-Time Payer (3 mo)”.
- **Digest:** weekly/monthly card in Home/Details with 3 bullets: best win, risk, next action.
- **Settings:** toggle for gamification alerts; view earned badges and download summary (optional PDF).

## Data Model (local)
- `StreakState { current, best, skipTokens, lastDate }`
- `Badge { id, name, tier, category, unlockedAt, progress, target }`
- `Challenge { id, name, type, start, end, status, progress, target }`
- `LevelState { xp, level }`
- Stored under `gamification` key; derived metrics recomputed from transactions/goals/budgets.

## Triggers & Rules
- **Transaction logged:** +streak day if first of day; +XP.
- **Goal funded:** +progress to goal badges; check milestone (50/80/100%).
- **Budget month closed under limit:** +budget badge progress, +XP.
- **Debt on-time payment:** +debt badge progress.
- **Challenge tick:** update progress on relevant events; resolve at end date.
- **Streak break:** if a day missed, consume skip token (if available) else reset.

## Telemetry (local) & Analytics
- Local counters drive UI; outbound analytics (if enabled) should be minimal and anonymized: badge unlocked, streak extended, challenge completed (counts only).
- No PII; no full transaction data leaves device unless user opts in.

## Rollout Plan
1) Infra: add gamification state, selectors, and persistence; connect to Transactions/Goals/Budgets hooks.
2) Surface streak chip + badge previews; add Gamification hub screen.
3) Add badges (logging, goals, budgets) + confetti/haptic on unlock.
4) Add challenges (one-at-a-time) and weekly digest card.
5) Refine XP/levels and cosmetics; polish animations and accessibility.

## Accessibility & A11y
- All chips/buttons with `accessibilityRole`, labels; animations optional and reducible when “Reduce Motion” enabled.
- High-contrast badge art; minimal color-only signaling.

## Copy & Tone
- Encouraging, brief, numbers-first: “Logged 7 days. 3 to next badge.”; “Budget under plan 2 months—1 more for Silver.”
