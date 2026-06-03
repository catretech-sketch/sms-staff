# SchoolMate Staff — Plan 2: Data Layer & Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the swappable mock→HTTP data layer and a real auth flow on top of the Plan 1 foundation, so login works end-to-end (mock now, one-flag swap to a REST API later) and dashboard/attendance data is read/written through repository hooks.

**Architecture:** Ports & adapters — domain types are the stable contract; `MockAdapter` (in-memory store + AsyncStorage persistence + simulated latency) and `HttpAdapter` (REST + DTO mappers) both implement the same `Repositories` interface; a factory picks one via `env.DATA_SOURCE`. TanStack Query hooks are the only thing screens call. Auth uses SecureStore tokens + a persisted session + an auth-gated navigator, mirroring `sms-teacher-app`. This plan replaces Plan 1's temporary local auth gate with the real `AuthProvider`.

**Tech Stack:** TypeScript, `@tanstack/react-query`, `expo-secure-store`, `@react-native-async-storage/async-storage`, jest + @testing-library/react-native. All deps already installed in Plan 1.

**Conventions (differ from the teacher app — follow THESE):**
- `AppError` is **positional**: `new AppError(code, status, message)` (the teacher app uses an object form — do NOT copy that).
- `asyncStore` exposes `get<T>(key): Promise<T|null>` and `set<T>(key, value)` (the teacher app uses `readJson/writeJson` — use `get`/`set` with `?? fallback` instead).
- `Role` already exists at `@/theme/roles` (the 7 staff roles) — import it, never redefine it.
- Login is `login(phone, roleKey)` (not email/password).

---

## File Structure (this plan)

```
src/
  data/
    domain/
      tenant.ts staff.ts session.ts dashboard.ts attendance.ts index.ts
    repositories/
      types.ts                 # AuthRepository, DashboardRepository, AttendanceRepository, Repositories
      RepositoryContext.tsx    # RepositoryProvider + useRepositories()
      factory.ts               # createMockRepositories / createHttpRepositories
    mock/
      seed.ts                  # seeded staff, school, per-role cards, dashboard base, attendance
      store.ts                 # in-memory session + attendance, AsyncStorage persistence, genId
      auth.repo.ts dashboard.repo.ts attendance.repo.ts
    http/
      mappers.ts               # DTO <-> domain
      auth.repo.ts dashboard.repo.ts attendance.repo.ts
  lib/
    authSnapshot.ts            # mutable {accessToken, tenantId} holder for httpClient
  features/
    auth/ AuthProvider.tsx hooks.ts      # signIn/signOut, useLogin/useLogout, useAuth, useTenantId
    dashboard/ hooks.ts                  # useDashboard
    attendance/ hooks.ts                 # useAttendanceStatus, useCheckIn, useCheckOut
  providers/AppProviders.tsx   # MODIFIED: async repo init + RepositoryProvider + AuthProvider
  navigation/RootNavigator.tsx # MODIFIED: real useAuth() gate (replaces local useState gate)
  screens/LoginScreen.tsx      # MODIFIED: useLogin() instead of onSignIn prop
  data/__tests__/contract.test.ts  # mock vs http reconciliation
```

---

## Task 1: Domain types

**Files:**
- Create: `src/data/domain/tenant.ts`, `staff.ts`, `session.ts`, `dashboard.ts`, `attendance.ts`, `index.ts`

Pure types (no behavior); verified by `npm run typecheck`. A later task's tests exercise them through real values.

- [ ] **Step 1: Create `src/data/domain/tenant.ts`**

```ts
export interface Tenant {
  id: string;
  name: string;
  logoUrl?: string;
}
```

- [ ] **Step 2: Create `src/data/domain/staff.ts`**

```ts
import type { Role } from '@/theme/roles';

export interface Staff {
  id: string;
  name: string;
  firstName: string;
  roleKey: Role;
  empId: string;
  joined: string; // ISO date
  rating: number;
  dutyPost: string;
  shift: string;
  timing: string;
  phone: string;
}
```

- [ ] **Step 3: Create `src/data/domain/session.ts`**

```ts
import type { Staff } from './staff';
import type { Tenant } from './tenant';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: Staff;
  tenant: Tenant;
}
```

- [ ] **Step 4: Create `src/data/domain/dashboard.ts`**

```ts
export interface TaskPeek {
  id: string;
  title: string;
  priority: 'urgent' | 'normal';
  done: boolean;
}

// Role-driven specialized card — a discriminated union keyed by role.
export type RoleCard =
  | { kind: 'driver'; busNo: string; routeName: string; licenseExpiresInDays: number; fitnessOk: boolean }
  | { kind: 'cook'; mealCount: number; menu: string[]; lowStock: string[] }
  | { kind: 'guard'; gate: string; roundsDone: number; roundsTotal: number; visitorsToday: number }
  | { kind: 'gardener'; zones: string[]; wateringDue: number }
  | { kind: 'sweeper'; blocks: string[]; suppliesLow: string[] }
  | { kind: 'peon'; errands: number; bellDuty: boolean }
  | { kind: 'clerk'; pendingFiles: number; requestsOpen: number };

export interface Dashboard {
  hoursThisWeek: number;
  hoursTarget: number;
  streakDays: number;
  leaveLeft: number;
  roleCard: RoleCard;
  pendingTasksPeek: TaskPeek[];
  alert?: string;
}
```

- [ ] **Step 5: Create `src/data/domain/attendance.ts`**

```ts
export interface AttendanceLog {
  at: string; // ISO timestamp
  kind: 'in' | 'out';
  inZone: boolean;
}

export interface Attendance {
  checkedIn: boolean;
  checkInAt?: string; // ISO timestamp of current check-in, if checked in
  lastLog: AttendanceLog[];
  dutyPost: string;
  geofenceRadiusM: number;
}
```

- [ ] **Step 6: Create `src/data/domain/index.ts`**

```ts
export type { Tenant } from './tenant';
export type { Staff } from './staff';
export type { Session } from './session';
export type { TaskPeek, RoleCard, Dashboard } from './dashboard';
export type { AttendanceLog, Attendance } from './attendance';
export type { Role } from '@/theme/roles';
```

- [ ] **Step 7: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/data/domain
git commit -m "feat: add data domain types (staff, tenant, session, dashboard, attendance)"
```

---

## Task 2: `lib/authSnapshot.ts`

**Files:**
- Create: `src/lib/authSnapshot.ts`
- Test: `src/lib/__tests__/authSnapshot.test.ts`

A small mutable holder so the live `httpClient` can read the current token + tenant synchronously on every request. `AuthProvider` updates it on sign in / rehydrate / sign out.

- [ ] **Step 1: Write the failing test**

```ts
import { authSnapshot } from '@/lib/authSnapshot';

describe('authSnapshot', () => {
  afterEach(() => authSnapshot.clear());

  it('defaults to nulls', () => {
    expect(authSnapshot.get()).toEqual({ accessToken: null, tenantId: null });
  });
  it('set then get returns the snapshot', () => {
    authSnapshot.set({ accessToken: 'tok', tenantId: 'school1' });
    expect(authSnapshot.get()).toEqual({ accessToken: 'tok', tenantId: 'school1' });
  });
  it('clear resets to nulls', () => {
    authSnapshot.set({ accessToken: 'tok', tenantId: 'school1' });
    authSnapshot.clear();
    expect(authSnapshot.get()).toEqual({ accessToken: null, tenantId: null });
  });
});
```

- [ ] **Step 2: Run it — FAIL (module not found)**

Run: `npm test -- src/lib/__tests__/authSnapshot.test.ts`

- [ ] **Step 3: Implement `src/lib/authSnapshot.ts`**

```ts
import type { AuthSnapshot } from './httpClient';

let current: AuthSnapshot = { accessToken: null, tenantId: null };

export const authSnapshot = {
  get(): AuthSnapshot {
    return current;
  },
  set(next: AuthSnapshot): void {
    current = next;
  },
  clear(): void {
    current = { accessToken: null, tenantId: null };
  },
};
```

- [ ] **Step 4: Run it — PASS**

Run: `npm test -- src/lib/__tests__/authSnapshot.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/authSnapshot.ts src/lib/__tests__/authSnapshot.test.ts
git commit -m "feat: add authSnapshot holder for httpClient auth/tenant"
```

---

## Task 3: Repository interfaces (ports)

**Files:**
- Create: `src/data/repositories/types.ts`

Typecheck-gated (interfaces only).

- [ ] **Step 1: Implement `src/data/repositories/types.ts`**

```ts
import type { Session, Staff, Dashboard, Attendance } from '@/data/domain';
import type { Role } from '@/theme/roles';

export interface AuthRepository {
  login(phone: string, roleKey: Role): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  me(): Promise<Staff>;
  logout(): Promise<void>;
}

export interface DashboardRepository {
  get(): Promise<Dashboard>;
}

export interface AttendanceRepository {
  status(): Promise<Attendance>;
  checkIn(at: string, inZone: boolean): Promise<Attendance>;
  checkOut(at: string): Promise<Attendance>;
}

export interface Repositories {
  auth: AuthRepository;
  dashboard: DashboardRepository;
  attendance: AttendanceRepository;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/data/repositories/types.ts
git commit -m "feat: add repository port interfaces"
```

---

## Task 4: Mock seed

**Files:**
- Create: `src/data/mock/seed.ts`
- Test: `src/data/mock/__tests__/seed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { seed, dutyPostByRole } from '@/data/mock/seed';
import { ROLE_KEYS } from '@/theme/roles';

describe('seed', () => {
  it('seeds Ramesh Kumar at Greenfield Public School', () => {
    expect(seed.staff.name).toBe('Ramesh Kumar');
    expect(seed.staff.firstName).toBe('Ramesh');
    expect(seed.tenant.name).toBe('Greenfield Public School');
  });
  it('has a role card for every role, with matching kind', () => {
    ROLE_KEYS.forEach((k) => {
      expect(seed.roleCards[k].kind).toBe(k);
    });
  });
  it('has a duty-post label for every role', () => {
    ROLE_KEYS.forEach((k) => {
      expect(typeof dutyPostByRole[k]).toBe('string');
      expect(dutyPostByRole[k].length).toBeGreaterThan(0);
    });
  });
  it('starts not checked in', () => {
    expect(seed.attendance.checkedIn).toBe(false);
    expect(seed.attendance.lastLog).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npm test -- src/data/mock/__tests__/seed.test.ts`

- [ ] **Step 3: Implement `src/data/mock/seed.ts`**

```ts
import type { Role } from '@/theme/roles';
import type { Staff, Tenant, RoleCard, TaskPeek, Attendance } from '@/data/domain';

// Mock-only English duty-post labels per role (the real API returns these per staff).
export const dutyPostByRole: Record<Role, string> = {
  driver: 'Bus / Route',
  cook: 'Kitchen / Mess',
  guard: 'Gate / Post',
  gardener: 'Grounds / Zone',
  sweeper: 'Block / Area',
  peon: 'Office / Desk',
  clerk: 'Office / Desk',
};

const tenant: Tenant = {
  id: 'school_greenfield',
  name: 'Greenfield Public School',
};

const staff: Staff = {
  id: 'staff_ramesh',
  name: 'Ramesh Kumar',
  firstName: 'Ramesh',
  roleKey: 'driver',
  empId: 'EMP-2041',
  joined: '2019-06-12',
  rating: 4.6,
  dutyPost: dutyPostByRole.driver,
  shift: 'Morning Shift',
  timing: '7:30–3:30',
  phone: '98765 43210',
};

const roleCards: Record<Role, RoleCard> = {
  driver: { kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', licenseExpiresInDays: 24, fitnessOk: true },
  cook: { kind: 'cook', mealCount: 320, menu: ['Rice', 'Dal', 'Mixed veg'], lowStock: ['Cooking oil'] },
  guard: { kind: 'guard', gate: 'Main Gate', roundsDone: 3, roundsTotal: 6, visitorsToday: 14 },
  gardener: { kind: 'gardener', zones: ['Front lawn', 'Playground'], wateringDue: 2 },
  sweeper: { kind: 'sweeper', blocks: ['Block A', 'Block B'], suppliesLow: ['Phenyl'] },
  peon: { kind: 'peon', errands: 4, bellDuty: true },
  clerk: { kind: 'clerk', pendingFiles: 7, requestsOpen: 3 },
};

const tasksPeek: TaskPeek[] = [
  { id: 'task_1', title: 'Pre-trip bus inspection', priority: 'urgent', done: false },
  { id: 'task_2', title: 'Submit trip log sheet', priority: 'normal', done: false },
];

const dashboardBase = {
  hoursThisWeek: 34,
  hoursTarget: 44,
  streakDays: 21,
  leaveLeft: 12,
  alert: 'Staff meeting at 4:00 PM',
};

const attendance: Attendance = {
  checkedIn: false,
  lastLog: [],
  dutyPost: dutyPostByRole.driver,
  geofenceRadiusM: 120,
};

export interface SeedShape {
  staff: Staff;
  tenant: Tenant;
  roleCards: Record<Role, RoleCard>;
  tasksPeek: TaskPeek[];
  dashboardBase: typeof dashboardBase;
  attendance: Attendance;
}

export const seed: SeedShape = { staff, tenant, roleCards, tasksPeek, dashboardBase, attendance };
```

- [ ] **Step 4: Run it — PASS**

Run: `npm test -- src/data/mock/__tests__/seed.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/seed.ts src/data/mock/__tests__/seed.test.ts
git commit -m "feat: add mock seed (staff, school, per-role cards, dashboard, attendance)"
```

---

## Task 5: Mock store

**Files:**
- Create: `src/data/mock/store.ts`
- Test: `src/data/mock/__tests__/store.test.ts`

In-memory session + attendance, hydrated from seed (and a persisted role / attendance), with AsyncStorage write-through. Uses `asyncStore.get/set` with `?? fallback` (NOT `readJson/writeJson`).

- [ ] **Step 1: Write the failing test**

```ts
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

describe('createStore', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('hydrates a session and attendance from seed', async () => {
    const store = await createStore();
    expect(store.session.user.name).toBe('Ramesh Kumar');
    expect(store.session.tenant.name).toBe('Greenfield Public School');
    expect(store.attendance.checkedIn).toBe(false);
  });

  it('persistRole writes the current role; a new store rehydrates it', async () => {
    const store = await createStore();
    store.session.user.roleKey = 'cook';
    await store.persistRole();
    const store2 = await createStore();
    expect(store2.session.user.roleKey).toBe('cook');
  });

  it('persistAttendance survives a reload', async () => {
    const store = await createStore();
    store.attendance = { ...store.attendance, checkedIn: true, checkInAt: '2026-06-03T08:00:00Z' };
    await store.persistAttendance();
    const store2 = await createStore();
    expect(store2.attendance.checkedIn).toBe(true);
    expect(store2.attendance.checkInAt).toBe('2026-06-03T08:00:00Z');
  });

  it('genId produces unique prefixed ids', () => {
    return createStore().then((store) => {
      const a = store.genId('x');
      const b = store.genId('x');
      expect(a.startsWith('x_')).toBe(true);
      expect(a).not.toBe(b);
    });
  });

  it('mutating the store does not mutate the shared seed', async () => {
    const store = await createStore();
    store.session.user.name = 'Changed';
    const { seed } = await import('@/data/mock/seed');
    expect(seed.staff.name).toBe('Ramesh Kumar');
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npm test -- src/data/mock/__tests__/store.test.ts`

- [ ] **Step 3: Implement `src/data/mock/store.ts`**

```ts
import { asyncStore } from '@/lib/asyncStore';
import { seed, dutyPostByRole } from './seed';
import type { Session, Attendance } from '@/data/domain';
import type { Role } from '@/theme/roles';

const KEY = 'sms.mock.';

export interface Store {
  session: Session;
  attendance: Attendance;
  dashboardBase: typeof seed.dashboardBase;
  roleCards: typeof seed.roleCards;
  tasksPeek: typeof seed.tasksPeek;
  persistAttendance(): Promise<void>;
  persistRole(): Promise<void>;
  genId(prefix: string): string;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export async function createStore(): Promise<Store> {
  const staff = clone(seed.staff);
  const savedRole = await asyncStore.get<Role>(`${KEY}role`);
  if (savedRole && dutyPostByRole[savedRole]) {
    staff.roleKey = savedRole;
    staff.dutyPost = dutyPostByRole[savedRole];
  }
  const attendance = (await asyncStore.get<Attendance>(`${KEY}attendance`)) ?? clone(seed.attendance);
  let counter = 0;

  const store: Store = {
    session: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: staff,
      tenant: clone(seed.tenant),
    },
    attendance,
    dashboardBase: clone(seed.dashboardBase),
    roleCards: clone(seed.roleCards),
    tasksPeek: clone(seed.tasksPeek),
    async persistAttendance() {
      await asyncStore.set(`${KEY}attendance`, store.attendance);
    },
    async persistRole() {
      await asyncStore.set(`${KEY}role`, store.session.user.roleKey);
    },
    genId(prefix) {
      counter += 1;
      return `${prefix}_${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };
  return store;
}
```

- [ ] **Step 4: Run it — PASS**

Run: `npm test -- src/data/mock/__tests__/store.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/data/mock/store.ts src/data/mock/__tests__/store.test.ts
git commit -m "feat: add mock store with AsyncStorage persistence"
```

---

## Task 6: Mock repositories (auth, dashboard, attendance)

**Files:**
- Create: `src/data/mock/auth.repo.ts`, `dashboard.repo.ts`, `attendance.repo.ts`
- Test: `src/data/mock/__tests__/repos.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createStore } from '@/data/mock/store';
import { mockAuth } from '@/data/mock/auth.repo';
import { mockDashboard } from '@/data/mock/dashboard.repo';
import { mockAttendance } from '@/data/mock/attendance.repo';
import { AppError } from '@/lib/errors';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

describe('mock repositories', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('login sets the chosen role and returns a session', async () => {
    const store = await createStore();
    const session = await mockAuth(store).login('98765 43210', 'cook');
    expect(session.user.roleKey).toBe('cook');
    expect(session.user.dutyPost).toBe('Kitchen / Mess');
    expect(session.tenant.name).toBe('Greenfield Public School');
  });

  it('login rejects an empty phone with AppError', async () => {
    const store = await createStore();
    await expect(mockAuth(store).login('', 'driver')).rejects.toBeInstanceOf(AppError);
  });

  it('dashboard returns the role card matching the logged-in role', async () => {
    const store = await createStore();
    await mockAuth(store).login('98765 43210', 'guard');
    const dash = await mockDashboard(store).get();
    expect(dash.roleCard.kind).toBe('guard');
    expect(dash.hoursThisWeek).toBe(34);
    expect(dash.pendingTasksPeek.length).toBeGreaterThan(0);
  });

  it('checkIn flips state, records a log, and persists', async () => {
    const store = await createStore();
    const repo = mockAttendance(store);
    const after = await repo.checkIn('2026-06-03T08:00:00Z', true);
    expect(after.checkedIn).toBe(true);
    expect(after.checkInAt).toBe('2026-06-03T08:00:00Z');
    expect(after.lastLog[0]).toEqual({ at: '2026-06-03T08:00:00Z', kind: 'in', inZone: true });
    // persisted: a fresh store sees it
    const store2 = await createStore();
    expect(store2.attendance.checkedIn).toBe(true);
  });

  it('checkOut clears checkedIn and logs an out event', async () => {
    const store = await createStore();
    const repo = mockAttendance(store);
    await repo.checkIn('2026-06-03T08:00:00Z', true);
    const after = await repo.checkOut('2026-06-03T15:30:00Z');
    expect(after.checkedIn).toBe(false);
    expect(after.checkInAt).toBeUndefined();
    expect(after.lastLog[0].kind).toBe('out');
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npm test -- src/data/mock/__tests__/repos.test.ts`

- [ ] **Step 3: Implement `src/data/mock/auth.repo.ts`**

```ts
import type { AuthRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';
import { dutyPostByRole } from './seed';

const cloneSession = (s: Store['session']) => ({
  ...s,
  user: { ...s.user },
  tenant: { ...s.tenant },
});

export function mockAuth(store: Store): AuthRepository {
  return {
    async login(phone, roleKey) {
      await simulateLatency();
      if (!phone) throw new AppError('invalid', 400, 'Phone number required');
      store.session.user.roleKey = roleKey;
      store.session.user.dutyPost = dutyPostByRole[roleKey];
      await store.persistRole();
      return cloneSession(store.session);
    },
    async refresh() {
      await simulateLatency();
      return cloneSession(store.session);
    },
    async me() {
      await simulateLatency();
      return { ...store.session.user };
    },
    async logout() {
      await simulateLatency();
    },
  };
}
```

- [ ] **Step 4: Implement `src/data/mock/dashboard.repo.ts`**

```ts
import type { DashboardRepository } from '@/data/repositories/types';
import type { Dashboard } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockDashboard(store: Store): DashboardRepository {
  return {
    async get(): Promise<Dashboard> {
      await simulateLatency();
      const role = store.session.user.roleKey;
      return {
        ...store.dashboardBase,
        roleCard: { ...store.roleCards[role] },
        pendingTasksPeek: store.tasksPeek.map((t) => ({ ...t })),
      };
    },
  };
}
```

- [ ] **Step 5: Implement `src/data/mock/attendance.repo.ts`**

```ts
import type { AttendanceRepository } from '@/data/repositories/types';
import type { Attendance } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = (a: Attendance): Attendance => ({ ...a, lastLog: a.lastLog.map((l) => ({ ...l })) });

export function mockAttendance(store: Store): AttendanceRepository {
  return {
    async status() {
      await simulateLatency();
      return clone(store.attendance);
    },
    async checkIn(at, inZone) {
      await simulateLatency();
      store.attendance = {
        ...store.attendance,
        checkedIn: true,
        checkInAt: at,
        lastLog: [{ at, kind: 'in', inZone }, ...store.attendance.lastLog],
      };
      await store.persistAttendance();
      return clone(store.attendance);
    },
    async checkOut(at) {
      await simulateLatency();
      store.attendance = {
        ...store.attendance,
        checkedIn: false,
        checkInAt: undefined,
        lastLog: [{ at, kind: 'out', inZone: true }, ...store.attendance.lastLog],
      };
      await store.persistAttendance();
      return clone(store.attendance);
    },
  };
}
```

- [ ] **Step 6: Run it — PASS**

Run: `npm test -- src/data/mock/__tests__/repos.test.ts`

- [ ] **Step 7: Commit**

```bash
git add src/data/mock/auth.repo.ts src/data/mock/dashboard.repo.ts src/data/mock/attendance.repo.ts src/data/mock/__tests__/repos.test.ts
git commit -m "feat: add mock auth/dashboard/attendance repositories"
```

---

## Task 7: HTTP mappers

**Files:**
- Create: `src/data/http/mappers.ts`
- Test: `src/data/http/__tests__/mappers.test.ts`

Maps backend DTOs (snake_case) to domain types. Nested `role_card` / `last_log` / `pending_tasks_peek` are passed through already in domain shape for this iteration (documented seam — a later backend change is absorbed here).

- [ ] **Step 1: Write the failing test**

```ts
import { toSession, toStaff, toTenant, toDashboard, toAttendance } from '@/data/http/mappers';

describe('http mappers', () => {
  it('toStaff maps snake_case to domain', () => {
    const staff = toStaff({
      id: 's1', name: 'Ramesh Kumar', first_name: 'Ramesh', role_key: 'driver',
      emp_id: 'EMP-1', joined: '2019-06-12', rating: 4.6, duty_post: 'Bus / Route',
      shift: 'Morning Shift', timing: '7:30–3:30', phone: '98765 43210',
    });
    expect(staff.firstName).toBe('Ramesh');
    expect(staff.roleKey).toBe('driver');
    expect(staff.empId).toBe('EMP-1');
    expect(staff.dutyPost).toBe('Bus / Route');
  });

  it('toTenant maps logo_url to logoUrl', () => {
    expect(toTenant({ id: 't1', name: 'School', logo_url: 'http://x/y.png' }))
      .toEqual({ id: 't1', name: 'School', logoUrl: 'http://x/y.png' });
  });

  it('toSession maps tokens and nested user/tenant', () => {
    const s = toSession({
      access_token: 'a', refresh_token: 'r',
      user: { id: 's1', name: 'R K', first_name: 'R', role_key: 'cook', emp_id: 'E', joined: '2020-01-01', rating: 4, duty_post: 'Kitchen / Mess', shift: 'Morning Shift', timing: '7:30–3:30', phone: '1' },
      tenant: { id: 't1', name: 'School' },
    });
    expect(s.accessToken).toBe('a');
    expect(s.refreshToken).toBe('r');
    expect(s.user.roleKey).toBe('cook');
    expect(s.tenant.id).toBe('t1');
  });

  it('toDashboard maps stats and passes nested structures through', () => {
    const d = toDashboard({
      hours_this_week: 34, hours_target: 44, streak_days: 21, leave_left: 12,
      role_card: { kind: 'driver', busNo: 'X', routeName: 'R7', licenseExpiresInDays: 24, fitnessOk: true },
      pending_tasks_peek: [{ id: 't1', title: 'A', priority: 'urgent', done: false }],
      alert: 'Meeting',
    });
    expect(d.hoursThisWeek).toBe(34);
    expect(d.leaveLeft).toBe(12);
    expect(d.roleCard.kind).toBe('driver');
    expect(d.pendingTasksPeek[0].id).toBe('t1');
    expect(d.alert).toBe('Meeting');
  });

  it('toAttendance maps snake_case fields', () => {
    const a = toAttendance({
      checked_in: true, check_in_at: '2026-06-03T08:00:00Z',
      last_log: [{ at: '2026-06-03T08:00:00Z', kind: 'in', inZone: true }],
      duty_post: 'Bus / Route', geofence_radius_m: 120,
    });
    expect(a.checkedIn).toBe(true);
    expect(a.checkInAt).toBe('2026-06-03T08:00:00Z');
    expect(a.dutyPost).toBe('Bus / Route');
    expect(a.geofenceRadiusM).toBe(120);
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npm test -- src/data/http/__tests__/mappers.test.ts`

- [ ] **Step 3: Implement `src/data/http/mappers.ts`**

```ts
import type { Session, Staff, Tenant, Dashboard, RoleCard, Attendance, AttendanceLog, TaskPeek } from '@/data/domain';
import type { Role } from '@/theme/roles';

export interface StaffDTO {
  id: string;
  name: string;
  first_name: string;
  role_key: Role;
  emp_id: string;
  joined: string;
  rating: number;
  duty_post: string;
  shift: string;
  timing: string;
  phone: string;
}
export interface TenantDTO {
  id: string;
  name: string;
  logo_url?: string;
}
export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  user: StaffDTO;
  tenant: TenantDTO;
}
export interface DashboardDTO {
  hours_this_week: number;
  hours_target: number;
  streak_days: number;
  leave_left: number;
  role_card: RoleCard;
  pending_tasks_peek: TaskPeek[];
  alert?: string;
}
export interface AttendanceDTO {
  checked_in: boolean;
  check_in_at?: string;
  last_log: AttendanceLog[];
  duty_post: string;
  geofence_radius_m: number;
}

export function toStaff(d: StaffDTO): Staff {
  return {
    id: d.id,
    name: d.name,
    firstName: d.first_name,
    roleKey: d.role_key,
    empId: d.emp_id,
    joined: d.joined,
    rating: d.rating,
    dutyPost: d.duty_post,
    shift: d.shift,
    timing: d.timing,
    phone: d.phone,
  };
}

export function toTenant(d: TenantDTO): Tenant {
  return { id: d.id, name: d.name, logoUrl: d.logo_url };
}

export function toSession(d: SessionDTO): Session {
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    user: toStaff(d.user),
    tenant: toTenant(d.tenant),
  };
}

export function toDashboard(d: DashboardDTO): Dashboard {
  return {
    hoursThisWeek: d.hours_this_week,
    hoursTarget: d.hours_target,
    streakDays: d.streak_days,
    leaveLeft: d.leave_left,
    roleCard: d.role_card,
    pendingTasksPeek: d.pending_tasks_peek,
    alert: d.alert,
  };
}

export function toAttendance(d: AttendanceDTO): Attendance {
  return {
    checkedIn: d.checked_in,
    checkInAt: d.check_in_at,
    lastLog: d.last_log,
    dutyPost: d.duty_post,
    geofenceRadiusM: d.geofence_radius_m,
  };
}
```

- [ ] **Step 4: Run it — PASS**

Run: `npm test -- src/data/http/__tests__/mappers.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/data/http/mappers.ts src/data/http/__tests__/mappers.test.ts
git commit -m "feat: add http DTO<->domain mappers"
```

---

## Task 8: HTTP repositories

**Files:**
- Create: `src/data/http/auth.repo.ts`, `dashboard.repo.ts`, `attendance.repo.ts`
- Test: `src/data/http/__tests__/repos.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { httpAuth } from '@/data/http/auth.repo';
import { httpDashboard } from '@/data/http/dashboard.repo';
import { httpAttendance } from '@/data/http/attendance.repo';
import type { HttpClient } from '@/lib/httpClient';

function fakeHttp(routes: Record<string, unknown>): { http: HttpClient; calls: Array<{ method: string; path: string; body?: unknown }> } {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const http: HttpClient = {
    get: <T>(path: string) => { calls.push({ method: 'GET', path }); return Promise.resolve(routes[`GET ${path}`] as T); },
    post: <T>(path: string, body?: unknown) => { calls.push({ method: 'POST', path, body }); return Promise.resolve(routes[`POST ${path}`] as T); },
    patch: <T>(path: string, body?: unknown) => { calls.push({ method: 'PATCH', path, body }); return Promise.resolve(routes[`PATCH ${path}`] as T); },
    delete: <T>(path: string) => { calls.push({ method: 'DELETE', path }); return Promise.resolve(routes[`DELETE ${path}`] as T); },
  };
  return { http, calls };
}

const sessionDTO = {
  access_token: 'a', refresh_token: 'r',
  user: { id: 's1', name: 'R K', first_name: 'R', role_key: 'driver', emp_id: 'E', joined: '2020-01-01', rating: 4, duty_post: 'Bus / Route', shift: 'Morning Shift', timing: '7:30–3:30', phone: '1' },
  tenant: { id: 't1', name: 'School' },
};

describe('http repositories', () => {
  it('auth.login posts phone + role_key and maps the session', async () => {
    const { http, calls } = fakeHttp({ 'POST /staff/auth/login': sessionDTO });
    const session = await httpAuth(http).login('98765 43210', 'driver');
    expect(session.accessToken).toBe('a');
    expect(session.user.roleKey).toBe('driver');
    expect(calls[0]).toEqual({ method: 'POST', path: '/staff/auth/login', body: { phone: '98765 43210', role_key: 'driver' } });
  });

  it('dashboard.get fetches and maps', async () => {
    const { http } = fakeHttp({
      'GET /staff/dashboard': {
        hours_this_week: 34, hours_target: 44, streak_days: 21, leave_left: 12,
        role_card: { kind: 'driver', busNo: 'X', routeName: 'R7', licenseExpiresInDays: 24, fitnessOk: true },
        pending_tasks_peek: [], alert: 'Meeting',
      },
    });
    const d = await httpDashboard(http).get();
    expect(d.hoursThisWeek).toBe(34);
    expect(d.roleCard.kind).toBe('driver');
  });

  it('attendance.checkIn posts at + in_zone and maps the result', async () => {
    const { http, calls } = fakeHttp({
      'POST /staff/attendance/check-in': {
        checked_in: true, check_in_at: '2026-06-03T08:00:00Z', last_log: [], duty_post: 'Bus / Route', geofence_radius_m: 120,
      },
    });
    const a = await httpAttendance(http).checkIn('2026-06-03T08:00:00Z', true);
    expect(a.checkedIn).toBe(true);
    expect(calls[0]).toEqual({ method: 'POST', path: '/staff/attendance/check-in', body: { at: '2026-06-03T08:00:00Z', in_zone: true } });
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npm test -- src/data/http/__tests__/repos.test.ts`

- [ ] **Step 3: Implement `src/data/http/auth.repo.ts`**

```ts
import type { AuthRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toSession, toStaff, type SessionDTO, type StaffDTO } from './mappers';

export function httpAuth(http: HttpClient): AuthRepository {
  return {
    login: (phone, roleKey) =>
      http.post<SessionDTO>('/staff/auth/login', { phone, role_key: roleKey }).then(toSession),
    refresh: (refreshToken) =>
      http.post<SessionDTO>('/staff/auth/refresh', { refresh_token: refreshToken }).then(toSession),
    me: () => http.get<StaffDTO>('/staff/auth/me').then(toStaff),
    logout: () => http.post<void>('/staff/auth/logout'),
  };
}
```

- [ ] **Step 4: Implement `src/data/http/dashboard.repo.ts`**

```ts
import type { DashboardRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toDashboard, type DashboardDTO } from './mappers';

export function httpDashboard(http: HttpClient): DashboardRepository {
  return {
    get: () => http.get<DashboardDTO>('/staff/dashboard').then(toDashboard),
  };
}
```

- [ ] **Step 5: Implement `src/data/http/attendance.repo.ts`**

```ts
import type { AttendanceRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAttendance, type AttendanceDTO } from './mappers';

export function httpAttendance(http: HttpClient): AttendanceRepository {
  return {
    status: () => http.get<AttendanceDTO>('/staff/attendance').then(toAttendance),
    checkIn: (at, inZone) =>
      http.post<AttendanceDTO>('/staff/attendance/check-in', { at, in_zone: inZone }).then(toAttendance),
    checkOut: (at) =>
      http.post<AttendanceDTO>('/staff/attendance/check-out', { at }).then(toAttendance),
  };
}
```

- [ ] **Step 6: Run it — PASS**

Run: `npm test -- src/data/http/__tests__/repos.test.ts`

- [ ] **Step 7: Commit**

```bash
git add src/data/http/auth.repo.ts src/data/http/dashboard.repo.ts src/data/http/attendance.repo.ts src/data/http/__tests__/repos.test.ts
git commit -m "feat: add http auth/dashboard/attendance repositories"
```

---

## Task 9: Repository factory + context

**Files:**
- Create: `src/data/repositories/factory.ts`, `src/data/repositories/RepositoryContext.tsx`
- Test: `src/data/repositories/__tests__/factory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { createMockRepositories, createHttpRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import type { HttpClient } from '@/lib/httpClient';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});

const noopHttp = {
  get: () => Promise.resolve(undefined),
  post: () => Promise.resolve(undefined),
  patch: () => Promise.resolve(undefined),
  delete: () => Promise.resolve(undefined),
} as unknown as HttpClient;

describe('repository factory', () => {
  it('mock bundle exposes auth/dashboard/attendance', async () => {
    const repos = createMockRepositories(await createStore());
    expect(typeof repos.auth.login).toBe('function');
    expect(typeof repos.dashboard.get).toBe('function');
    expect(typeof repos.attendance.checkIn).toBe('function');
  });
  it('http bundle exposes auth/dashboard/attendance', () => {
    const repos = createHttpRepositories(noopHttp);
    expect(typeof repos.auth.login).toBe('function');
    expect(typeof repos.dashboard.get).toBe('function');
    expect(typeof repos.attendance.checkIn).toBe('function');
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npm test -- src/data/repositories/__tests__/factory.test.ts`

- [ ] **Step 3: Implement `src/data/repositories/factory.ts`**

```ts
import type { Repositories } from './types';
import type { Store } from '@/data/mock/store';
import type { HttpClient } from '@/lib/httpClient';
import { mockAuth } from '@/data/mock/auth.repo';
import { mockDashboard } from '@/data/mock/dashboard.repo';
import { mockAttendance } from '@/data/mock/attendance.repo';
import { httpAuth } from '@/data/http/auth.repo';
import { httpDashboard } from '@/data/http/dashboard.repo';
import { httpAttendance } from '@/data/http/attendance.repo';

export function createMockRepositories(store: Store): Repositories {
  return {
    auth: mockAuth(store),
    dashboard: mockDashboard(store),
    attendance: mockAttendance(store),
  };
}

export function createHttpRepositories(http: HttpClient): Repositories {
  return {
    auth: httpAuth(http),
    dashboard: httpDashboard(http),
    attendance: httpAttendance(http),
  };
}
```

- [ ] **Step 4: Implement `src/data/repositories/RepositoryContext.tsx`**

```tsx
import React, { createContext, useContext } from 'react';
import type { Repositories } from './types';

const RepositoryContext = createContext<Repositories | null>(null);

export const RepositoryProvider: React.FC<{
  repositories: Repositories;
  children: React.ReactNode;
}> = ({ repositories, children }) => (
  <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>
);

export function useRepositories(): Repositories {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('useRepositories must be used within RepositoryProvider');
  return ctx;
}
```

- [ ] **Step 5: Run it — PASS**

Run: `npm test -- src/data/repositories/__tests__/factory.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/data/repositories/factory.ts src/data/repositories/RepositoryContext.tsx src/data/repositories/__tests__/factory.test.ts
git commit -m "feat: add repository factory and context"
```

---

## Task 10: AuthProvider + auth hooks

**Files:**
- Create: `src/features/auth/AuthProvider.tsx`, `src/features/auth/hooks.ts`
- Test: `src/features/auth/__tests__/AuthProvider.test.tsx`

`AuthProvider` bootstraps from SecureStore tokens + persisted session, exposes `signIn(phone, roleKey)`/`signOut`/`status`/`session`, threads `authSnapshot`, and clears the query cache on sign out.

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
jest.mock('expo-secure-store', () => {
  let mem: Record<string, string> = {};
  return {
    setItemAsync: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    deleteItemAsync: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
  };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

function Harness() {
  const { status, session, signIn, signOut } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="school">{session?.tenant.name ?? ''}</Text>
      <Text testID="role">{session?.user.roleKey ?? ''}</Text>
      <Pressable testID="in" onPress={() => signIn('98765 43210', 'cook')}><Text>in</Text></Pressable>
      <Pressable testID="out" onPress={() => signOut()}><Text>out</Text></Pressable>
    </>
  );
}

async function renderWithProviders() {
  const repos = createMockRepositories(await createStore());
  return render(
    <RepositoryProvider repositories={repos}>
      <AuthProvider><Harness /></AuthProvider>
    </RepositoryProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('starts unauthenticated with no stored session', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('signIn authenticates and exposes school + role', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    fireEvent.press(screen.getByTestId('in'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('school')).toHaveTextContent('Greenfield Public School');
    expect(screen.getByTestId('role')).toHaveTextContent('cook');
  });

  it('signOut returns to unauthenticated', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    fireEvent.press(screen.getByTestId('in'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    fireEvent.press(screen.getByTestId('out'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npm test -- src/features/auth/__tests__/AuthProvider.test.tsx`

- [ ] **Step 3: Implement `src/features/auth/AuthProvider.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@/data/domain';
import type { Role } from '@/theme/roles';
import { tokenStore } from '@/lib/tokenStore';
import { asyncStore } from '@/lib/asyncStore';
import { authSnapshot } from '@/lib/authSnapshot';
import { queryClient } from '@/lib/queryClient';
import { useRepositories } from '@/data/repositories/RepositoryContext';

// User + tenant persist here; tokens live in SecureStore. Together they rehydrate
// a full Session across restarts.
const SESSION_KEY = 'sms.session';

type Status = 'loading' | 'authenticated' | 'unauthenticated';
interface AuthValue {
  status: Status;
  session: Session | null;
  signIn: (phone: string, roleKey: Role) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repos = useRepositories();
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      const tokens = await tokenStore.read();
      const stored = await asyncStore.get<Session>(SESSION_KEY);
      if (!tokens || !stored) {
        if (tokens) await tokenStore.clear();
        setStatus('unauthenticated');
        return;
      }
      try {
        const user = await repos.auth.me();
        const rehydrated: Session = { ...stored, ...tokens, user };
        authSnapshot.set({ accessToken: rehydrated.accessToken, tenantId: rehydrated.tenant.id });
        setSession(rehydrated);
        setStatus('authenticated');
      } catch {
        await tokenStore.clear();
        await asyncStore.remove(SESSION_KEY);
        setStatus('unauthenticated');
      }
    })();
  }, [repos]);

  const signIn = useCallback(
    async (phone: string, roleKey: Role) => {
      const s = await repos.auth.login(phone, roleKey);
      await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
      await asyncStore.set(SESSION_KEY, s);
      authSnapshot.set({ accessToken: s.accessToken, tenantId: s.tenant.id });
      setSession(s);
      setStatus('authenticated');
    },
    [repos],
  );

  const signOut = useCallback(async () => {
    try {
      await repos.auth.logout();
    } finally {
      await tokenStore.clear();
      await asyncStore.remove(SESSION_KEY);
      authSnapshot.clear();
      queryClient.clear();
      setSession(null);
      setStatus('unauthenticated');
    }
  }, [repos]);

  const value = useMemo<AuthValue>(
    () => ({ status, session, signIn, signOut }),
    [status, session, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Current tenant id (or 'anon') — for query keys. */
export function useTenantId(): string {
  return useAuth().session?.tenant.id ?? 'anon';
}
```

> Note: `asyncStore.remove` is used to clear the persisted session; it exists in `@/lib/asyncStore` (Plan 1).

- [ ] **Step 4: Implement `src/features/auth/hooks.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
import type { Role } from '@/theme/roles';
import { useAuth } from './AuthProvider';

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: ({ phone, roleKey }: { phone: string; roleKey: Role }) => signIn(phone, roleKey),
  });
}

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: () => signOut() });
}
```

- [ ] **Step 5: Run it — PASS**

Run: `npm test -- src/features/auth/__tests__/AuthProvider.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/features/auth
git commit -m "feat: add AuthProvider + useLogin/useLogout hooks"
```

---

## Task 11: Dashboard + Attendance hooks

**Files:**
- Create: `src/features/dashboard/hooks.ts`, `src/features/attendance/hooks.ts`
- Test: `src/features/__tests__/hooks.test.tsx`

`useDashboard` reads via React Query; `useCheckIn`/`useCheckOut` do optimistic updates + rollback + invalidate.

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { useDashboard } from '@/features/dashboard/hooks';
import { useAttendanceStatus, useCheckIn } from '@/features/attendance/hooks';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function wrap(ui: React.ReactElement) {
  const repos = createMockRepositories(await createStore());
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RepositoryProvider repositories={repos}>{ui}</RepositoryProvider>
    </QueryClientProvider>,
  );
}

function DashboardProbe() {
  const { data, isLoading } = useDashboard();
  return <Text testID="dash">{isLoading ? 'loading' : `${data?.roleCard.kind}:${data?.hoursThisWeek}`}</Text>;
}

function AttendanceProbe() {
  const { data } = useAttendanceStatus();
  const checkIn = useCheckIn();
  return (
    <>
      <Text testID="checked">{String(data?.checkedIn ?? '')}</Text>
      <Pressable testID="checkin" onPress={() => checkIn.mutate({ at: '2026-06-03T08:00:00Z', inZone: true })}>
        <Text>in</Text>
      </Pressable>
    </>
  );
}

describe('feature hooks', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('useDashboard loads the role-driven dashboard', async () => {
    await wrap(<DashboardProbe />);
    await waitFor(() => expect(screen.getByTestId('dash')).toHaveTextContent('driver:34'));
  });

  it('useCheckIn optimistically flips checkedIn to true', async () => {
    await wrap(<AttendanceProbe />);
    await waitFor(() => expect(screen.getByTestId('checked')).toHaveTextContent('false'));
    fireEvent.press(screen.getByTestId('checkin'));
    await waitFor(() => expect(screen.getByTestId('checked')).toHaveTextContent('true'));
  });
});
```

- [ ] **Step 2: Run it — FAIL**

Run: `npm test -- src/features/__tests__/hooks.test.tsx`

- [ ] **Step 3: Implement `src/features/dashboard/hooks.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useDashboard() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.dashboard(tenantId),
    queryFn: () => repos.dashboard.get(),
  });
}
```

> Note: in this test the probe is not wrapped in `AuthProvider`, so `useTenantId()` would throw. To keep the hooks usable both with and without auth in tests, `useTenantId` must not throw when there is no AuthProvider. **Update `useTenantId` in `src/features/auth/AuthProvider.tsx`** to read the context defensively:
> ```ts
> export function useTenantId(): string {
>   const ctx = useContext(AuthContext);
>   return ctx?.session?.tenant.id ?? 'anon';
> }
> ```
> (Apply this small change as part of this task; it does not affect Task 10's tests, which use AuthProvider.) Re-run the AuthProvider test after to confirm still green.

- [ ] **Step 4: Implement `src/features/attendance/hooks.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Attendance } from '@/data/domain';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useAttendanceStatus() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.attendance(tenantId),
    queryFn: () => repos.attendance.status(),
  });
}

export function useCheckIn() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.attendance(tenantId);
  return useMutation({
    mutationFn: ({ at, inZone }: { at: string; inZone: boolean }) => repos.attendance.checkIn(at, inZone),
    onMutate: async ({ at, inZone }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Attendance>(key);
      if (prev) {
        qc.setQueryData<Attendance>(key, {
          ...prev,
          checkedIn: true,
          checkInAt: at,
          lastLog: [{ at, kind: 'in', inZone }, ...prev.lastLog],
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useCheckOut() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.attendance(tenantId);
  return useMutation({
    mutationFn: ({ at }: { at: string }) => repos.attendance.checkOut(at),
    onMutate: async ({ at }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Attendance>(key);
      if (prev) {
        qc.setQueryData<Attendance>(key, {
          ...prev,
          checkedIn: false,
          checkInAt: undefined,
          lastLog: [{ at, kind: 'out', inZone: true }, ...prev.lastLog],
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
```

- [ ] **Step 5: Run it — PASS** (and re-run the AuthProvider test to confirm the `useTenantId` tweak didn't break it)

Run: `npm test -- src/features/__tests__/hooks.test.tsx`
Run: `npm test -- src/features/auth/__tests__/AuthProvider.test.tsx`

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard src/features/attendance src/features/auth/AuthProvider.tsx
git commit -m "feat: add dashboard + attendance hooks (optimistic check-in/out)"
```

---

## Task 12: Wire providers + auth-gated navigation

**Files:**
- Modify: `src/providers/AppProviders.tsx`, `src/navigation/RootNavigator.tsx`, `src/screens/LoginScreen.tsx`

Replace Plan 1's temporary local gate with the real data layer + auth.

- [ ] **Step 1: Replace `src/providers/AppProviders.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/config/env';
import { createHttpClient } from '@/lib/httpClient';
import { authSnapshot } from '@/lib/authSnapshot';
import { createStore } from '@/data/mock/store';
import { createMockRepositories, createHttpRepositories } from '@/data/repositories/factory';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ThemeProvider } from '@/theme';
import type { Repositories } from '@/data/repositories/types';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repositories | null>(null);

  useEffect(() => {
    (async () => {
      if (env.DATA_SOURCE === 'live') {
        const http = createHttpClient({
          baseUrl: env.API_BASE_URL,
          getAuth: () => authSnapshot.get(),
        });
        setRepositories(createHttpRepositories(http));
      } else {
        const store = await createStore();
        setRepositories(createMockRepositories(store));
      }
    })();
  }, []);

  if (!repositories) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0E5C4A" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RepositoryProvider repositories={repositories}>
          <AuthProvider>{children}</AuthProvider>
        </RepositoryProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EEE4' },
});
```

- [ ] **Step 2: Replace `src/navigation/RootNavigator.tsx`**

```tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { status } = useAuth();
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === 'authenticated' ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 3: Replace `src/screens/LoginScreen.tsx`** (still a temporary UI — the real role grid is Plan 3 — but now it authenticates for real via `useLogin`)

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { useLogin } from '@/features/auth/hooks';

export const LoginScreen = () => {
  const { colors, role, roleKey } = useTheme();
  const login = useLogin();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Text style={[TextScale.hero, { color: colors.ink }]}>SchoolMate Staff</Text>
        <Pressable
          onPress={() => login.mutate({ phone: '98765 43210', roleKey })}
          disabled={login.isPending}
          style={[styles.btn, { backgroundColor: role.accent, opacity: login.isPending ? 0.7 : 1 }]}
          testID="signin"
        >
          {login.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[TextScale.button, { color: '#FFFFFF' }]}>Enter app</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  btn: { height: 54, paddingHorizontal: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minWidth: 200 },
});
```

- [ ] **Step 4: Typecheck + lint + full test suite**

Run: `npm run typecheck` → exit 0
Run: `npm run lint` → 0 errors
Run: `npm test` → all suites pass

- [ ] **Step 5: Bundle validation**

Run: `npx expo export --platform web`
Expected: completes with no bundling errors (validates the new provider/data wiring compiles). Delete `dist/` after (gitignored).

- [ ] **Step 6: Commit**

```bash
git add src/providers/AppProviders.tsx src/navigation/RootNavigator.tsx src/screens/LoginScreen.tsx
git commit -m "feat: wire real data layer + auth-gated navigation (replaces temp gate)"
```

---

## Task 13: Contract test (mock ↔ http reconciliation)

**Files:**
- Create: `src/data/__tests__/contract.test.ts`

Guarantees the mock and http adapters return identical domain shapes for the same logical operation — the safety net that makes the live swap safe.

- [ ] **Step 1: Write the test**

```ts
import { createStore } from '@/data/mock/store';
import { createMockRepositories, createHttpRepositories } from '@/data/repositories/factory';
import type { HttpClient } from '@/lib/httpClient';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// A fixture-backed http client returning DTOs equivalent to the mock seed.
function fixtureHttp(): HttpClient {
  const sessionDTO = {
    access_token: 'mock-access-token', refresh_token: 'mock-refresh-token',
    user: { id: 'staff_ramesh', name: 'Ramesh Kumar', first_name: 'Ramesh', role_key: 'driver', emp_id: 'EMP-2041', joined: '2019-06-12', rating: 4.6, duty_post: 'Bus / Route', shift: 'Morning Shift', timing: '7:30–3:30', phone: '98765 43210' },
    tenant: { id: 'school_greenfield', name: 'Greenfield Public School' },
  };
  const attendanceDTO = { checked_in: false, last_log: [], duty_post: 'Bus / Route', geofence_radius_m: 120 };
  const routes: Record<string, unknown> = {
    'POST /staff/auth/login': sessionDTO,
    'GET /staff/attendance': attendanceDTO,
  };
  return {
    get: <T>(path: string) => Promise.resolve(routes[`GET ${path}`] as T),
    post: <T>(path: string) => Promise.resolve(routes[`POST ${path}`] as T),
    patch: <T>() => Promise.resolve(undefined as T),
    delete: <T>() => Promise.resolve(undefined as T),
  };
}

const keys = (o: object) => Object.keys(o).sort();

describe('mock ↔ http contract', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('login returns the same Session shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = await mock.auth.login('98765 43210', 'driver');
    const b = await http.auth.login('98765 43210', 'driver');
    expect(keys(a)).toEqual(keys(b));
    expect(keys(a.user)).toEqual(keys(b.user));
    expect(keys(a.tenant)).toEqual(keys(b.tenant));
    expect(a.user.roleKey).toBe(b.user.roleKey);
    expect(a.tenant.name).toBe(b.tenant.name);
  });

  it('attendance.status returns the same Attendance shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = await mock.attendance.status();
    const b = await http.attendance.status();
    expect(keys(a)).toEqual(keys(b));
    expect(a.checkedIn).toBe(b.checkedIn);
    expect(a.geofenceRadiusM).toBe(b.geofenceRadiusM);
  });
});
```

- [ ] **Step 2: Run it — PASS**

Run: `npm test -- src/data/__tests__/contract.test.ts`

> If `keys(a)` vs `keys(b)` differ because the mock includes `checkInAt: undefined` while the http result omits it (or vice versa), that's a real shape divergence — fix the adapter so both either include or omit optional fields consistently (prefer: omit `checkInAt` when not checked in in both). Re-run until green.

- [ ] **Step 3: Commit**

```bash
git add src/data/__tests__/contract.test.ts
git commit -m "test: add mock<->http contract reconciliation tests"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full suite**

Run: `npm test`
Expected: all suites pass (Plan 1's ~13 suites + the new data/auth/feature/contract suites).

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck` → exit 0
Run: `npm run lint` → 0 errors

- [ ] **Step 3: Bundle**

Run: `npx expo export --platform web` → no bundling errors. Delete `dist/` after.

- [ ] **Step 4: Update README status line**

In `README.md`, change the `## Status` section to:
```markdown
## Status
Plans 1–2 complete (scaffold + swappable mock→HTTP data layer + auth). Next: Plan 3
(icons, UI primitives, Splash & Login), Plan 4 (Home & Attendance).
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: mark Plan 2 (data layer & auth) complete"
```

---

## Self-Review

**1. Spec coverage (data-architecture portions of the design):**
- Swappable repository ports + mock/http adapters + factory + env flag → Tasks 3, 6, 8, 9, 12 ✓
- Domain types as the contract (no presentation) → Task 1 ✓
- Mock store w/ AsyncStorage persistence + simulated latency → Tasks 5, 6 ✓
- Auth (SecureStore tokens, persisted session, gated nav, tenant context) → Tasks 2, 10, 12 ✓
- Role-driven dashboard (roleCard per role) → Tasks 4, 6 ✓
- Read (useDashboard) + optimistic write (useCheckIn/out) → Task 11 ✓
- Contract tests (mock/http reconcilable) → Task 13 ✓
- Branding source (tenant.name/logoUrl in Session) → Task 1 (`Tenant`) + Task 10 (session exposes tenant) ✓ (header UI itself is Plan 4)
- Deferred to Plan 4 (UI): the real Login role grid + language picker, Home header rendering the school name/logo, the geo-fence Attendance screen. Plan 2 ships the data + a temporary login that authenticates for real.

**2. Placeholder scan:** No TBDs; every step has complete code. The one cross-task tweak (`useTenantId` made context-safe) is spelled out with the exact replacement in Task 11 Step 3.

**3. Type consistency:** `AppError(code,status,message)` positional everywhere. `asyncStore.get/set/remove` used (not readJson/writeJson). `Session={accessToken,refreshToken,user:Staff,tenant:Tenant}` consistent across domain, mappers, AuthProvider, contract test. `login(phone, roleKey)` consistent across AuthRepository, mock/http repos, AuthProvider.signIn, useLogin, LoginScreen. `queryKeys.dashboard/attendance(tenantId)` from Plan 1 reused. `RoleCard.kind` ∈ Role keys, matches `roleCards` map. `Repositories = {auth,dashboard,attendance}` consistent across types/factory/context.

**Note on Plan 1 carry-forward items:** This plan does not yet add the `makeQueryClient()`/i18n `_resetForTests` factories flagged in Plan 1's review; the new tests here create their own `new QueryClient(...)` per test (Task 11) and clear AsyncStorage in `beforeEach`, so isolation holds without them. Revisit those factories if a future task needs to reset the singleton.
