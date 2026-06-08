# SchoolMate Staff — Foundation & Core Flow

**Date:** 2026-06-03
**Status:** Approved design, ready for implementation planning
**Scope:** Spec #1 of the staff app — full project foundation + a complete vertical slice
(Splash → Login → Home → Attendance check-in). Roster, Leave, Tasks, Driver, and Profile
are deferred to later specs.

## Background

SchoolMate Staff is the third app in the SMS suite (alongside `sms-student` and
`sms-teacher-app`). It is a mobile app for **non-teaching school staff** — bus drivers,
cooks, watchmen, gardeners, sweepers, peons, clerks — built for **low-digital-literacy
users on Android phones**. It is icon-first, large-tap-target, role-aware, fully
bilingual-ready (4 languages), and motion-rich for legible feedback.

The visual design is fully specified in a Claude Design handoff (`SchoolMate Staff.html` +
`design_handoff_schoolmate_staff/README.md`). This spec recreates that design faithfully on
the **teacher app's proven architecture**, so the API backend can be wired later with a
one-line config change.

## Goals

- Stand up a new Expo + TypeScript app that mirrors the teacher app's conventions.
- Build a swappable, production-grade data layer: **mock data now, real REST API later** via
  a one-flag swap (no screen rewrites).
- Deliver a complete, animated vertical slice — Splash, Login (role + language), Home
  dashboard, and the signature geo-fence Attendance check-in — that proves every layer of
  the architecture end-to-end.
- Establish the role-aware theme system, the icon set, the UI primitive library, and full
  4-language i18n that the remaining screens will build on.
- After login, the **school name + logo** are shown in the authenticated header (carried
  from the auth session / tenant).

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Scope of this spec | **Foundation + vertical slice** — scaffold everything, build Splash/Login/Home/Attendance. Remaining 5 screens are later specs. |
| Data architecture | **Mirror the teacher app** — repository ports + Mock/HTTP adapters + factory (env flag) + TanStack Query hooks + SecureStore auth. |
| i18n | **Full 4 languages now** (en/hi/mr/ta) via react-i18next; the handoff dictionary is ported directly. |
| Branding | **Logo + school name in the authenticated header**, threaded from the session's tenant (school). |
| Role-driven fields | **Fields/content adapt per role**, not just driver. Each of the 7 roles defines its own duty-post label and specialized "today" card. The handoff only fleshed out the driver; this generalizes the pattern to every role. |
| Fonts | **Sora** (display) + **Manrope** (body), per the handoff. |
| Backend | **Out of scope** — this is the client + the contract the API must satisfy. |

## Stack

Aligned with `sms-teacher-app`:

- Expo SDK ~54, React 19, React Native 0.81, TypeScript ~5.9
- `@react-navigation/native` + `native-stack` + `bottom-tabs`
- `@tanstack/react-query` — server-state hooks
- `react-native-reanimated` + `react-native-gesture-handler` — motion + swipe
- `react-native-svg` — inline icon set; `expo-linear-gradient` — hero/role gradients
- `expo-location` — geo-fence check-in
- `@react-native-async-storage/async-storage` — mock persistence
- `expo-secure-store` — auth tokens
- `react-i18next` / `i18next` — localization
- `expo-font` with `@expo-google-fonts/sora` + `@expo-google-fonts/manrope`
- `zod` — input validation (phone, forms)
- dev: `jest`, `jest-expo`, `@testing-library/react-native`, eslint, prettier, husky

## Architecture

Five layers; each depends only on the layer below. Screens never import data — they import
hooks. (Identical philosophy to the teacher app's swappable-data architecture.)

```
Screens (presentational)        Home, Attendance, Login, Splash
   v calls hooks only
Feature hooks (TanStack Query)  useDashboard(), useCheckIn(), useSession(), useLogin()
   - query keys, caching, optimistic updates
   v calls repositories via context
Repository interfaces (ports)   AuthRepository, DashboardRepository, AttendanceRepository
   v resolved at runtime by a factory (env flag)
Adapters (two implementations)
   - MockAdapter -> in-memory store + AsyncStorage + simulated latency
   - HttpAdapter -> REST client + DTO mappers
   v
Infrastructure                  httpClient (auth+tenant+errors), queryClient,
                                tokenStore (SecureStore), asyncStore, i18n, theme
```

**Stable contract:** domain types are the contract; both adapters return identical shapes.
**The swap:** `config/env.ts` exposes `DATA_SOURCE` (`mock`|`live`); the factory returns the
mock or http bundle. Flipping the flag moves the whole app to the live API.

**Providers** (wrapped once in `AppProviders.tsx`):
`QueryClientProvider` → `I18nextProvider` → `ThemeProvider` → `AuthProvider` →
`RepositoryProvider`. The auth-gated `RootNavigator` shows Splash/Login vs Main.

## Folder structure

```
src/
  config/
    env.ts                 # DATA_SOURCE = 'mock'|'live', API_BASE_URL
  lib/
    queryClient.ts         # TanStack Query client (staleTime, retry, key helpers)
    httpClient.ts          # fetch wrapper: base URL, auth header, X-Tenant-Id, error normalize
    tokenStore.ts          # Expo SecureStore (access + refresh)
    asyncStore.ts          # AsyncStorage JSON helpers (mock persistence)
    errors.ts              # AppError {code,status,message}, isAppError()
    latency.ts             # simulateLatency(), maybeFail() for the mock
  i18n/
    index.ts               # i18next init, language detection, change handler
    resources/en.json hi.json mr.json ta.json   # ported from app/i18n.jsx
  theme/
    colors.ts              # light + dark token tables
    roles.ts               # ROLES: 7 roles, each accent/accentSoft/icon/label key,
                           # dutyPostLabel, and specialized-card descriptor (role-driven fields)
    typography.ts          # Sora + Manrope scale
    makeTheme.ts           # makeTheme(dark) -> resolved theme
    ThemeProvider.tsx      # theme context + dark toggle + useTheme()
    index.ts
  components/
    icons/                 # inline SVG icon set (~50) + <Icon> (react-native-svg)
    ui/                    # Btn, IconBtn, Card, Avatar, RolePill, Pill, Ring, Skeleton,
                           # SectionLabel, Header, StatusBar/SafeArea wrappers, TabBar, Fab,
                           # Confetti, GeoRadar, CheckInButton, Toast
    state/ ErrorState.tsx EmptyState.tsx
  data/
    domain/                # staff.ts session.ts tenant.ts role.ts dashboard.ts
                           # attendance.ts index.ts  (pure types, no presentation)
    repositories/
      types.ts             # AuthRepository, DashboardRepository, AttendanceRepository, bundle
      RepositoryContext.tsx# provider + useRepositories()
      factory.ts           # picks mock|http bundle from env
    mock/
      seed.ts              # seeded staff (Ramesh Kumar), demo school, dashboard, attendance
      store.ts             # in-memory tables + AsyncStorage hydrate/persist
      auth.repo.ts attendance.repo.ts dashboard.repo.ts
    http/
      auth.repo.ts attendance.repo.ts dashboard.repo.ts
      mappers.ts           # DTO <-> domain
  features/
    auth/ AuthProvider.tsx hooks.ts     # useSession, useLogin, useLogout
    dashboard/ hooks.ts                 # useDashboard
    attendance/ hooks.ts                # useAttendanceStatus, useCheckIn, useCheckOut
  navigation/
    RootNavigator.tsx      # Splash/Login (no session) vs Main (authed)
    MainTabNavigator.tsx   # Home, Roster, Tasks, Me tabs + center check-in FAB; overlay stack
    types.ts
  providers/AppProviders.tsx
  screens/
    SplashScreen.tsx
    LoginScreen.tsx
    HomeScreen.tsx
    AttendanceScreen.tsx
    (RosterScreen/LeaveScreen/TasksScreen/DriverScreen/ProfileScreen = stubs this spec)
App.tsx                    # fonts + providers + navigation
docs/superpowers/specs/ + plans/
```

## Design tokens (from handoff)

**Light:** `bg #F2EEE4`, `surface #FFFFFF`, `surface2 #FBF9F3`, `sunken #EBE6D9`,
`ink #15231E`, `inkSoft #5E6E66`, `inkFaint #94A199`, `primary #0E5C4A`,
`primaryDim #15735C`, `gold #E7A92F`, `goldSoft #FBEAC2`, `success #2E9E6B`,
`danger #DA5347`, `warn #E0922F`. **Dark:** `bg #0B1512`, `surface #14241E`,
`primary #33BF9F`, `gold #F2C766`, etc. (full table in handoff README).

**Role accents:** driver `#E08A3C`, cook `#DD5A4B`, guard `#3B7FD4`, gardener `#4C9E55`,
sweeper `#23A79C`, peon `#8A6ED4`, clerk `#5566CE` (+ soft tints + icon each).

**Type:** Sora (display, 400–800) + Manrope (body, 500–800). Scale: hero 26–30/700, screen
title 21/700, card title 16–17/700, body 14–15/600–800, caption 12–13/600, micro-label
10.5–12/800 uppercase. Tabular nums on timers.

**Shape:** radii buttons/inputs 16, cards 20–26, pills 100, FAB 22; min tap target 44,
primary buttons 54 tall, check-in button 184 circle. Shadows per handoff; CTAs add an
accent-tinted glow. **Light mode is default.** Use safe-area insets (not the fixed 38/22px
prototype bars).

## Role-driven content (role config)

The handoff reskins the app to the role's accent but only gives the **driver** role-specific
fields. This spec generalizes that: a single `theme/roles.ts` config is the source of truth
for everything that changes per role, so adding/adjusting a role is one edit and every screen
reads from it.

```ts
// theme/roles.ts
type RoleConfig = {
  key: Role;
  labelKey: string;          // i18n key for the role name
  icon: IconName;            // bus | pot | shield | leaf | broom | bell | doc
  accent: string;            // e.g. driver #E08A3C
  accentSoft: string;        // tint background
  dutyPostLabelKey: string;  // "Bus / Route", "Kitchen / Mess", "Gate / Post", ...
  roleCardKind: RoleCard['kind'];   // which specialized card layout to render on Home
};
export const ROLES: Record<Role, RoleConfig> = { driver: {...}, cook: {...}, ... };
```

- **Accent reskin:** FAB, primary buttons, hero gradients, active nav, selected role tile,
  role-accent icons — all read `ROLES[roleKey].accent`.
- **Duty post + labels:** the Home hero "DUTY POST" column and Attendance duty-post pin use
  `dutyPostLabelKey` (localized), so a cook sees "Kitchen / Mess", a guard "Gate / Post", etc.
- **Specialized Home card:** `<RoleSpecializedCard role={roleKey} data={dashboard.roleCard} />`
  switches on `roleCard.kind` to render the per-role layout (table above). Each layout is a
  small focused component (`components/ui/roleCards/`), so the file set stays readable.
- **Mock seed** provides a realistic `roleCard` for the logged-in role; switching role at
  login changes the whole experience (accent + duty post + specialized card).
- The driver also has a deep-dive overlay (later spec); other roles can gain their own
  overlays the same way without touching Home.

## Screens in this spec

### Splash
Full-bleed radial green gradient, centered logo with two staggered pulse rings, "SchoolMate"
(Sora 30/700 white) + "STAFF" (Manrope 14/800 gold, letter-spacing 3), three bouncing dots,
two drifting blurred orbs. Logo scales 0.6→1 + fades (0.8s); text rises 14px + fades (0.7s,
0.35s delay); rings on a 2s loop offset 0.9s; dots on a 1s loop. Auto-advances to Login
after ~2.2s; tap-to-skip.

### Login
- **Brand cap** (rounded-bottom 30, green radial gradient, drifting gold orb): logo +
  "SchoolMate Staff" / school name, **language pill** (globe + native language name +
  chevron) on the right. Greeting "Welcome back 👋" (Sora 26/700) + subtitle.
- **Language dropdown** rendered at screen root with a full-screen scrim (escapes the cap's
  clipping): English / हिंदी / मराठी / தமிழ், selected row tinted + check.
- **Role grid** — 4-column tiles (icon + label); selected fills with role accent, lifts 2px,
  accent glow. Selecting a role sets the session's role accent; it does not submit.
- **Mobile field** — 58px pill, role-accent phone icon, "+91" prefix, editable (default
  `98765 43210`); validated with zod.
- **CTA** — full-width 54px primary button in the role accent: "Send OTP & continue" →
  triggers `useLogin()` (mock: any phone succeeds, returns seeded staff + demo school). No
  separate OTP screen this spec (wire in production).
- **Footer** — shield + "Secured by SchoolMate · No password needed".
- All strings localized via i18next.

### Home (tab)
- **Greeting / brand bar** — **school logo + school name** (from session tenant) +
  avatar + "Good morning, {first name}" + theme toggle + notification bell with badge.
  *(This is the branding requirement: school identity is visible after login.)*
- Scroll column (gap 16, bottom padding 120 to clear the nav) of cards staggering in
  (transform-only slide-up 16px, 65ms apart — never rest at opacity:0; see Gotchas):
  1. **Hero "Today" card** — role-gradient (green when not checked in, role accent when on
     duty): date, "Morning Shift", live status chip, TIMING (7:30–3:30) + DUTY POST columns.
     Not checked in → gold "Tap to check in"; checked in → "Checked in at {time}" + elapsed.
  2. **Stat trio** — hours-this-week ring (34/44), on-time streak (fire, "21 days"), leave
     left (gift, "12 left").
  3. **Role specialized card** *(content varies by `roleKey`)* — driven by the role config,
     so every role gets relevant fields, not just driver: driver → bus/route + license &
     fitness pills (taps to Driver, stub this spec); cook → today's meal count + menu +
     stock; guard → gate/post + rounds + visitor log; gardener → assigned zones + watering;
     sweeper → blocks + supplies; peon → errands/deliveries + bell duty; clerk → pending
     files/records. The card pulls from the dashboard's `roleCard` block and renders a
     per-role layout selected by `roleKey`. (Deep-dive overlays per role come in later specs.)
  4. **Pending tasks peek** — section header + "View all", two task cards (read-only peek).
  5. **Alert card** — gold, "Staff meeting at 4:00 PM".
- Data via `useDashboard()`; Skeleton/Error/Empty/data states.

### Attendance (overlay, opened by FAB or hero button)
- Back header.
- **Geo radar** (188px) — concentric duty-fence rings, center duty-post pin (role accent),
  a "you" dot green inside / red outside. Locating → conic sweep + "Locating you…"; ready →
  "Inside duty zone" or "120 m away · move closer" + accuracy. Backed by expo-location;
  `flex-shrink:0` so it never collapses (Gotchas).
- **Demo range toggle** — segmented In range / Out of range (prototype affordance; real GPS
  derives range in production — guarded behind a dev/demo flag).
- **Check-in button** — 184px circle, role-accent gradient + pulse rings when actionable;
  disabled (sunken) while locating or out of range. Tap → 650ms spinner → `useCheckIn()`
  optimistic mutation → **confetti burst** → flips to red "Check out" + starts on-duty timer.
  Helper text reflects current state.
- **Today's log** — timeline row "Checked in · {time} · Inside duty zone".

### Stubs (this spec)
Roster, Tasks, Me/Profile tabs and Leave/Driver overlays render a minimal placeholder
("Coming soon") so navigation is complete and testable. Full builds in later specs.

## Navigation & interaction model

- **Bottom tabs:** Home, Roster, Tasks, Me + center **check-in FAB** (60px role-accent
  circle, pulse ring). Frosted bar floating 26px from bottom, 14px insets, 26px radius;
  active item uses role accent + heavier icon stroke.
- **Overlays:** Attendance, Leave, Driver push from the right with a back button and hide
  the nav. Tabs use a fade-up transition.
- **Theme toggle:** sun/moon in the Home greeting bar (and later Profile); flips the whole
  token set; status/safe-area tint follows the active view.
- **Language:** chosen at Login or (later) Profile; applies app-wide immediately. Proper
  nouns (names, bus reg, school, dates) stay untranslated.
- **Confetti** on successful check-in (reanimated particle burst).
- **Live timers:** on-duty elapsed ticks every second; format `Hh Mm`.

## Data model (domain types — this spec)

```ts
Role     = 'driver'|'cook'|'guard'|'gardener'|'sweeper'|'peon'|'clerk'
Tenant   = { id: string; name: string; logoUrl?: string }      // school name + logo
Staff    = { id; name; firstName; roleKey: Role; empId; joined; rating;
             dutyPost; shift; timing; phone }
Session  = { accessToken; refreshToken; user: Staff; tenant: Tenant }
Dashboard= { hoursThisWeek; hoursTarget; streakDays; leaveLeft;
             roleCard: RoleCard;                 // role-driven specialized card data
             pendingTasksPeek: TaskPeek[]; alert?: string }

// Role-driven specialized card — a discriminated union keyed by role.
RoleCard =
  | { kind: 'driver';   busNo; routeName; licenseExpiresInDays; fitnessOk }
  | { kind: 'cook';     mealCount; menu: string[]; lowStock: string[] }
  | { kind: 'guard';    gate; roundsDone; roundsTotal; visitorsToday }
  | { kind: 'gardener'; zones: string[]; wateringDue: number }
  | { kind: 'sweeper';  blocks: string[]; suppliesLow: string[] }
  | { kind: 'peon';     errands: number; bellDuty: boolean }
  | { kind: 'clerk';    pendingFiles; requestsOpen }
Attendance = { checkedIn: bool; checkInAt?: string; lastLog: AttendanceLog[];
               dutyPost; geofenceRadiusM }
```

(Color/presentation never lives in domain types — accents are derived from `roleKey` on the
client.)

## Repository contracts (this spec)

```ts
interface AuthRepository {
  login(phone: string, roleKey: Role): Promise<Session>;
  refresh(token: string): Promise<Session>;
  me(): Promise<Staff>;
  logout(): Promise<void>;
}
interface DashboardRepository { get(): Promise<Dashboard>; }
interface AttendanceRepository {
  status(): Promise<Attendance>;
  checkIn(at: string, inZone: boolean): Promise<Attendance>;
  checkOut(at: string): Promise<Attendance>;
}
interface Repositories { auth; dashboard; attendance; }
```

Later specs extend `Repositories` with roster, leave, tasks, driver, profile, documents.

## Data flow

**Read — Home:** `useDashboard()` → `useQuery(['dashboard', tenantId], repos.dashboard.get)`.
Mock: `simulateLatency()` → seeded dashboard. Live: `GET /staff/dashboard`. Render
Skeleton/Error(retry)/Empty/data.

**Write — check-in (optimistic):**
`useCheckIn()` = `useMutation(() => repos.attendance.checkIn(now, inZone), { onMutate: snapshot + optimistic cache write; onError: rollback + toast; onSettled: invalidate ['attendance'] })`.
Mock persists to AsyncStorage (survives reload). Live: `POST /staff/attendance/check-in`.
Screen code is identical mock vs live.

## Auth & multi-tenancy

- `tokenStore` persists tokens in SecureStore (encrypted).
- `AuthProvider` bootstraps on launch: token → `me()` → session, else unauthenticated.
  Exposes `useSession`, `useLogin`, `useLogout`.
- Auth-gated nav: no session → Splash/Login; session → Main. Logout clears tokens + resets
  the query cache.
- `tenant.id` (schoolId) injected by `httpClient` as `X-Tenant-Id`; the mock filters by
  tenant. `tenant.name` + `tenant.logoUrl` feed the authenticated header branding.
- Mock login accepts any phone + chosen role, returns a fake token + seeded staff + demo
  school ("Greenfield Public School").

## i18n

- `i18n/index.ts` initializes i18next with `en`/`hi`/`mr`/`ta` resources ported directly
  from the handoff `app/i18n.jsx` dictionary (keys already stable). `{var}` interpolation;
  fallback en → raw key.
- Language pickers: Login pill + dropdown now; Profile sheet in a later spec. Selection
  persists (AsyncStorage) and applies app-wide.
- Hindi is polished; **Marathi & Tamil flagged for a native-speaker proofread** before
  production. RTL not implemented (note for future Urdu/Arabic).

## Error handling & UI states

- `httpClient` normalizes all failures to typed `AppError {code,status,message}`; the mock
  throws the same via `maybeFail()`.
- React Query defaults: `retry: 2`, exponential backoff, `staleTime: 30s`; `401` excluded
  (refresh/logout).
- Shared `<Skeleton/>`, `<ErrorState onRetry/>`, `<EmptyState/>` on every data screen.
- Mutations: optimistic update + rollback + `Toast`.

## Testing

Jest + React Native Testing Library (added with this scaffold):
- **Contract tests** per repository interface, run against both mock and a fixture-backed
  http adapter — guarantees mock/live reconcilability.
- **Mapper tests** — DTO ↔ domain round-trips.
- **Hook tests** — `useDashboard`, `useCheckIn` with a test QueryClient + injected mock
  repo: loading→data→error transitions + optimistic rollback.
- **Component tests** — CheckInButton state machine (locating/out-of-range/actionable/checked-in),
  Login validation.

## Gotchas (carried from the handoff)

- **Never rest a flex child at `opacity:0`** gated on an animation frame — stagger animates
  **transform only**; resting opacity is 1.
- **Clipping containers** (identity card, geo radar, brand cap) need `flexShrink: 0` or they
  collapse to a sliver.
- **Dropdowns/sheets** render at screen root with a scrim, not inside a clipped parent.
- Each component uses its own `StyleSheet.create`.

## Out of scope (this spec)

- Roster, Leave, Tasks, Driver, Profile full screens (later specs; stubbed for nav now).
- The real backend implementation (this defines the client contract).
- Real OTP verification screen, push notifications, offline sync beyond AsyncStorage.
- RTL languages.

## Follow-on specs

1. **Roster + Leave + Tasks** — week strip, leave balances + approval timeline, swipe-to-complete.
2. **Driver + Profile** — vehicle/license/trip control + identity/documents/settings/language sheet.

---

## Plans 3 & 4 complete (production UI) — 2026-06-08

All 17 tasks of the production-UI plan shipped:

- **Icon set** (40+ monochrome SVG icons via `<Icon>`)
- **UI primitive library** (Btn, Card, Pill, Avatar, Ring, Skeleton, Toast, BrandCap, PhoneField, RoleGrid, LanguagePicker, Header, StatTrio, HeroTodayCard, TasksPeek, AlertCard, role-specialized cards, GeoRadar, CheckInButton, Confetti, TabBar)
- **Screens** — animated Splash (reanimated), role+language Login (zod-validated), branded Home dashboard (7 role-specialized cards), geo-fence Attendance check-in with confetti burst
- **Navigation** — floating frosted TabBar + center check-in FAB overlay; Attendance as a stack overlay
- **ToastProvider** wired into AppProviders (inside AuthProvider); screens can call `useToast()`
- **Test count:** 112 tests across 43 suites — all green
- **Verified:** `npm test` ✓ · `npm run typecheck` ✓ · `npm run lint` (0 errors) ✓ · `npx expo export --platform web` ✓ (1274 modules, 2.58 MB bundle)

