# Staff App — Plan 5: Role Refactor (6 roles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refocus the staff app's role set to the 6 roles the business runs — Bus Driver, Conductor (new), Cleaner, Gardener, Security Guard, Peon — by adding `conductor`, removing `cook` and `clerk`, and relabelling three existing roles.

**Architecture:** `theme/roles.ts` is the single source of truth; the Login grid, accents, duty posts, and Home role cards all derive from it. We **keep the existing role keys** (`driver`, `guard`, `sweeper`) and change only their i18n labels (smaller, safer than renaming keys, since `labelKey` already decouples display text from key). `conductor` is the one genuinely new key. `cook`/`clerk` and their cards are deleted. TypeScript's `Record<Role, …>` completeness and the exhaustive `switch` make the compiler catch every missed reference.

**Key decision — relabel, don't rename keys:** This deviates (intentionally, for safety) from the spec's "explicit keys" suggestion. Display names live in i18n: `role.guard` → "Security Guard", `role.sweeper` → "Cleaner", `role.driver` → "Bus Driver" (already is). The keys `guard`/`sweeper`/`driver` stay so the domain types, seed, cards, and dozens of tests don't churn. The spec's Decisions table is updated to match in Task 0.

**Tech Stack:** Expo SDK 54, React 19, RN 0.81, TypeScript, react-i18next, Jest + React Native Testing Library.

**Final role set & display labels:**

| key (unchanged) | en label | accent | icon | roleCardKind |
| --- | --- | --- | --- | --- |
| `driver` | Bus Driver | `#E08A3C` | `bus` | `driver` |
| `conductor` *(new)* | Conductor | `#C2567E` | `visitor` | `conductor` |
| `sweeper` | Cleaner | `#23A79C` | `broom` | `sweeper` |
| `gardener` | Gardener | `#4C9E55` | `leaf` | `gardener` |
| `guard` | Security Guard | `#3B7FD4` | `shield` | `guard` |
| `peon` | Peon | `#8A6ED4` | `bell` | `peon` |

Display order (Login grid) = the table order above.

**Conductor role card data shape (seed value used throughout this plan):**
`{ kind: 'conductor', routeName: 'Route 7', onBoard: 18, capacity: 24, nextStop: 'Sector 12' }`

---

### Task 0: Reconcile the spec with the relabel decision

**Files:**
- Modify: `docs/superpowers/specs/2026-06-12-staff-app-six-roles-and-live-trip-design.md`

- [ ] **Step 1: Update the Decisions table + Role refactor section**

In the Decisions table, change the "Role mapping" row to read:

```
| Role mapping | KEEP keys `driver`/`guard`/`sweeper`; relabel via i18n (`driver`→"Bus Driver", `guard`→"Security Guard", `sweeper`→"Cleaner"). Add `conductor` key. Remove `cook`+`clerk`. |
```

In the "Role refactor" section, replace the bullet that says to update the `Role` union to explicit keys with:

```
- Keep the `Role` union keys `driver`/`guard`/`sweeper`/`gardener`/`peon`; add `conductor`; remove `cook`+`clerk`. Display names change only in i18n (`role.driver`="Bus Driver", `role.guard`="Security Guard", `role.sweeper`="Cleaner").
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-12-staff-app-six-roles-and-live-trip-design.md
git commit -m "docs: reconcile spec with relabel-not-rename role decision"
```

---

### Task 1: Role config — `theme/roles.ts`

**Files:**
- Modify: `src/theme/roles.ts`
- Test: `src/theme/__tests__/roles.test.ts`

- [ ] **Step 1: Update the test to the new 6-role set (failing)**

Replace the whole body of `src/theme/__tests__/roles.test.ts` with:

```ts
import { ROLES, ROLE_KEYS, type Role } from '@/theme/roles';

describe('ROLES', () => {
  it('defines exactly the 6 business roles in display order', () => {
    expect(ROLE_KEYS).toEqual([
      'driver', 'conductor', 'sweeper', 'gardener', 'guard', 'peon',
    ]);
  });
  it('does not include the removed cook or clerk roles', () => {
    expect(ROLE_KEYS).not.toContain('cook');
    expect(ROLE_KEYS).not.toContain('clerk');
  });
  it('each role has accent, icon, dutyPost label key, and a card kind matching its key', () => {
    (ROLE_KEYS as readonly Role[]).forEach((k) => {
      const r = ROLES[k];
      expect(r.key).toBe(k);
      expect(r.accent).toMatch(/^#/);
      expect(r.accentSoft).toMatch(/^#/);
      expect(typeof r.icon).toBe('string');
      expect(typeof r.labelKey).toBe('string');
      expect(typeof r.dutyPostLabelKey).toBe('string');
      expect(r.roleCardKind).toBe(k);
    });
  });
  it('driver uses the handoff accent and conductor has its own accent', () => {
    expect(ROLES.driver.accent).toBe('#E08A3C');
    expect(ROLES.conductor.accent).toBe('#C2567E');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/theme/__tests__/roles.test.ts`
Expected: FAIL (`ROLE_KEYS` still contains `cook`/`clerk`; `ROLES.conductor` is undefined).

- [ ] **Step 3: Rewrite `src/theme/roles.ts`**

```ts
import type { IconName } from '@/components/icons';

export const ROLE_KEYS = [
  'driver', 'conductor', 'sweeper', 'gardener', 'guard', 'peon',
] as const;

export type Role = (typeof ROLE_KEYS)[number];

export interface RoleConfig {
  key: Role;
  labelKey: string;
  icon: IconName;
  accent: string;
  accentSoft: string;
  dutyPostLabelKey: string;
  roleCardKind: Role;
}

export const ROLES: Record<Role, RoleConfig> = {
  driver: {
    key: 'driver', labelKey: 'role.driver', icon: 'bus',
    accent: '#E08A3C', accentSoft: '#FBE7CC', dutyPostLabelKey: 'dutyPost.driver', roleCardKind: 'driver',
  },
  conductor: {
    key: 'conductor', labelKey: 'role.conductor', icon: 'visitor',
    accent: '#C2567E', accentSoft: '#F6D6E4', dutyPostLabelKey: 'dutyPost.conductor', roleCardKind: 'conductor',
  },
  sweeper: {
    key: 'sweeper', labelKey: 'role.sweeper', icon: 'broom',
    accent: '#23A79C', accentSoft: '#CCECE8', dutyPostLabelKey: 'dutyPost.sweeper', roleCardKind: 'sweeper',
  },
  gardener: {
    key: 'gardener', labelKey: 'role.gardener', icon: 'leaf',
    accent: '#4C9E55', accentSoft: '#D6ECD6', dutyPostLabelKey: 'dutyPost.gardener', roleCardKind: 'gardener',
  },
  guard: {
    key: 'guard', labelKey: 'role.guard', icon: 'shield',
    accent: '#3B7FD4', accentSoft: '#D2E2F7', dutyPostLabelKey: 'dutyPost.guard', roleCardKind: 'guard',
  },
  peon: {
    key: 'peon', labelKey: 'role.peon', icon: 'bell',
    accent: '#8A6ED4', accentSoft: '#E2D9F6', dutyPostLabelKey: 'dutyPost.peon', roleCardKind: 'peon',
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/theme/__tests__/roles.test.ts`
Expected: PASS. (TypeScript will now flag `cook`/`clerk` errors elsewhere — fixed in later tasks.)

- [ ] **Step 5: Commit**

```bash
git add src/theme/roles.ts src/theme/__tests__/roles.test.ts
git commit -m "refactor(roles): 6-role set — add conductor, drop cook/clerk"
```

---

### Task 2: Domain `RoleCard` union — `data/domain/dashboard.ts`

**Files:**
- Modify: `src/data/domain/dashboard.ts:8-15`

- [ ] **Step 1: Replace the `RoleCard` union**

Replace lines 8-15 (the `export type RoleCard = …` block) with:

```ts
export type RoleCard =
  | { kind: 'driver'; busNo: string; routeName: string; licenseExpiresInDays: number; fitnessOk: boolean }
  | { kind: 'conductor'; routeName: string; onBoard: number; capacity: number; nextStop: string }
  | { kind: 'guard'; gate: string; roundsDone: number; roundsTotal: number; visitorsToday: number }
  | { kind: 'gardener'; zones: string[]; wateringDue: number }
  | { kind: 'sweeper'; blocks: string[]; suppliesLow: string[] }
  | { kind: 'peon'; errands: number; bellDuty: boolean };
```

- [ ] **Step 2: Run typecheck to confirm the dependent errors are now about the consumers**

Run: `npm run typecheck`
Expected: FAIL — errors in `RoleSpecializedCard.tsx` (missing `conductor` case / stale `cook`,`clerk` cases) and `seed.ts` (`Record<Role,RoleCard>` missing `conductor`, extra `cook`/`clerk`). These are fixed in Tasks 3–4.

- [ ] **Step 3: Commit**

```bash
git add src/data/domain/dashboard.ts
git commit -m "refactor(domain): RoleCard — add conductor variant, drop cook/clerk"
```

---

### Task 3: Conductor card component + wire the switch

**Files:**
- Create: `src/components/ui/roleCards/ConductorCard.tsx`
- Delete: `src/components/ui/roleCards/CookCard.tsx`, `src/components/ui/roleCards/ClerkCard.tsx`
- Modify: `src/components/ui/roleCards/RoleSpecializedCard.tsx`
- Test: `src/components/ui/__tests__/roleCards.test.tsx`

- [ ] **Step 1: Update the role-card render test (failing)**

Replace the `cases` array (lines 6-14) in `src/components/ui/__tests__/roleCards.test.tsx` with:

```ts
const cases: [RoleCard, RegExp][] = [
  [{ kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', licenseExpiresInDays: 24, fitnessOk: true }, /HR-26-BX-4412/],
  [{ kind: 'conductor', routeName: 'Route 7', onBoard: 18, capacity: 24, nextStop: 'Sector 12' }, /Sector 12/],
  [{ kind: 'guard', gate: 'Main Gate', roundsDone: 3, roundsTotal: 6, visitorsToday: 14 }, /Main Gate/],
  [{ kind: 'gardener', zones: ['Front lawn'], wateringDue: 2 }, /Front lawn/],
  [{ kind: 'sweeper', blocks: ['Block A'], suppliesLow: ['Phenyl'] }, /Block A/],
  [{ kind: 'peon', errands: 4, bellDuty: true }, /4/],
];
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/ui/__tests__/roleCards.test.tsx`
Expected: FAIL (no `conductor` case in `RoleSpecializedCard`; `Sector 12` not rendered).

- [ ] **Step 3: Create `ConductorCard.tsx`**

```tsx
// src/components/ui/roleCards/ConductorCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Icon } from '@/components/icons';

interface ConductorCardProps {
  routeName: string;
  onBoard: number;
  capacity: number;
  nextStop: string;
  accent: string;
}

export const ConductorCard: React.FC<ConductorCardProps> = ({
  routeName,
  onBoard,
  capacity,
  nextStop,
  accent,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card>
      <View style={styles.header}>
        <Icon name="visitor" size={20} color={accent} strokeWidth={2} />
        <Text style={[TextScale.cardTitle, styles.headerText, { color: accent }]}>
          {t('role.conductor')}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
          {t('role.conductor.route')}
        </Text>
        <Text style={[TextScale.body, { color: colors.ink }]}>
          {routeName}
        </Text>
      </View>

      <View style={styles.pillRow}>
        <Pill
          label={`${t('role.conductor.onBoard')} · ${onBoard}/${capacity}`}
          color={colors.primary}
          bg={colors.primaryDim}
          icon="visitor"
        />
        <Pill
          label={`${t('role.conductor.nextStop')} · ${nextStop}`}
          color={accent}
          bg={colors.surface2}
          icon="mapPin"
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  row: {
    gap: 2,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
```

Note: `colors.surface2` and `colors.primaryDim`/`colors.dangerSoft` are used by sibling cards (see `DriverCard.tsx`), so they exist on the theme. If `npm run typecheck` flags `surface2`, substitute `colors.sunken` (also present).

- [ ] **Step 4: Rewrite `RoleSpecializedCard.tsx` (swap cook/clerk imports+cases for conductor)**

```tsx
// src/components/ui/roleCards/RoleSpecializedCard.tsx
import React from 'react';
import type { RoleCard } from '@/data/domain';
import { DriverCard } from './DriverCard';
import { ConductorCard } from './ConductorCard';
import { GuardCard } from './GuardCard';
import { GardenerCard } from './GardenerCard';
import { SweeperCard } from './SweeperCard';
import { PeonCard } from './PeonCard';

export interface RoleSpecializedCardProps {
  roleCard: RoleCard;
  accent: string;
}

export const RoleSpecializedCard: React.FC<RoleSpecializedCardProps> = ({ roleCard, accent }) => {
  switch (roleCard.kind) {
    case 'driver':
      return (
        <DriverCard
          busNo={roleCard.busNo}
          routeName={roleCard.routeName}
          licenseExpiresInDays={roleCard.licenseExpiresInDays}
          fitnessOk={roleCard.fitnessOk}
          accent={accent}
        />
      );
    case 'conductor':
      return (
        <ConductorCard
          routeName={roleCard.routeName}
          onBoard={roleCard.onBoard}
          capacity={roleCard.capacity}
          nextStop={roleCard.nextStop}
          accent={accent}
        />
      );
    case 'guard':
      return (
        <GuardCard
          gate={roleCard.gate}
          roundsDone={roleCard.roundsDone}
          roundsTotal={roleCard.roundsTotal}
          visitorsToday={roleCard.visitorsToday}
          accent={accent}
        />
      );
    case 'gardener':
      return (
        <GardenerCard
          zones={roleCard.zones}
          wateringDue={roleCard.wateringDue}
          accent={accent}
        />
      );
    case 'sweeper':
      return (
        <SweeperCard
          blocks={roleCard.blocks}
          suppliesLow={roleCard.suppliesLow}
          accent={accent}
        />
      );
    case 'peon':
      return (
        <PeonCard
          errands={roleCard.errands}
          bellDuty={roleCard.bellDuty}
          accent={accent}
        />
      );
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustive: never = roleCard;
      return null;
    }
  }
};
```

- [ ] **Step 5: Delete the cook & clerk card files**

```bash
git rm src/components/ui/roleCards/CookCard.tsx src/components/ui/roleCards/ClerkCard.tsx
```

- [ ] **Step 6: Check `components/ui/index.ts` for stale exports**

Run: `grep -n "CookCard\|ClerkCard" src/components/ui/index.ts`
If either is exported, remove those export lines. (If the grep returns nothing, skip.)

- [ ] **Step 7: Run the test + typecheck**

Run: `npm test -- src/components/ui/__tests__/roleCards.test.tsx`
Expected: PASS.
Run: `npm run typecheck`
Expected: remaining errors only in `src/data/mock/seed.ts` (fixed next).

- [ ] **Step 8: Commit**

```bash
git add -A src/components/ui
git commit -m "feat(roleCards): add ConductorCard, remove Cook/Clerk cards"
```

---

### Task 4: Mock seed — `data/mock/seed.ts`

**Files:**
- Modify: `src/data/mock/seed.ts`
- Test: `src/data/mock/__tests__/repos.test.ts`

- [ ] **Step 1: Update the mock-repo tests off the removed `cook` role (failing)**

In `src/data/mock/__tests__/repos.test.ts`:

Replace lines 24-30 (the "login sets the chosen role" test) with:

```ts
  it('login sets the chosen role and returns a session', async () => {
    const store = await createStore();
    const session = await mockAuth(store).login('98765 43210', 'conductor');
    expect(session.user.roleKey).toBe('conductor');
    expect(session.user.dutyPost).toBe('Bus / Students');
    expect(session.tenant.name).toBe('Greenfield Public School');
  });
```

Replace lines 46-58 (the "does not alias" test — must use a role whose card has an array field; `gardener.zones` qualifies) with:

```ts
  it('dashboard result does not alias store-internal arrays', async () => {
    const store = await createStore();
    await mockAuth(store).login('98765 43210', 'gardener');
    const dash1 = await mockDashboard(store).get();
    if (dash1.roleCard.kind === 'gardener') {
      dash1.roleCard.zones.push('Rooftop');
    }
    const dash2 = await mockDashboard(store).get();
    // The mutation to dash1 must not leak into a fresh read.
    if (dash2.roleCard.kind === 'gardener') {
      expect(dash2.roleCard.zones).not.toContain('Rooftop');
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/data/mock/__tests__/repos.test.ts`
Expected: FAIL (seed still keys `cook`/`clerk`, and `dutyPostByRole.conductor` is `undefined` → dutyPost assertion fails / TS error).

- [ ] **Step 3: Update `seed.ts` — `dutyPostByRole` and `roleCards`**

Replace `dutyPostByRole` (lines 4-12) with:

```ts
export const dutyPostByRole: Record<Role, string> = {
  driver: 'Bus / Route',
  conductor: 'Bus / Students',
  sweeper: 'Block / Area',
  gardener: 'Grounds / Zone',
  guard: 'Gate / Post',
  peon: 'Office / Desk',
};
```

Replace `roleCards` (lines 33-41) with:

```ts
const roleCards: Record<Role, RoleCard> = {
  driver: { kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', licenseExpiresInDays: 24, fitnessOk: true },
  conductor: { kind: 'conductor', routeName: 'Route 7', onBoard: 18, capacity: 24, nextStop: 'Sector 12' },
  sweeper: { kind: 'sweeper', blocks: ['Block A', 'Block B'], suppliesLow: ['Phenyl'] },
  gardener: { kind: 'gardener', zones: ['Front lawn', 'Playground'], wateringDue: 2 },
  guard: { kind: 'guard', gate: 'Main Gate', roundsDone: 3, roundsTotal: 6, visitorsToday: 14 },
  peon: { kind: 'peon', errands: 4, bellDuty: true },
};
```

(The seeded `staff.roleKey` stays `'driver'` and `staff.dutyPost` stays `dutyPostByRole.driver` — unchanged.)

- [ ] **Step 4: Run the test + typecheck**

Run: `npm test -- src/data/mock/__tests__/repos.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: PASS (no more `Record<Role>` completeness errors).

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/seed.ts src/data/mock/__tests__/repos.test.ts
git commit -m "refactor(seed): conductor role card + duty posts for 6 roles"
```

---

### Task 5: i18n — relabel + add conductor + drop cook/clerk (all 4 languages)

**Files:**
- Modify: `src/i18n/resources/en.json`, `hi.json`, `mr.json`, `ta.json`
- Test: `src/i18n/__tests__/keys.test.ts`

The `keys.test.ts` "identical key sets" assertion means **every** language must gain and lose the **same** keys. Remove these 9 keys from each file: `role.cook`, `role.clerk`, `role.cook.meals`, `role.cook.menu`, `role.cook.lowStock`, `role.clerk.files`, `role.clerk.requests`, `dutyPost.cook`, `dutyPost.clerk`. Add these 5 keys to each file: `role.conductor`, `role.conductor.route`, `role.conductor.onBoard`, `role.conductor.nextStop`, `dutyPost.conductor`. Relabel `role.guard` and `role.sweeper`.

- [ ] **Step 1: Update the i18n key-parity test (failing)**

In `src/i18n/__tests__/keys.test.ts`, change the `REQUIRED` array (line 8) to reference a surviving key:

```ts
const REQUIRED = ['login.sendOtp','home.tapCheckIn','attendance.checkIn','nav.home','role.conductor.onBoard'];
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/i18n/__tests__/keys.test.ts`
Expected: FAIL (`role.conductor.onBoard` missing in all four dicts).

- [ ] **Step 3: Edit `en.json`**

- Change `"role.guard": "Watchman"` → `"role.guard": "Security Guard"`.
- Change `"role.sweeper": "Sweeper"` → `"role.sweeper": "Cleaner"`.
- Delete the 9 cook/clerk keys listed above.
- After the `"role.driver.ok"` line, add the conductor label group:

```json
  "role.conductor": "Conductor",
  "role.conductor.route": "Route",
  "role.conductor.onBoard": "On board",
  "role.conductor.nextStop": "Next stop",
```

- In the `dutyPost.*` block, add `"dutyPost.conductor": "Bus / Students",`.

- [ ] **Step 4: Edit `hi.json`** (same key adds/removes; Hindi values)

- `"role.guard"` → `"सुरक्षा गार्ड"`; `"role.sweeper"` → `"सफाई कर्मचारी"`.
- Delete the same 9 cook/clerk keys.
- Add:

```json
  "role.conductor": "कंडक्टर",
  "role.conductor.route": "रूट",
  "role.conductor.onBoard": "सवार",
  "role.conductor.nextStop": "अगला स्टॉप",
```

- Add `"dutyPost.conductor": "बस / छात्र",`.

- [ ] **Step 5: Edit `mr.json`** (Marathi — flagged for native-speaker proofread)

- `"role.guard"` → `"सुरक्षा रक्षक"`; `"role.sweeper"` → `"स्वच्छता कर्मचारी"`.
- Delete the same 9 cook/clerk keys.
- Add:

```json
  "role.conductor": "वाहक",
  "role.conductor.route": "मार्ग",
  "role.conductor.onBoard": "चढलेले",
  "role.conductor.nextStop": "पुढील थांबा",
```

- Add `"dutyPost.conductor": "बस / विद्यार्थी",`.

- [ ] **Step 6: Edit `ta.json`** (Tamil — flagged for native-speaker proofread)

- `"role.guard"` → `"பாதுகாப்பு காவலர்"`; `"role.sweeper"` → `"துப்புரவாளர்"`.
- Delete the same 9 cook/clerk keys.
- Add:

```json
  "role.conductor": "நடத்துநர்",
  "role.conductor.route": "வழி",
  "role.conductor.onBoard": "ஏறியவர்",
  "role.conductor.nextStop": "அடுத்த நிறுத்தம்",
```

- Add `"dutyPost.conductor": "பேருந்து / மாணவர்கள்",`.

- [ ] **Step 7: Run the i18n suite to verify it passes**

Run: `npm test -- src/i18n`
Expected: PASS — `keys.test.ts` confirms all four dictionaries have identical key sets and the required keys exist.

- [ ] **Step 8: Commit**

```bash
git add src/i18n
git commit -m "i18n(roles): relabel guard/sweeper, add conductor, drop cook/clerk (4 langs)"
```

---

### Task 6: Sweep remaining `cook` references in tests

The remaining `cook` usages are in tests that pick a role to log in/select. Swap each to a surviving role (`conductor`, except mapper/store tests where any valid role works).

**Files:**
- Modify: `src/theme/__tests__/ThemeProvider.test.tsx`, `src/features/auth/__tests__/AuthProvider.test.tsx`, `src/data/http/__tests__/mappers.test.ts`, `src/data/mock/__tests__/store.test.ts`, `src/components/ui/__tests__/login-parts.test.tsx`

- [ ] **Step 1: `ThemeProvider.test.tsx`**

- Line 26: `testID="cook" onPress={() => setRole('cook')}` → `testID="conductor" onPress={() => setRole('conductor')}`.
- Line 47: `screen.getByTestId('cook')` → `screen.getByTestId('conductor')`.
- Line 48: `toHaveTextContent('cook')` → `toHaveTextContent('conductor')`.

- [ ] **Step 2: `AuthProvider.test.tsx`**

- Line 38: `signIn('98765 43210', 'cook')` → `signIn('98765 43210', 'conductor')`.
- Line 67: `toHaveTextContent('cook')` → `toHaveTextContent('conductor')`.

- [ ] **Step 3: `mappers.test.ts`**

- Line 24: change `role_key: 'cook'` → `role_key: 'conductor'` and `duty_post: 'Kitchen / Mess'` → `duty_post: 'Bus / Students'`.
- Line 29: `expect(s.user.roleKey).toBe('cook')` → `toBe('conductor')`.

- [ ] **Step 4: `store.test.ts`**

- Line 30: `store.session.user.roleKey = 'cook'` → `= 'conductor'`.
- Line 33: `toBe('cook')` → `toBe('conductor')`.

- [ ] **Step 5: `login-parts.test.tsx`**

- Line 9: `getByTestId('role-cook')` → `getByTestId('role-conductor')`.
- Line 10: `toHaveBeenCalledWith('cook')` → `toHaveBeenCalledWith('conductor')`.

- [ ] **Step 6: Confirm no `cook`/`clerk` references remain**

Run: `grep -rn "cook\|clerk\|'role-cook'" src`
Expected: no matches (empty output).

- [ ] **Step 7: Commit**

```bash
git add src/theme/__tests__/ThemeProvider.test.tsx src/features/auth/__tests__/AuthProvider.test.tsx src/data/http/__tests__/mappers.test.ts src/data/mock/__tests__/store.test.ts src/components/ui/__tests__/login-parts.test.tsx
git commit -m "test: swap cook role references to conductor across suites"
```

---

### Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all suites PASS (the suite was 112 tests/43 suites; count may differ by ±1 from the case edits, all green).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors (pre-existing benign test-file warnings are acceptable).

- [ ] **Step 4: Web export smoke build**

Run: `npx expo export --platform web`
Expected: succeeds ("Exported … modules").

- [ ] **Step 5: Final commit (if anything was touched by lint --fix)**

```bash
git add -A
git commit -m "chore: role refactor verification — suite/typecheck/lint/export green" --allow-empty
```

---

## Self-Review

- **Spec coverage:** Role refactor section of the spec — 6 roles ✓ (Task 1), conductor added ✓ (Tasks 1/3/4/5), cook+clerk removed ✓ (Tasks 1–6), ConductorCard ✓ (Task 3), RoleCard union updated ✓ (Task 2), i18n in 4 languages ✓ (Task 5), Login grid auto-updates from `ROLE_KEYS` (no code change needed — `RoleGrid` maps `ROLE_KEYS`). Marathi/Tamil proofread flag preserved ✓.
- **Placeholder scan:** none — every step has concrete code/edits/commands.
- **Type consistency:** `roleCardKind`/`kind` values match the `Role` keys; the conductor card shape `{routeName,onBoard,capacity,nextStop}` is identical in the domain union (Task 2), the component props (Task 3), the seed (Task 4), and the test case (Task 3). Duty post `'Bus / Students'` matches between seed (Task 4) and the mock/mapper tests (Tasks 4/6).
- **Scope:** isolated to the role set; does not touch the frozen `src/data` repository contract beyond the additive `RoleCard` union edit, the Trip feature, or the stub screens (those are Plans 6 & 7).

## Out of scope (this plan)

- The Trip / live-location feature (Plan 6).
- Finishing Roster / Leave / Tasks / Profile screens (Plan 7).
- Renaming role keys to explicit names (deliberately rejected — see header).
