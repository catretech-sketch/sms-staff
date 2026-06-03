# SchoolMate Staff

Mobile app for non-teaching school staff (drivers, cooks, guards, gardeners, sweepers,
peons, clerks). Part of the SMS suite alongside `sms-student` and `sms-teacher-app`.

## Stack
Expo SDK 54 · React Native 0.81 · TypeScript · React Navigation · TanStack Query ·
react-i18next (en/hi/mr/ta) · Sora + Manrope fonts. Swappable mock→HTTP data layer
(`EXPO_PUBLIC_DATA_SOURCE=mock|live`).

## Run
- `npm install`
- `npm run web` / `npm run android` / `npm run ios`
- `npm test` · `npm run lint` · `npm run typecheck`

## Docs
- Specs: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`
- Design reference (source of truth for tokens, icons, i18n dictionary): `docs/design-handoff/`

## Status
Plans 1–2 complete (scaffold + swappable mock→HTTP data layer + auth). Next: Plan 3
(icons, UI primitives, Splash & Login), Plan 4 (Home & Attendance).
