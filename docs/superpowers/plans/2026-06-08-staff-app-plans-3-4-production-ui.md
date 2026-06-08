# Staff App — Plans 3 & 4: Production UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder screens with the full production UI — an icon set, a UI-primitive library, and the four real screens (animated Splash, role+language Login, branded Home dashboard with 7 role-specialized cards, and the geo-fence Attendance check-in) — built on the existing data/auth/theme/i18n foundation.

**Architecture:** Pure presentational components in `src/components/` (icons, ui, state) consumed by screens in `src/screens/`. Screens read data only through the existing hooks (`useDashboard`, `useAttendanceStatus`, `useCheckIn`, `useCheckOut`, `useLogin`, `useAuth`). All color comes from `useTheme()` (`colors` + `role.accent`); all copy comes from `react-i18next` `useTranslation()`. Animation via `react-native-reanimated`, gradients via `expo-linear-gradient`, vector art via `react-native-svg`, geolocation via `expo-location`. No new data-layer or domain changes — the contract from Plans 1 & 2 is frozen.

**Tech Stack:** React 19 / RN 0.81 / Expo SDK 54 / TypeScript, react-native-reanimated v4, react-native-svg 15, expo-linear-gradient, expo-location, @tanstack/react-query, react-i18next, zod. Tests: jest-expo + @testing-library/react-native v13.

---

## Conventions (read once, apply to every task)

- **Path alias:** `@/` → `src/`. Always import via `@/...`.
- **Theme:** `const { colors, role, roleKey, dark, toggleDark } = useTheme();` — `colors.*` from `src/theme/colors.ts` `ThemeColors`, `role.accent`/`role.accentSoft` from `src/theme/roles.ts`. Never hardcode hex in a component except inside the icon SVG path fills that are explicitly monochrome-via-prop.
- **Type scale:** `import { TextScale, FontFamily } from '@/theme/typography';` then `style={[TextScale.cardTitle, { color: colors.ink }]}`.
- **Copy:** `const { t } = useTranslation();` then `t('home.goodMorning', { name })`. Every user-visible string goes through `t()`. Add the key to all four resource files in Task 2.
- **Each component file** has its own `StyleSheet.create`. One component (plus tightly-coupled subcomponents) per file.
- **Animation gotcha (from spec):** a staggered-entrance child must animate **transform only** and rest at `opacity: 1`. Never leave a flex child gated at `opacity: 0` waiting on a frame.
- **Clipping gotcha:** clipping containers (brand cap, geo radar, identity/hero card) need `flexShrink: 0`.
- **Dropdowns/sheets** render at screen root over a full-screen scrim, not inside a clipped parent.
- **Test imports:** `import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';`. Wrap anything that calls `useTheme()` in a `<ThemeProvider>`; anything that uses i18n strings can assert on the raw key (i18n falls back to key when not initialised) OR initialise i18n in the test — prefer wrapping with a small `renderWithTheme` helper (Task 3 Step 1 creates it).
- **Reanimated in tests:** `jest.setup.js` stubs the worklet init; use `react-native-reanimated/mock` is **not** needed under jest-expo, but if a component’s animation breaks a test, mock it at the top of that test file with `jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));`.
- **Commit cadence:** one commit per task (after its tests pass), conventional-commit message. Branch is `main` per project norm (Plans 1 & 2 committed straight to main).
- **Verification bar (per task where noted, and final):** `npm test`, `npm run typecheck`, `npm run lint` all clean; final task also runs `npx expo export --platform web`.

---

## File Structure (created across this plan)

```
src/components/
  icons/
    Icon.tsx            # <Icon name size color/> dispatcher over react-native-svg
    paths.ts            # name -> SVG path data + viewBox (monochrome, currentColor via prop)
    index.ts
    __tests__/Icon.test.tsx
  ui/
    testUtils.tsx       # renderWithTheme(ui, {dark?, role?})  (test-only helper, importable)
    Btn.tsx             # primary/ghost button, role-accent, loading state
    IconBtn.tsx         # circular icon button (44 tap target)
    Card.tsx            # surface card, radius 22, theme shadow
    Pill.tsx            # status/label pill
    RolePill.tsx        # role label + icon pill
    SectionLabel.tsx    # "title" + optional "action" row
    Avatar.tsx          # initials circle, role-accent ring
    Ring.tsx            # SVG progress ring (value/target) with center label
    Skeleton.tsx        # shimmer block
    Header.tsx          # branded auth header: logo+school, greeting, theme toggle, bell
    BrandCap.tsx        # Login green radial cap w/ drifting orb + language pill slot
    LanguagePicker.tsx  # root-level scrim dropdown (en/hi/mr/ta)
    RoleGrid.tsx        # 4-col role tile grid (selection)
    PhoneField.tsx      # +91 pill input, zod-validated
    StatTrio.tsx        # hours ring + streak + leave-left
    HeroTodayCard.tsx   # Home hero "Today" card (checked-in aware)
    TasksPeek.tsx       # pending tasks peek (2 cards + view all)
    AlertCard.tsx       # gold alert banner
    GeoRadar.tsx        # concentric duty-fence radar + you-dot
    CheckInButton.tsx   # 184 circle state machine (locating/out/ready/checked-in)
    Confetti.tsx        # reanimated particle burst
    Toast.tsx           # transient toast (imperative via context)
    TabBar.tsx          # floating frosted bottom bar + center check-in FAB
    roleCards/
      RoleSpecializedCard.tsx   # switch on roleCard.kind -> per-role layout
      DriverCard.tsx CookCard.tsx GuardCard.tsx GardenerCard.tsx
      SweeperCard.tsx PeonCard.tsx ClerkCard.tsx
    index.ts
    __tests__/*.test.tsx
  state/
    ErrorState.tsx
    EmptyState.tsx
    __tests__/state.test.tsx
src/screens/
  SplashScreen.tsx      # NEW (animated)
  LoginScreen.tsx       # REWRITE (real)
  HomeScreen.tsx        # REWRITE (real)
  AttendanceScreen.tsx  # REWRITE (real)
src/navigation/
  RootNavigator.tsx     # MODIFY: add Splash gate before Login
  MainTabNavigator.tsx  # MODIFY: custom TabBar + Attendance overlay in a stack
```

---

## Task 1: Icon set + `<Icon>` component

**Files:**
- Create: `src/components/icons/paths.ts`
- Create: `src/components/icons/Icon.tsx`
- Create: `src/components/icons/index.ts`
- Test: `src/components/icons/__tests__/Icon.test.tsx`

The icon set is monochrome single-path/grouped SVGs colored by a `color` prop (default `currentColor`→ resolved to a passed color). Required names (referenced by later tasks and `theme/roles.ts`): `bus, pot, shield, leaf, broom, bell, doc` (role icons) + UI icons `home, roster, tasks, user, check, chevronRight, chevronDown, globe, phone, sun, moon, bellAlert, fire, gift, clock, mapPin, route, license, fitness, meal, stock, visitor, water, supplies, errand, file, alert, back, plus, lock, radar, location`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/icons/__tests__/Icon.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Icon, ICON_NAMES } from '@/components/icons';

describe('Icon', () => {
  it('renders a known icon with an accessibility label', () => {
    const { getByLabelText } = render(<Icon name="bus" size={24} color="#000" />);
    expect(getByLabelText('bus')).toBeTruthy();
  });

  it('exposes every role + ui name used by the app', () => {
    for (const n of ['bus','pot','shield','leaf','broom','bell','doc','home','check','globe','phone','sun','moon','mapPin','radar']) {
      expect(ICON_NAMES).toContain(n);
    }
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- Icon.test`
Expected: FAIL — cannot resolve `@/components/icons`.

- [ ] **Step 3: Implement `paths.ts`**

Each entry: `{ viewBox: '0 0 24 24', paths: Array<{ d: string; fill?: boolean; stroke?: boolean }> }`. Use simple, recognisable 24×24 stroke/fill paths (stroke width 2, round caps). Provide a sensible path for every name in the list above. Keep `currentColor` semantics: the `<Icon>` passes `color` to each `<Path>` as `stroke` (for stroke icons) or `fill` (for fill icons).

```ts
// src/components/icons/paths.ts
export interface IconPath { d: string; mode?: 'stroke' | 'fill'; }
export interface IconDef { viewBox: string; paths: IconPath[]; }

// 24x24 grid, stroke icons unless mode:'fill'. Paths are intentionally simple.
export const ICONS = {
  bus: { viewBox: '0 0 24 24', paths: [
    { d: 'M4 6.5C4 5 5 4 6.5 4h11C19 4 20 5 20 6.5V15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5Z' },
    { d: 'M4 11h16' }, { d: 'M7.5 20v-1.5M16.5 20v-1.5' },
    { d: 'M8 14.5h.01M16 14.5h.01', mode: 'fill' },
  ] },
  // ... define EVERY name listed in the task header with comparable paths ...
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];
```

> The executing engineer fills in a path for every required name. Glyphs need only be clear at 20–28px; copy stroke shapes from a standard 24px line-icon vocabulary (Lucide-style). Do not leave any required name undefined — a missing name is a runtime crash on a screen.

- [ ] **Step 4: Implement `Icon.tsx`**

```tsx
// src/components/icons/Icon.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ICONS, type IconName } from './paths';

export interface IconProps { name: IconName; size?: number; color?: string; strokeWidth?: number; }

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000', strokeWidth = 2 }) => {
  const def = ICONS[name];
  return (
    <Svg width={size} height={size} viewBox={def.viewBox} accessibilityLabel={name}>
      {def.paths.map((p, i) =>
        p.mode === 'fill' ? (
          <Path key={i} d={p.d} fill={color} />
        ) : (
          <Path key={i} d={p.d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ),
      )}
    </Svg>
  );
};
```

```ts
// src/components/icons/index.ts
export { Icon } from './Icon';
export type { IconProps } from './Icon';
export { ICON_NAMES } from './paths';
export type { IconName } from './paths';
```

- [ ] **Step 5: Run tests + typecheck, verify pass**

Run: `npm test -- Icon.test && npm run typecheck`
Expected: PASS; tsc clean.

- [ ] **Step 6: Update `theme/roles.ts` icon typing (optional safety)**

Change `RoleConfig.icon: string` → `icon: IconName` and import `IconName`. Run `npm run typecheck` to confirm the 7 role icons (`bus,pot,shield,leaf,broom,bell,doc`) all exist. Fix any missing icon in `paths.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/components/icons src/theme/roles.ts
git commit -m "feat(ui): inline SVG icon set + <Icon> dispatcher"
```

---

## Task 2: i18n strings for all new UI copy

**Files:**
- Modify: `src/i18n/resources/en.json`, `hi.json`, `mr.json`, `ta.json`
- Test: `src/i18n/__tests__/keys.test.ts`

Add every UI string the screens use. Keys (English values shown; provide translations for hi/mr/ta — Marathi/Tamil flagged for native proofread per spec, machine-reasonable translations are acceptable for now and must be present in all four files so no key is missing).

New keys to add to **each** file:
```
"staff": "STAFF",
"splash.tagline": "STAFF",
"login.subtitle": "Sign in to your duty dashboard",
"login.selectRole": "I work as",
"login.mobile": "Mobile number",
"login.sendOtp": "Send OTP & continue",
"login.securedBy": "Secured by SchoolMate · No password needed",
"login.invalidPhone": "Enter a valid 10-digit mobile number",
"common.language": "Language",
"common.retry": "Retry",
"common.viewAll": "View all",
"common.somethingWrong": "Something went wrong",
"common.nothingHere": "Nothing here yet",
"home.shift": "Morning Shift",
"home.timing": "TIMING",
"home.dutyPostLabel": "DUTY POST",
"home.tapCheckIn": "Tap to check in",
"home.checkedInAt": "Checked in at {{time}}",
"home.onDuty": "On duty",
"home.notCheckedIn": "Not checked in",
"home.hoursWeek": "Hours this week",
"home.streak": "On-time streak",
"home.streakDays": "{{n}} days",
"home.leaveLeft": "Leave left",
"home.leaveLeftN": "{{n}} left",
"home.pendingTasks": "Pending tasks",
"home.alert": "Alert",
"role.driver.busRoute": "Bus & route",
"role.driver.license": "License",
"role.driver.fitness": "Fitness",
"role.driver.expiresIn": "Expires in {{n}}d",
"role.driver.ok": "OK",
"role.cook.meals": "Meals today",
"role.cook.menu": "Menu",
"role.cook.lowStock": "Low stock",
"role.guard.gate": "Gate",
"role.guard.rounds": "Rounds",
"role.guard.visitors": "Visitors today",
"role.gardener.zones": "Zones",
"role.gardener.watering": "Watering due",
"role.sweeper.blocks": "Blocks",
"role.sweeper.supplies": "Supplies low",
"role.peon.errands": "Errands",
"role.peon.bellDuty": "Bell duty",
"role.clerk.files": "Pending files",
"role.clerk.requests": "Open requests",
"attendance.title": "Attendance",
"attendance.locating": "Locating you…",
"attendance.inZone": "Inside duty zone",
"attendance.outZone": "{{m}} m away · move closer",
"attendance.accuracy": "Accuracy ±{{m}} m",
"attendance.checkIn": "Check in",
"attendance.checkOut": "Check out",
"attendance.inRange": "In range",
"attendance.outRange": "Out of range",
"attendance.checkedInLog": "Checked in · {{time}} · Inside duty zone",
"attendance.onDutyFor": "On duty for {{elapsed}}",
"nav.home": "Home",
"nav.roster": "Roster",
"nav.tasks": "Tasks",
"nav.me": "Me",
"comingSoon": "Coming soon"
```

- [ ] **Step 1: Write the failing test**

```ts
// src/i18n/__tests__/keys.test.ts
import en from '@/i18n/resources/en.json';
import hi from '@/i18n/resources/hi.json';
import mr from '@/i18n/resources/mr.json';
import ta from '@/i18n/resources/ta.json';

const REQUIRED = ['login.sendOtp','home.tapCheckIn','attendance.checkIn','nav.home','role.cook.meals'];

describe('i18n key parity', () => {
  it('every language has the required new keys', () => {
    for (const dict of [en, hi, mr, ta]) for (const k of REQUIRED) expect(dict).toHaveProperty(k);
  });
  it('all four dictionaries have identical key sets', () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(hi)).toEqual(keys(en));
    expect(keys(mr)).toEqual(keys(en));
    expect(keys(ta)).toEqual(keys(en));
  });
});
```

- [ ] **Step 2: Run test, verify it fails** — Run: `npm test -- keys.test` → FAIL (missing keys / unequal sets).

- [ ] **Step 3: Add all keys** to en/hi/mr/ta (English above; translate for the others; keep proper nouns untranslated). Ensure identical key sets across all four.

- [ ] **Step 4: Run test, verify pass** — Run: `npm test -- keys.test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/resources
git commit -m "feat(i18n): add login/home/attendance/nav strings (en/hi/mr/ta)"
```

---

## Task 3: Core UI primitives + test helper

**Files:**
- Create: `src/components/ui/testUtils.tsx`
- Create: `src/components/ui/Btn.tsx`, `IconBtn.tsx`, `Card.tsx`, `Pill.tsx`, `RolePill.tsx`, `SectionLabel.tsx`, `Avatar.tsx`, `Skeleton.tsx`
- Create: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/primitives.test.tsx`

Public interfaces (freeze these — later tasks import them):

```tsx
// Btn
export interface BtnProps { label: string; onPress: () => void; variant?: 'primary' | 'ghost'; loading?: boolean; disabled?: boolean; accent?: string; icon?: IconName; testID?: string; }
// IconBtn
export interface IconBtnProps { icon: IconName; onPress: () => void; color?: string; bg?: string; size?: number; label: string; testID?: string; }
// Card
export interface CardProps { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; }
// Pill
export interface PillProps { label: string; color: string; bg: string; icon?: IconName; }
// RolePill
export interface RolePillProps { role: Role; }   // reads ROLES + t(labelKey), tinted with accentSoft/accent
// SectionLabel
export interface SectionLabelProps { title: string; actionLabel?: string; onAction?: () => void; }
// Avatar
export interface AvatarProps { name: string; size?: number; ring?: string; }   // initials, optional accent ring
// Skeleton
export interface SkeletonProps { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle>; }
```

- [ ] **Step 1: Write the test helper + failing tests**

```tsx
// src/components/ui/testUtils.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';

export function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
```

```tsx
// src/components/ui/__tests__/primitives.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { Btn, Avatar, Pill, Skeleton } from '@/components/ui';

describe('Btn', () => {
  it('calls onPress when enabled', () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(<Btn label="Go" onPress={onPress} />);
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    const { queryByText, getByTestId } = renderWithTheme(<Btn label="Go" onPress={onPress} loading testID="b" />);
    fireEvent.press(getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    expect(queryByText('Go')).toBeNull(); // spinner replaces label
  });
});

describe('Avatar', () => {
  it('renders initials from a name', () => {
    const { getByText } = renderWithTheme(<Avatar name="Ramesh Kumar" />);
    expect(getByText('RK')).toBeTruthy();
  });
});

describe('Pill', () => {
  it('renders its label', () => {
    const { getByText } = renderWithTheme(<Pill label="On duty" color="#fff" bg="#0E5C4A" />);
    expect(getByText('On duty')).toBeTruthy();
  });
});

describe('Skeleton', () => {
  it('mounts without crashing', () => {
    const { toJSON } = renderWithTheme(<Skeleton width={100} height={12} />);
    expect(toJSON()).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run, verify fail** — Run: `npm test -- primitives.test` → FAIL (no `@/components/ui`).

- [ ] **Step 3: Implement each primitive.** Apply spec shape tokens: button radius 16 / height 54 (primary) / 44 (ghost), card radius 22 + `colors.shadow`, pill radius 100. `Btn` primary fills with `accent ?? role.accent` and shows `<ActivityIndicator color={colors.onPrimary}/>` when `loading` (no label). `Avatar` derives up-to-2 initials, optional `ring` border. `Skeleton` is a `colors.sunken` block with a subtle reanimated opacity pulse (rest opacity 1, animate 0.5↔1). Each file: own `StyleSheet.create`. Export all from `index.ts`.

```ts
// src/components/ui/index.ts (extend in later tasks)
export { Btn } from './Btn'; export type { BtnProps } from './Btn';
export { IconBtn } from './IconBtn'; export type { IconBtnProps } from './IconBtn';
export { Card } from './Card'; export type { CardProps } from './Card';
export { Pill } from './Pill'; export type { PillProps } from './Pill';
export { RolePill } from './RolePill';
export { SectionLabel } from './SectionLabel';
export { Avatar } from './Avatar';
export { Skeleton } from './Skeleton';
```

- [ ] **Step 4: Run tests + typecheck** — Run: `npm test -- primitives.test && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): core primitives (Btn, Card, Pill, Avatar, Skeleton, etc.) + test helper"
```

---

## Task 4: State components (ErrorState, EmptyState) + Ring + Toast

**Files:**
- Create: `src/components/state/ErrorState.tsx`, `EmptyState.tsx`, `index.ts`
- Create: `src/components/ui/Ring.tsx`, `src/components/ui/Toast.tsx`
- Modify: `src/components/ui/index.ts` (export Ring, ToastProvider/useToast)
- Test: `src/components/state/__tests__/state.test.tsx`, `src/components/ui/__tests__/ring.test.tsx`

Interfaces:
```tsx
export interface ErrorStateProps { message?: string; onRetry?: () => void; }
export interface EmptyStateProps { message?: string; icon?: IconName; }
export interface RingProps { value: number; target: number; size?: number; label?: string; sublabel?: string; color?: string; }
// Toast — imperative via context
export interface ToastApi { show: (msg: string, kind?: 'info' | 'error' | 'success') => void; }
export function useToast(): ToastApi;
export const ToastProvider: React.FC<{ children: React.ReactNode }>;
```

- [ ] **Step 1: Failing tests**

```tsx
// src/components/state/__tests__/state.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/components/ui/testUtils';
import { ErrorState, EmptyState } from '@/components/state';

it('ErrorState fires onRetry', () => {
  const onRetry = jest.fn();
  const { getByText } = renderWithTheme(<ErrorState message="Boom" onRetry={onRetry} />);
  fireEvent.press(getByText('Retry'));
  expect(onRetry).toHaveBeenCalled();
});
it('EmptyState shows its message', () => {
  const { getByText } = renderWithTheme(<EmptyState message="Nothing here" />);
  expect(getByText('Nothing here')).toBeTruthy();
});
```

```tsx
// src/components/ui/__tests__/ring.test.tsx
import React from 'react';
import { renderWithTheme } from '../testUtils';
import { Ring } from '@/components/ui';
it('Ring shows its center label', () => {
  const { getByText } = renderWithTheme(<Ring value={34} target={44} label="34" sublabel="of 44" />);
  expect(getByText('34')).toBeTruthy();
});
```

- [ ] **Step 2: Run, verify fail** — `npm test -- state.test ring.test` → FAIL.

- [ ] **Step 3: Implement.** `Ring` = `react-native-svg` `<Circle>` track + progress arc via `strokeDasharray`/`strokeDashoffset` (progress = `value/target` clamped 0–1), center `label`/`sublabel` text. `ErrorState`/`EmptyState` = centered icon (`alert`/`gift`) + message + (Error) a `Btn variant="ghost" label={t('common.retry')}`. `Toast` = context provider holding a queue; `show()` enqueues, renders a reanimated slide-down banner at root, auto-dismiss ~2.2s; color by kind (success/danger/ink). Add `ToastProvider` into `AppProviders` is **not** required for unit tests but will be wired in Task 17.

- [ ] **Step 4: Run tests + typecheck** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/state src/components/ui
git commit -m "feat(ui): ErrorState/EmptyState, Ring, Toast"
```

---

## Task 5: Animated Splash screen + navigation gate

**Files:**
- Create: `src/screens/SplashScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (show Splash first, then Login when unauthenticated)
- Test: `src/screens/__tests__/SplashScreen.test.tsx`

Behaviour (spec §Splash): green radial gradient (`expo-linear-gradient` approximating radial with a vertical primary→primaryDim gradient + two blurred drifting orbs), centered logo mark with two staggered pulse rings, "SchoolMate" (Sora 30/700 white) + `t('staff')` gold letter-spaced, three bouncing dots. Logo scales 0.6→1 + fades over 0.8s; text rises 14px + fades (0.35s delay). Calls `onDone` after ~2200ms; tap anywhere skips immediately. **Resting opacity 1 after entrance** (gotcha).

```tsx
export interface SplashScreenProps { onDone: () => void; }
```

- [ ] **Step 1: Failing test**

```tsx
// src/screens/__tests__/SplashScreen.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/components/ui/testUtils';
import { SplashScreen } from '@/screens/SplashScreen';

jest.useFakeTimers();
it('auto-advances after the splash delay', () => {
  const onDone = jest.fn();
  renderWithTheme(<SplashScreen onDone={onDone} />);
  jest.advanceTimersByTime(2300);
  expect(onDone).toHaveBeenCalledTimes(1);
});
it('skips on tap', () => {
  const onDone = jest.fn();
  const { getByTestId } = renderWithTheme(<SplashScreen onDone={onDone} />);
  fireEvent.press(getByTestId('splash'));
  expect(onDone).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run, verify fail** → `npm test -- SplashScreen.test` FAIL.

- [ ] **Step 3: Implement `SplashScreen.tsx`** using reanimated `useSharedValue`/`withTiming`/`withRepeat`/`withDelay`. Guard `onDone` with a ref so tap + timer don’t double-fire. A `Pressable testID="splash"` covers the screen.

- [ ] **Step 4: Wire into `RootNavigator.tsx`.** Add local `const [splashDone, setSplashDone] = useState(false);`. While `status==='loading'` keep the existing spinner OR show Splash; simplest: when `status !== 'authenticated'` and `!splashDone`, render `<SplashScreen onDone={() => setSplashDone(true)} />` outside the navigator; once done, render the `Login` stack. Keep `Main` for authenticated. (Splash shows once per cold start before Login.)

```tsx
// RootNavigator.tsx — sketch of the change
const [splashDone, setSplashDone] = useState(false);
if (status === 'loading') return <SplashScreen onDone={() => { /* keep showing until auth resolves */ }} />;
if (status !== 'authenticated' && !splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;
// then the existing <Stack.Navigator> with Login vs Main
```

- [ ] **Step 5: Run tests + typecheck + lint** → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/SplashScreen.tsx src/navigation/RootNavigator.tsx src/screens/__tests__/SplashScreen.test.tsx
git commit -m "feat(screen): animated Splash + navigation gate"
```

---

## Task 6: Login screen (brand cap, language picker, role grid, phone, CTA)

**Files:**
- Create: `src/components/ui/BrandCap.tsx`, `LanguagePicker.tsx`, `RoleGrid.tsx`, `PhoneField.tsx`
- Modify: `src/components/ui/index.ts`
- Rewrite: `src/screens/LoginScreen.tsx`
- Test: `src/components/ui/__tests__/login-parts.test.tsx`, `src/screens/__tests__/LoginScreen.test.tsx`

Interfaces:
```tsx
export interface BrandCapProps { schoolName?: string; onPressLanguage: () => void; languageNative: string; }
export interface LanguagePickerProps { visible: boolean; current: LanguageCode; onSelect: (c: LanguageCode) => void; onClose: () => void; }
export interface RoleGridProps { selected: Role; onSelect: (r: Role) => void; }
export interface PhoneFieldProps { value: string; onChangeText: (v: string) => void; accent: string; error?: string; }
```

Phone validation: zod `z.string().regex(/^[6-9]\d{4}\s?\d{5}$/)` on the 10-digit local part (strip spaces). Invalid → show `t('login.invalidPhone')` and disable CTA.

Login flow: role grid selection calls `setRole(r)` (theme) so the whole screen reskins to the accent; CTA calls `login.mutate({ phone, roleKey: selected })`. On success `AuthProvider` flips to authenticated (RootNavigator swaps to Main). Language pick calls `setLanguage(code)` from `@/i18n`.

- [ ] **Step 1: Failing tests**

```tsx
// src/screens/__tests__/LoginScreen.test.tsx
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { LoginScreen } from '@/screens/LoginScreen';

function renderLogin() { return render(<AppProviders><LoginScreen /></AppProviders>); }

it('disables CTA for an invalid phone and enables for a valid one', async () => {
  const { getByTestId } = renderLogin();
  fireEvent.changeText(getByTestId('phone-input'), '123');
  expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(true);
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
});
```

```tsx
// src/components/ui/__tests__/login-parts.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { RoleGrid } from '@/components/ui';

it('RoleGrid selects a role', () => {
  const onSelect = jest.fn();
  const { getByTestId } = renderWithTheme(<RoleGrid selected="driver" onSelect={onSelect} />);
  fireEvent.press(getByTestId('role-cook'));
  expect(onSelect).toHaveBeenCalledWith('cook');
});
```

- [ ] **Step 2: Run, verify fail** → FAIL.

- [ ] **Step 3: Implement the four parts + rewrite `LoginScreen.tsx`.** `BrandCap`: rounded-bottom-30 green gradient (`expo-linear-gradient`), `flexShrink:0`, logo + school name, a language pill (globe + `languageNative` + chevronDown) calling `onPressLanguage`. `LanguagePicker`: rendered at screen root with a full-screen `Pressable` scrim + a card listing `SUPPORTED_LANGUAGES`, selected row tinted + `check`. `RoleGrid`: 4-col tiles from `ROLE_KEYS`, each `testID={`role-${key}`}`, selected fills `ROLES[key].accent` + lifts; icon via `<Icon name={ROLES[key].icon}/>`, label `t(ROLES[key].labelKey)`. `PhoneField`: 58px pill, role-accent `phone` icon, `+91` prefix, numeric keyboard, `testID="phone-input"`. `LoginScreen` composes: BrandCap → greeting `t('login.greeting')` + `t('login.subtitle')` → SectionLabel `t('login.selectRole')` → RoleGrid → PhoneField → `Btn testID="login-cta" label={t('login.sendOtp')} loading={login.isPending} disabled={!valid} accent={ROLES[selected].accent}` → footer shield + `t('login.securedBy')`. Local state: `selected` (init `roleKey`), `phone` (init `'98765 43210'`), `langOpen`. Compute `valid` via zod.

- [ ] **Step 4: Run tests + typecheck + lint** → PASS. (If i18n key fallback shows raw keys in test, assert on testIDs/disabled state, not translated text.)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui src/screens/LoginScreen.tsx src/screens/__tests__/LoginScreen.test.tsx src/components/ui/__tests__/login-parts.test.tsx
git commit -m "feat(screen): production Login (role grid + language picker + phone)"
```

---

## Task 7: Branded Header

**Files:**
- Create: `src/components/ui/Header.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/header.test.tsx`

Spec §Home greeting bar: school logo + school name (from session tenant), avatar, `t('home.goodMorning',{name})`, theme toggle (sun/moon), notification bell with badge.

```tsx
export interface HeaderProps {
  schoolName: string; firstName: string; staffName: string;
  dark: boolean; onToggleTheme: () => void; onPressBell?: () => void; notifications?: number;
}
```

- [ ] **Step 1: Failing test**

```tsx
// header.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { Header } from '@/components/ui';
it('renders school name and toggles theme', () => {
  const onToggle = jest.fn();
  const { getByText, getByLabelText } = renderWithTheme(
    <Header schoolName="Greenfield Public School" firstName="Ramesh" staffName="Ramesh Kumar" dark={false} onToggleTheme={onToggle} />,
  );
  expect(getByText('Greenfield Public School')).toBeTruthy();
  fireEvent.press(getByLabelText('sun'));   // sun shown in light mode -> tap to go dark
  expect(onToggle).toHaveBeenCalled();
});
```

- [ ] **Step 2–4:** Run→fail; implement (logo placeholder = `Avatar` of school initials when no logoUrl, since `Tenant.logoUrl` is optional and seed has none; greeting + name; `IconBtn` sun/moon by `dark`; `IconBtn` bell with a small badge dot when `notifications`); run→pass + typecheck + lint.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Header.tsx src/components/ui/index.ts src/components/ui/__tests__/header.test.tsx
git commit -m "feat(ui): branded auth Header (school identity + theme toggle + bell)"
```

---

## Task 8: Hero "Today" card

**Files:**
- Create: `src/components/ui/HeroTodayCard.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/hero.test.tsx`

Spec §Home hero: role-gradient (green/primary when not checked in, role accent when on duty), date + `t('home.shift')`, live status chip, TIMING + DUTY POST columns. Not checked in → gold `t('home.tapCheckIn')` (pressable → opens Attendance). Checked in → `t('home.checkedInAt',{time})` + elapsed.

```tsx
export interface HeroTodayCardProps {
  firstName: string; timing: string; dutyPostLabel: string; dutyPost: string;
  checkedIn: boolean; checkInAt?: string; onPressCheckIn: () => void;
}
```

- [ ] **Step 1: Failing test**

```tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { HeroTodayCard } from '@/components/ui';
it('shows the check-in prompt and fires onPressCheckIn when not checked in', () => {
  const onPress = jest.fn();
  const { getByTestId } = renderWithTheme(
    <HeroTodayCard firstName="Ramesh" timing="7:30–3:30" dutyPostLabel="DUTY POST" dutyPost="Route 7" checkedIn={false} onPressCheckIn={onPress} />,
  );
  fireEvent.press(getByTestId('hero-checkin'));
  expect(onPress).toHaveBeenCalled();
});
```

- [ ] **Step 2–4:** fail → implement (LinearGradient bg switches on `checkedIn`; `flexShrink:0`; status `Pill`; two labelled columns; `Pressable testID="hero-checkin"` only when `!checkedIn`; when `checkedIn`, show checked-in time + a live `Hh Mm` elapsed timer via `setInterval` formatting `checkInAt`→now) → pass + typecheck + lint.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/HeroTodayCard.tsx src/components/ui/index.ts src/components/ui/__tests__/hero.test.tsx
git commit -m "feat(ui): Home hero Today card (check-in aware + live elapsed)"
```

---

## Task 9: Stat trio

**Files:**
- Create: `src/components/ui/StatTrio.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/stattrio.test.tsx`

Spec §Home stat trio: hours-this-week ring, on-time streak (fire), leave left (gift). Reuses `Ring`.

```tsx
export interface StatTrioProps { hoursThisWeek: number; hoursTarget: number; streakDays: number; leaveLeft: number; }
```

- [ ] **Step 1–4:** Test asserts the three numbers render (`getByText('34')`, streak `t('home.streakDays',{n:21})`→ assert `'21'` substring via `getByText(/21/)`, leave `getByText(/12/)`); implement with `Ring` + two `Card` stats with `fire`/`gift` icons; run→pass + typecheck + lint.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/StatTrio.tsx src/components/ui/index.ts src/components/ui/__tests__/stattrio.test.tsx
git commit -m "feat(ui): Home stat trio (hours ring + streak + leave)"
```

---

## Task 10: Role-specialized cards (7 layouts + dispatcher)

**Files:**
- Create: `src/components/ui/roleCards/RoleSpecializedCard.tsx`
- Create: `src/components/ui/roleCards/{Driver,Cook,Guard,Gardener,Sweeper,Peon,Clerk}Card.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/roleCards.test.tsx`

Dispatcher switches on `roleCard.kind` (discriminated union from `@/data/domain` `RoleCard`) and renders the matching card. Each card is a `Card` with role-accent header icon + the fields named in the spec/i18n (Task 2 keys). The union is exhaustive — a `default: never` assertion guarantees every kind is handled.

```tsx
export interface RoleSpecializedCardProps { roleCard: RoleCard; accent: string; }
```

- [ ] **Step 1: Failing test (one assertion per kind)**

```tsx
import React from 'react';
import { renderWithTheme } from '../testUtils';
import { RoleSpecializedCard } from '@/components/ui';
import type { RoleCard } from '@/data/domain';

const cases: Array<[RoleCard, RegExp]> = [
  [{ kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', licenseExpiresInDays: 24, fitnessOk: true }, /HR-26-BX-4412/],
  [{ kind: 'cook', mealCount: 320, menu: ['Rice'], lowStock: ['Oil'] }, /320/],
  [{ kind: 'guard', gate: 'Main Gate', roundsDone: 3, roundsTotal: 6, visitorsToday: 14 }, /Main Gate/],
  [{ kind: 'gardener', zones: ['Front lawn'], wateringDue: 2 }, /Front lawn/],
  [{ kind: 'sweeper', blocks: ['Block A'], suppliesLow: ['Phenyl'] }, /Block A/],
  [{ kind: 'peon', errands: 4, bellDuty: true }, /4/],
  [{ kind: 'clerk', pendingFiles: 7, requestsOpen: 3 }, /7/],
];

it.each(cases)('renders %s card', (roleCard, re) => {
  const { getByText } = renderWithTheme(<RoleSpecializedCard roleCard={roleCard} accent="#E08A3C" />);
  expect(getByText(re)).toBeTruthy();
});
```

- [ ] **Step 2–4:** fail → implement all 7 cards + exhaustive dispatcher → pass + typecheck (the `never` check enforces exhaustiveness) + lint.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/roleCards src/components/ui/index.ts src/components/ui/__tests__/roleCards.test.tsx
git commit -m "feat(ui): 7 role-specialized Home cards + exhaustive dispatcher"
```

---

## Task 11: Tasks peek + Alert card

**Files:**
- Create: `src/components/ui/TasksPeek.tsx`, `src/components/ui/AlertCard.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/peekAlert.test.tsx`

```tsx
export interface TasksPeekProps { tasks: TaskPeek[]; onViewAll: () => void; }   // TaskPeek from @/data/domain
export interface AlertCardProps { message: string; }
```

- [ ] **Step 1–4:** Test: TasksPeek renders each task title + fires `onViewAll`; AlertCard renders its message. Implement: `SectionLabel title={t('home.pendingTasks')} actionLabel={t('common.viewAll')}` + two read-only task rows (priority dot urgent=danger), AlertCard = gold (`colors.goldSoft` bg, `bell`/`alert` icon). Run→pass + typecheck + lint.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TasksPeek.tsx src/components/ui/AlertCard.tsx src/components/ui/index.ts src/components/ui/__tests__/peekAlert.test.tsx
git commit -m "feat(ui): pending-tasks peek + alert card"
```

---

## Task 12: Home screen assembly

**Files:**
- Rewrite: `src/screens/HomeScreen.tsx`
- Test: `src/screens/__tests__/HomeScreen.test.tsx`

Compose with real data via `useDashboard()` + `useAuth()` (session) + `useTheme()`. States: loading → `Skeleton` stack; error → `ErrorState onRetry={refetch}`; data → `ScrollView` (bottom padding 120) of: `Header`, `HeroTodayCard`, `StatTrio`, `RoleSpecializedCard`, `TasksPeek`, `AlertCard`. Staggered entrance (transform-only, 65ms apart). `onPressCheckIn`/hero/FAB navigate to the Attendance overlay (wired in Task 16/17 — for now accept an `onOpenAttendance` via navigation prop or a no-op until the stack exists; use `navigation.navigate('Attendance')` once Task 16 adds it).

- [ ] **Step 1: Failing test**

```tsx
// HomeScreen.test.tsx
import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { HomeScreen } from '@/screens/HomeScreen';

// Render under providers; AuthProvider starts unauthenticated, so this test
// signs in through the mock first via a small harness, OR mock useDashboard/useAuth.
jest.mock('@/features/dashboard/hooks', () => ({
  useDashboard: () => ({ data: require('@/data/mock/seed').seed && {
    hoursThisWeek: 34, hoursTarget: 44, streakDays: 21, leaveLeft: 12,
    roleCard: { kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', licenseExpiresInDays: 24, fitnessOk: true },
    pendingTasksPeek: [{ id: 't1', title: 'Pre-trip bus inspection', priority: 'urgent', done: false }],
    alert: 'Staff meeting at 4:00 PM',
  }, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/features/auth/AuthProvider', () => ({
  ...jest.requireActual('@/features/auth/AuthProvider'),
  useAuth: () => ({ status: 'authenticated', session: { user: { firstName: 'Ramesh', name: 'Ramesh Kumar', roleKey: 'driver', timing: '7:30–3:30', dutyPost: 'Bus / Route' }, tenant: { id: 'school_greenfield', name: 'Greenfield Public School' } }, signIn: jest.fn(), signOut: jest.fn() }),
}));

it('renders the dashboard with school identity and role card', async () => {
  const { getByText } = render(<AppProviders><HomeScreen navigation={{ navigate: jest.fn() } as any} /></AppProviders>);
  await waitFor(() => expect(getByText('Greenfield Public School')).toBeTruthy());
  expect(getByText(/HR-26-BX-4412/)).toBeTruthy();
});
```

- [ ] **Step 2–4:** fail → implement `HomeScreen` (accept `navigation` prop typed from `@react-navigation`), wire states + components → pass + typecheck + lint. Keep the mock-based test green.

- [ ] **Step 5: Commit**

```bash
git add src/screens/HomeScreen.tsx src/screens/__tests__/HomeScreen.test.tsx
git commit -m "feat(screen): production Home dashboard assembly"
```

---

## Task 13: GeoRadar + CheckInButton

**Files:**
- Create: `src/components/ui/GeoRadar.tsx`, `src/components/ui/CheckInButton.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/checkin.test.tsx`

`GeoRadar` (188, `flexShrink:0`): concentric `react-native-svg` rings + center duty-post pin (role accent) + a "you" dot green inside / red outside; `state: 'locating' | 'in' | 'out'`. `CheckInButton` 184 circle state machine.

```tsx
export interface GeoRadarProps { state: 'locating' | 'in' | 'out'; distanceM?: number; accuracyM?: number; accent: string; }
export type CheckInState = 'locating' | 'out' | 'ready' | 'checkedIn';
export interface CheckInButtonProps { state: CheckInState; busy?: boolean; onPress: () => void; accent: string; }
```

- [ ] **Step 1: Failing test (state machine)**

```tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { CheckInButton } from '@/components/ui';

it('is pressable only when ready or checkedIn', () => {
  const onPress = jest.fn();
  const { getByTestId, rerender } = renderWithTheme(<CheckInButton state="locating" onPress={onPress} accent="#E08A3C" />);
  fireEvent.press(getByTestId('checkin-btn'));
  expect(onPress).not.toHaveBeenCalled();           // disabled while locating
  rerender(<CheckInButton state="ready" onPress={onPress} accent="#E08A3C" />);
  fireEvent.press(getByTestId('checkin-btn'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2–4:** fail → implement. `CheckInButton`: `disabled = state==='locating' || state==='out' || busy`; gradient + pulse rings when `ready`; `sunken` when disabled; red when `checkedIn` (label `t('attendance.checkOut')`), accent label `t('attendance.checkIn')` when ready; show spinner when `busy`. `GeoRadar`: SVG rings, sweep animation when locating. Run→pass + typecheck + lint.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/GeoRadar.tsx src/components/ui/CheckInButton.tsx src/components/ui/index.ts src/components/ui/__tests__/checkin.test.tsx
git commit -m "feat(ui): GeoRadar + CheckInButton state machine"
```

---

## Task 14: Confetti

**Files:**
- Create: `src/components/ui/Confetti.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/confetti.test.tsx`

Reanimated particle burst, fired imperatively.

```tsx
export interface ConfettiHandle { fire: () => void; }
export interface ConfettiProps { count?: number; colors?: string[]; }
// forwardRef<ConfettiHandle, ConfettiProps>
```

- [ ] **Step 1–4:** Test: renders without crashing and exposes `fire()` via ref (`const ref = React.createRef<ConfettiHandle>(); render(<Confetti ref={ref} />); act(() => ref.current?.fire()); expect(...).toBeTruthy();`). Implement N absolutely-positioned particles animating up+out+fade on `fire()` via shared values. Mock reanimated in this test file if needed. Run→pass + typecheck + lint.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Confetti.tsx src/components/ui/index.ts src/components/ui/__tests__/confetti.test.tsx
git commit -m "feat(ui): reanimated confetti burst"
```

---

## Task 15: Attendance screen assembly

**Files:**
- Rewrite: `src/screens/AttendanceScreen.tsx`
- Test: `src/screens/__tests__/AttendanceScreen.test.tsx`

Compose: back header (`t('attendance.title')`), `GeoRadar`, demo range segmented toggle (In range / Out of range, dev/demo affordance), `CheckInButton`, today's log row. Uses `useAttendanceStatus()` + `useCheckIn()` + `useCheckOut()`. Geo: `expo-location` `requestForegroundPermissionsAsync` + `getCurrentPositionAsync` to drive `locating→in/out`; the demo toggle overrides range so the flow is testable without GPS. Tap check-in when `ready` → 650ms spinner → `checkIn.mutate({at: new Date().toISOString(), inZone:true})` → fire `Confetti` → flips to checked-in (red Check out). Helper text reflects state.

- [ ] **Step 1: Failing test**

```tsx
import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { AttendanceScreen } from '@/screens/AttendanceScreen';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 0, longitude: 0, accuracy: 8 } }),
}));
jest.mock('@/features/attendance/hooks', () => ({
  useAttendanceStatus: () => ({ data: { checkedIn: false, lastLog: [], dutyPost: 'Bus / Route', geofenceRadiusM: 120 }, isLoading: false, refetch: jest.fn() }),
  useCheckIn: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(async () => {}), isPending: false }),
  useCheckOut: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(async () => {}), isPending: false }),
}));

it('lets the user force "in range" and enables check-in', async () => {
  const { getByTestId } = render(<AppProviders><AttendanceScreen navigation={{ goBack: jest.fn() } as any} /></AppProviders>);
  fireEvent.press(getByTestId('demo-in-range'));
  await waitFor(() => expect(getByTestId('checkin-btn').props.accessibilityState?.disabled).toBe(false));
});
```

- [ ] **Step 2–4:** fail → implement → pass + typecheck + lint. Use a `useRef` `Confetti` to fire on successful mutation.

- [ ] **Step 5: Commit**

```bash
git add src/screens/AttendanceScreen.tsx src/screens/__tests__/AttendanceScreen.test.tsx
git commit -m "feat(screen): production Attendance (geo radar + check-in + confetti)"
```

---

## Task 16: Floating TabBar + center FAB + Attendance overlay route

**Files:**
- Create: `src/components/ui/TabBar.tsx`
- Modify: `src/navigation/MainTabNavigator.tsx` (custom `tabBar`, add center check-in FAB, wrap in a stack that has the Attendance overlay)
- Modify: `src/navigation/types.ts` (add the Main stack with `Tabs` + `Attendance`)
- Test: `src/components/ui/__tests__/tabbar.test.tsx`

Spec §nav: frosted floating bar 26px from bottom, 14px insets, 26px radius; 4 tabs (Home/Roster/Tasks/Me) with a center 60px role-accent check-in FAB (pulse ring); active item uses role accent + heavier icon. Attendance pushes as a right-side overlay that hides the nav.

Restructure: `MainTabNavigator` becomes a native-stack with `Tabs` (the bottom-tab navigator using a custom `TabBar`) and `Attendance` (overlay, `presentation: 'card'`, slide from right, `headerShown:false`). The FAB and Home’s check-in both `navigation.navigate('Attendance')`.

```tsx
export interface TabBarProps { state: any; navigation: any; descriptors: any; onPressFab: () => void; } // BottomTabBarProps-compatible
export type MainStackParamList = { Tabs: undefined; Attendance: undefined };
```

- [ ] **Step 1: Failing test**

```tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { TabBar } from '@/components/ui';

const state = { index: 0, routes: [{ key: 'Home', name: 'Home' }, { key: 'Roster', name: 'Roster' }, { key: 'Tasks', name: 'Tasks' }, { key: 'Me', name: 'Me' }] };
const descriptors = Object.fromEntries(state.routes.map(r => [r.key, { options: {} }]));

it('fires the center FAB', () => {
  const onPressFab = jest.fn();
  const navigation = { navigate: jest.fn(), emit: () => ({ defaultPrevented: false }) };
  const { getByTestId } = renderWithTheme(<TabBar state={state as any} navigation={navigation as any} descriptors={descriptors as any} onPressFab={onPressFab} />);
  fireEvent.press(getByTestId('tab-fab'));
  expect(onPressFab).toHaveBeenCalled();
});
```

- [ ] **Step 2–4:** fail → implement `TabBar` (icons `home/roster/tasks/user` + center `plus`/`check` FAB) and restructure the navigator + types → pass + typecheck + lint. Update `RootNavigator`’s `Main` screen to the new stack component. Update `navigation/types.ts` `RootStackParamList.Main` to host `MainStackParamList`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TabBar.tsx src/navigation
git commit -m "feat(nav): floating TabBar + check-in FAB + Attendance overlay route"
```

---

## Task 17: Final integration, ToastProvider wiring, full verification

**Files:**
- Modify: `src/providers/AppProviders.tsx` (add `ToastProvider` inside the tree)
- Modify: stub screens copy (`RosterScreen`, `TasksScreen`, `ProfileScreen` → use `t('comingSoon')` via existing `StubScreen`, no structural change required)
- Test: `src/__tests__/integration.test.tsx` (login → home smoke through the mock data source)

- [ ] **Step 1: Wire `ToastProvider`** into `AppProviders` (inside `RepositoryProvider`/`AuthProvider` so screens can `useToast()`), per the spec provider order. Confirm `AttendanceScreen` error rollback shows a toast.

- [ ] **Step 2: Integration smoke test**

```tsx
// src/__tests__/integration.test.tsx
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { RootNavigator } from '@/navigation/RootNavigator';
import { NavigationContainer } from '@react-navigation/native';

it('signs in through the mock and lands on Home with school identity', async () => {
  const { getByTestId, findByText } = render(
    <AppProviders><NavigationContainer><RootNavigator /></NavigationContainer></AppProviders>,
  );
  // Skip splash, fill phone, submit (selected role defaults to driver)
  // (advance timers / press splash, then press login-cta)
  // Assert school name appears post-login:
  expect(await findByText('Greenfield Public School', {}, { timeout: 5000 })).toBeTruthy();
});
```

> If splash fake-timers complicate this integration test, drive it by pressing `testID="splash"` then `testID="login-cta"`. Keep the assertion on the post-login school name.

- [ ] **Step 3: Full verification suite**

```bash
npm test
npm run typecheck
npm run lint
npx expo export --platform web
```
Expected: all suites green; tsc clean; eslint clean (pre-existing benign test-file warnings acceptable); web export completes.

- [ ] **Step 4: Update docs + memory pointer**

Append a "Plans 3 & 4 complete" status line to the spec or a short `docs/superpowers/plans/` note; update the project memory STATUS line.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete production UI (Splash/Login/Home/Attendance) — Plans 3 & 4"
```

---

## Self-Review (run before execution)

- **Spec coverage:** Splash (T5), Login role grid + language + phone + CTA + footer (T6), Home header/hero/stat-trio/role-cards/tasks-peek/alert (T7–T12), Attendance geo-radar/range-toggle/check-in/confetti/log (T13–T15), nav tabs + FAB + overlay (T16), i18n 4-lang (T2), icons (T1), states/skeletons (T4), role-driven content for all 7 roles (T10). ✓
- **Type consistency:** `RoleCard` union consumed in T10 matches `@/data/domain/dashboard.ts`. Hooks consumed (`useDashboard/useAttendanceStatus/useCheckIn/useCheckOut/useLogin/useAuth`) match existing signatures. `IconName` introduced in T1 and reused in `roles.ts`. ✓
- **Frozen contract:** no domain/repository/seed changes — UI reads existing shapes only. ✓
- **Known risk:** reanimated under jest may need `react-native-reanimated/mock` per-file; noted in Conventions. expo-location mocked in the Attendance test. Splash fake timers noted for the integration test.
```
