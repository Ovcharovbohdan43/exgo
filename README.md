# ExGo

Minimal Expo/React Native budgeting app. See `ARCHITECTURE.md` for the blueprint and `DEVELOPMENT_PLAN.md` for the delivery steps.

## Getting Started
- Install deps: `npm install`
- Run in Expo Go (already running separately): `npm start` then scan the QR from the Metro console.
- Tests: `npm test` (Jest + jest-expo)

## Project Structure (MVP)
- `App.tsx` and `index.js` entrypoints (Expo)
- `src/` modules: navigation, screens, components, state, services, utils, theme, types, constants
- Docs: `ARCHITECTURE.md`, `DEVELOPMENT_PLAN.md`

## Notes
- Expo Go compatible (managed workflow, no native modules beyond Expo-compatible libs).
- Keep docs updated as features ship.
