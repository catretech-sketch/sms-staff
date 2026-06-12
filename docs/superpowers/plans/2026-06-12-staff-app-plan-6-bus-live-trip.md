# Staff App — Plan 6: Bus Live Trip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Depends on Plan 5 (role refactor) being merged first** — it uses the `conductor` role and the `'Bus / Students'` duty post.

**Goal:** Give the bus driver and conductor a "Live Trip" feature — start a trip, broadcast live GPS in the background, manage student boarding (conductor), and end the trip — built on a new, swappable real-time location contract (mock simulated bus now, real backend later via the one env flag).

**Architecture:** Additive new data slice (`TripRepository` with mock + http adapters) wired through the existing factory/RepositoryContext, exactly like the dashboard/attendance slices. A new `features/trip` module holds query hooks, a pure ping-queue/cadence core, a pure simulated-bus interpolation function, and a thin native broadcaster shell over `expo-location` + `expo-task-manager`. One role-gated `TripScreen` (driver Live UI; conductor adds a roster panel) is reached from a role-gated CTA on Home and presented as a stack overlay like Attendance. The map preview is an SVG `RouteStrip` (no native map dependency).

**Tech Stack:** Expo SDK 54, React 19, RN 0.81, TypeScript, `@tanstack/react-query`, `expo-location` (already installed), **`expo-task-manager` (added)**, `react-native-svg` (already installed), react-i18next, Jest + RNTL.

**Scope guards:**
- No `react-native-maps` in SP-1 — the SVG `RouteStrip` shows the route + moving bus dot. Real maps = SP-3.
- The **native** background-location behavior (foreground service, lock-screen streaming) cannot be exercised in jest/web export; its *logic* (cadence, buffering, offline queue, single-broadcaster) is unit-tested as pure functions, and the native shell is validated by code review + a manual device smoke test (called out in Task 9, outside the automated gate).
- `src/data/domain`, repositories, and existing repos are extended **additively**; no existing contract is modified.

**Verify the SDK before native work:** `AGENTS.md` says Expo has changed — read the versioned docs for the **installed** SDK (`expo` is `~54.0.33` in `package.json`) at https://docs.expo.dev/versions/v54.0.0/ for `expo-location` background updates + `expo-task-manager` before Task 9. If `package.json` has been bumped to 56, read v56 instead and adjust the install/config to match.

**New domain shapes (used throughout — single source of truth):**

```ts
type TripDirection = 'pickup' | 'drop';
type TripStatus    = 'idle' | 'live' | 'ended';
type BoardingState = 'boarded' | 'dropped' | 'absent';
Stop          = { id; name; lat; lng; seq; etaMin? };
Route         = { id; name; assignedBusNo; stops: Stop[] };
Trip          = { id; routeId; busNo; driverId; conductorId?; direction; status; startedAt?; endedAt?; broadcasterId? };
TripPing      = { tripId; lat; lng; speedKmh; heading; at };
StudentLite   = { id; name; stopId; photoUrl? };
Boarding      = { tripId; studentId; stopId; state; at };
TripSummary   = { tripId; durationMin; distanceKm; stopsCovered; boardedCount };
TripAssignment= { route: Route; busNo; conductorName?: string | null };
```

---

### Task 1: Trip domain types

**Files:**
- Create: `src/data/domain/trip.ts`
- Modify: `src/data/domain/index.ts`

- [ ] **Step 1: Create `src/data/domain/trip.ts`**

```ts
export type TripDirection = 'pickup' | 'drop';
export type TripStatus = 'idle' | 'live' | 'ended';
export type BoardingState = 'boarded' | 'dropped' | 'absent';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  seq: number;
  etaMin?: number;
}

export interface Route {
  id: string;
  name: string;
  assignedBusNo: string;
  stops: Stop[];
}

export interface Trip {
  id: string;
  routeId: string;
  busNo: string;
  driverId: string;
  conductorId?: string;
  direction: TripDirection;
  status: TripStatus;
  startedAt?: string;
  endedAt?: string;
  broadcasterId?: string;
}

export interface TripPing {
  tripId: string;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  at: string; // ISO timestamp
}

export interface StudentLite {
  id: string;
  name: string;
  stopId: string;
  photoUrl?: string;
}

export interface Boarding {
  tripId: string;
  studentId: string;
  stopId: string;
  state: BoardingState;
  at: string;
}

export interface TripSummary {
  tripId: string;
  durationMin: number;
  distanceKm: number;
  stopsCovered: number;
  boardedCount: number;
}

export interface TripAssignment {
  route: Route;
  busNo: string;
  conductorName?: string | null;
}
```

- [ ] **Step 2: Re-export from `src/data/domain/index.ts`**

Add this line to the barrel (next to the other `export * from './…'` lines):

```ts
export * from './trip';
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (pure additive types, no consumers yet).

- [ ] **Step 4: Commit**

```bash
git add src/data/domain/trip.ts src/data/domain/index.ts
git commit -m "feat(domain): add trip/route/boarding types for live tracking"
```

---

### Task 2: `TripRepository` port

**Files:**
- Modify: `src/data/repositories/types.ts`

- [ ] **Step 1: Add the port + extend `Repositories`**

Append the new interface and add `trip` to `Repositories`. Update the import line at the top to include the trip types:

```ts
import type {
  Session, Staff, Dashboard, Attendance,
  TripAssignment, Trip, TripPing, TripSummary, StudentLite, Boarding, TripDirection,
} from '@/data/domain';
```

Append before the closing of the file:

```ts
export interface TripRepository {
  myAssignment(): Promise<TripAssignment>;
  current(): Promise<Trip | null>;
  startTrip(routeId: string, direction: TripDirection): Promise<Trip>;
  publishPing(ping: TripPing): Promise<void>;
  endTrip(tripId: string): Promise<TripSummary>;
  roster(tripId: string): Promise<StudentLite[]>;
  setBoarding(b: Boarding): Promise<void>;
  boardingState(tripId: string): Promise<Boarding[]>;
}
```

Change the `Repositories` interface to:

```ts
export interface Repositories {
  auth: AuthRepository;
  dashboard: DashboardRepository;
  attendance: AttendanceRepository;
  trip: TripRepository;
}
```

- [ ] **Step 2: Typecheck (expected to fail in the factory)**

Run: `npm run typecheck`
Expected: FAIL — `factory.ts` `createMockRepositories`/`createHttpRepositories` now miss the `trip` member. Fixed in Tasks 4 & 5.

- [ ] **Step 3: Commit**

```bash
git add src/data/repositories/types.ts
git commit -m "feat(repos): add TripRepository port to Repositories"
```

---

### Task 3: Seed a route + students; extend the mock store

**Files:**
- Modify: `src/data/mock/seed.ts`
- Modify: `src/data/mock/store.ts`
- Test: `src/data/mock/__tests__/store.test.ts`

- [ ] **Step 1: Add a route + students + empty trip state to the seed**

In `src/data/mock/seed.ts`, add the import for the new types at the top (extend the existing domain import):

```ts
import type { Staff, Tenant, RoleCard, TaskPeek, Attendance, Route, StudentLite, Boarding, Trip } from '@/data/domain';
```

Before `export interface SeedShape`, add:

```ts
const route: Route = {
  id: 'route_7',
  name: 'Route 7',
  assignedBusNo: 'HR-26-BX-4412',
  stops: [
    { id: 'stop_1', name: 'School Gate', lat: 28.4595, lng: 77.0266, seq: 0 },
    { id: 'stop_2', name: 'Sector 12', lat: 28.4660, lng: 77.0410, seq: 1, etaMin: 6 },
    { id: 'stop_3', name: 'Sector 15 Market', lat: 28.4712, lng: 77.0525, seq: 2, etaMin: 12 },
    { id: 'stop_4', name: 'Green Park', lat: 28.4781, lng: 77.0648, seq: 3, etaMin: 18 },
    { id: 'stop_5', name: 'Rail Vihar', lat: 28.4850, lng: 77.0770, seq: 4, etaMin: 24 },
    { id: 'stop_6', name: 'Civil Lines', lat: 28.4925, lng: 77.0890, seq: 5, etaMin: 30 },
  ],
};

const students: StudentLite[] = [
  { id: 'stu_1', name: 'Aarav Sharma', stopId: 'stop_2' },
  { id: 'stu_2', name: 'Diya Gupta', stopId: 'stop_2' },
  { id: 'stu_3', name: 'Kabir Singh', stopId: 'stop_3' },
  { id: 'stu_4', name: 'Anaya Verma', stopId: 'stop_3' },
  { id: 'stu_5', name: 'Vivaan Mehta', stopId: 'stop_4' },
  { id: 'stu_6', name: 'Myra Reddy', stopId: 'stop_5' },
];

const conductorName = 'Sita Devi';
const currentTrip: Trip | null = null;
const boarding: Boarding[] = [];
```

Extend `SeedShape` and the exported `seed` object:

```ts
export interface SeedShape {
  staff: Staff;
  tenant: Tenant;
  roleCards: Record<Role, RoleCard>;
  tasksPeek: TaskPeek[];
  dashboardBase: typeof dashboardBase;
  attendance: Attendance;
  route: Route;
  students: StudentLite[];
  conductorName: string;
  currentTrip: Trip | null;
  boarding: Boarding[];
}

export const seed: SeedShape = {
  staff, tenant, roleCards, tasksPeek, dashboardBase, attendance,
  route, students, conductorName, currentTrip, boarding,
};
```

- [ ] **Step 2: Extend the mock `Store` (failing test first)**

In `src/data/mock/__tests__/store.test.ts`, add a test (after the existing tests, inside the top-level `describe`):

```ts
  it('seeds the bus route, students, and empty trip state', async () => {
    const store = await createStore();
    expect(store.route.stops.length).toBe(6);
    expect(store.students.length).toBe(6);
    expect(store.currentTrip).toBeNull();
    expect(store.boarding).toEqual([]);
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/data/mock/__tests__/store.test.ts`
Expected: FAIL — `store.route` is undefined.

- [ ] **Step 4: Add the fields to `Store` and `createStore`**

In `src/data/mock/store.ts`:

Extend the import:

```ts
import type { Session, Attendance, Route, StudentLite, Boarding, Trip, TripPing } from '@/data/domain';
```

Add to the `Store` interface (after `tasksPeek`):

```ts
  route: typeof seed.route;
  students: typeof seed.students;
  conductorName: string;
  currentTrip: Trip | null;
  boarding: Boarding[];
  pings: TripPing[];
  persistTrip(): Promise<void>;
```

In `createStore`, hydrate trip state from AsyncStorage (after the `attendance` hydrate line):

```ts
  const currentTrip = (await asyncStore.get<Trip | null>(`${KEY}trip`)) ?? clone(seed.currentTrip);
  const boarding = (await asyncStore.get<Boarding[]>(`${KEY}boarding`)) ?? clone(seed.boarding);
```

Add these to the returned `store` object (after `tasksPeek: clone(seed.tasksPeek),`):

```ts
    route: clone(seed.route),
    students: clone(seed.students),
    conductorName: seed.conductorName,
    currentTrip,
    boarding,
    pings: [],
    async persistTrip() {
      await asyncStore.set(`${KEY}trip`, store.currentTrip);
      await asyncStore.set(`${KEY}boarding`, store.boarding);
    },
```

- [ ] **Step 5: Run the test + typecheck**

Run: `npm test -- src/data/mock/__tests__/store.test.ts`
Expected: PASS.
Run: `npm run typecheck`
Expected: still FAIL only in `factory.ts` (trip repos missing — next tasks).

- [ ] **Step 6: Commit**

```bash
git add src/data/mock/seed.ts src/data/mock/store.ts src/data/mock/__tests__/store.test.ts
git commit -m "feat(mock): seed bus route + students + trip state in store"
```

---

### Task 4: Mock `TripRepository` + wire the mock factory

**Files:**
- Create: `src/data/mock/trip.repo.ts`
- Modify: `src/data/repositories/factory.ts:4-17`
- Test: `src/data/mock/__tests__/trip.repo.test.ts`

- [ ] **Step 1: Write the mock-repo test (failing)**

Create `src/data/mock/__tests__/trip.repo.test.ts`:

```ts
import { createStore } from '@/data/mock/store';
import { mockTrip } from '@/data/mock/trip.repo';

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

describe('mock trip repository', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('returns the assigned route, bus number, and conductor', async () => {
    const repo = mockTrip(await createStore());
    const a = await repo.myAssignment();
    expect(a.route.name).toBe('Route 7');
    expect(a.busNo).toBe('HR-26-BX-4412');
    expect(a.conductorName).toBe('Sita Devi');
  });

  it('starts a trip, exposes it via current(), and ends it with a summary', async () => {
    const repo = mockTrip(await createStore());
    expect(await repo.current()).toBeNull();
    const trip = await repo.startTrip('route_7', 'pickup');
    expect(trip.status).toBe('live');
    expect(trip.direction).toBe('pickup');
    const cur = await repo.current();
    expect(cur?.id).toBe(trip.id);
    const summary = await repo.endTrip(trip.id);
    expect(summary.tripId).toBe(trip.id);
    expect(summary.stopsCovered).toBe(6);
    expect(await repo.current()).toBeNull();
  });

  it('startTrip is idempotent while a trip is live (single active broadcaster)', async () => {
    const repo = mockTrip(await createStore());
    const t1 = await repo.startTrip('route_7', 'pickup');
    const t2 = await repo.startTrip('route_7', 'drop');
    expect(t2.id).toBe(t1.id);
  });

  it('tracks boarding state and counts boarded students in the summary', async () => {
    const repo = mockTrip(await createStore());
    const trip = await repo.startTrip('route_7', 'pickup');
    await repo.setBoarding({ tripId: trip.id, studentId: 'stu_1', stopId: 'stop_2', state: 'boarded', at: '2026-06-12T08:00:00Z' });
    await repo.setBoarding({ tripId: trip.id, studentId: 'stu_2', stopId: 'stop_2', state: 'boarded', at: '2026-06-12T08:01:00Z' });
    await repo.setBoarding({ tripId: trip.id, studentId: 'stu_1', stopId: 'stop_2', state: 'dropped', at: '2026-06-12T08:30:00Z' });
    const state = await repo.boardingState(trip.id);
    expect(state.find((b) => b.studentId === 'stu_1')?.state).toBe('dropped');
    const summary = await repo.endTrip(trip.id);
    expect(summary.boardedCount).toBe(1); // only stu_2 still 'boarded'
  });

  it('roster returns the seeded students', async () => {
    const repo = mockTrip(await createStore());
    const trip = await repo.startTrip('route_7', 'pickup');
    const roster = await repo.roster(trip.id);
    expect(roster.length).toBe(6);
    expect(roster[0].name).toBe('Aarav Sharma');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/data/mock/__tests__/trip.repo.test.ts`
Expected: FAIL — `@/data/mock/trip.repo` does not exist.

- [ ] **Step 3: Create `src/data/mock/trip.repo.ts`**

```ts
import type { TripRepository } from '@/data/repositories/types';
import type {
  TripAssignment, Trip, TripPing, TripSummary, StudentLite, Boarding, TripDirection,
} from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function mockTrip(store: Store): TripRepository {
  return {
    async myAssignment(): Promise<TripAssignment> {
      await simulateLatency();
      return clone({
        route: store.route,
        busNo: store.route.assignedBusNo,
        conductorName: store.conductorName,
      });
    },

    async current(): Promise<Trip | null> {
      await simulateLatency();
      return store.currentTrip ? clone(store.currentTrip) : null;
    },

    async startTrip(routeId: string, direction: TripDirection): Promise<Trip> {
      await simulateLatency();
      // Single active broadcaster: if a trip is already live, return it unchanged.
      if (store.currentTrip && store.currentTrip.status === 'live') {
        return clone(store.currentTrip);
      }
      const trip: Trip = {
        id: store.genId('trip'),
        routeId,
        busNo: store.route.assignedBusNo,
        driverId: store.session.user.id,
        direction,
        status: 'live',
        startedAt: new Date().toISOString(),
        broadcasterId: store.session.user.id,
      };
      store.currentTrip = trip;
      store.boarding = [];
      store.pings = [];
      await store.persistTrip();
      return clone(trip);
    },

    async publishPing(ping: TripPing): Promise<void> {
      await simulateLatency();
      if (!store.currentTrip || store.currentTrip.status !== 'live') return;
      store.pings.push(ping);
      if (store.pings.length > 500) store.pings.shift();
    },

    async endTrip(tripId: string): Promise<TripSummary> {
      await simulateLatency();
      const trip = store.currentTrip;
      const startedMs = trip?.startedAt ? Date.parse(trip.startedAt) : Date.now();
      const durationMin = Math.max(0, Math.round((Date.now() - startedMs) / 60000));
      const boardedCount = store.boarding.filter((b) => b.state === 'boarded').length;
      const summary: TripSummary = {
        tripId,
        durationMin,
        distanceKm: Math.round((store.pings.length * 0.05) * 10) / 10,
        stopsCovered: store.route.stops.length,
        boardedCount,
      };
      if (trip) {
        trip.status = 'ended';
        trip.endedAt = new Date().toISOString();
      }
      store.currentTrip = null;
      await store.persistTrip();
      return summary;
    },

    async roster(): Promise<StudentLite[]> {
      await simulateLatency();
      return clone(store.students);
    },

    async setBoarding(b: Boarding): Promise<void> {
      await simulateLatency();
      const idx = store.boarding.findIndex((x) => x.studentId === b.studentId);
      if (idx >= 0) store.boarding[idx] = b;
      else store.boarding.push(b);
      await store.persistTrip();
    },

    async boardingState(): Promise<Boarding[]> {
      await simulateLatency();
      return clone(store.boarding);
    },
  };
}
```

- [ ] **Step 4: Wire into the mock factory**

In `src/data/repositories/factory.ts`, add the import:

```ts
import { mockTrip } from '@/data/mock/trip.repo';
```

Add `trip: mockTrip(store),` to the object returned by `createMockRepositories`.

- [ ] **Step 5: Run the test**

Run: `npm test -- src/data/mock/__tests__/trip.repo.test.ts`
Expected: PASS. (`npm run typecheck` still fails only on `createHttpRepositories` — next task.)

- [ ] **Step 6: Commit**

```bash
git add src/data/mock/trip.repo.ts src/data/repositories/factory.ts src/data/mock/__tests__/trip.repo.test.ts
git commit -m "feat(mock): TripRepository — lifecycle, boarding, single broadcaster"
```

---

### Task 5: HTTP `TripRepository` + mappers + wire the http factory + contract test

**Files:**
- Modify: `src/data/http/mappers.ts`
- Create: `src/data/http/trip.repo.ts`
- Modify: `src/data/repositories/factory.ts`
- Test: `src/data/__tests__/contract.test.ts`

- [ ] **Step 1: Add trip DTOs + mappers to `mappers.ts`**

Append to `src/data/http/mappers.ts`:

```ts
import type {
  Route, Stop, Trip, TripSummary, StudentLite, Boarding, TripAssignment,
  TripDirection, TripStatus, BoardingState,
} from '@/data/domain';

export interface StopDTO { id: string; name: string; lat: number; lng: number; seq: number; eta_min?: number; }
export interface RouteDTO { id: string; name: string; assigned_bus_no: string; stops: StopDTO[]; }
export interface TripDTO {
  id: string; route_id: string; bus_no: string; driver_id: string; conductor_id?: string;
  direction: TripDirection; status: TripStatus; started_at?: string; ended_at?: string; broadcaster_id?: string;
}
export interface TripSummaryDTO { trip_id: string; duration_min: number; distance_km: number; stops_covered: number; boarded_count: number; }
export interface StudentLiteDTO { id: string; name: string; stop_id: string; photo_url?: string; }
export interface BoardingDTO { trip_id: string; student_id: string; stop_id: string; state: BoardingState; at: string; }
export interface TripAssignmentDTO { route: RouteDTO; bus_no: string; conductor_name?: string | null; }

export const toStop = (d: StopDTO): Stop => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, seq: d.seq, etaMin: d.eta_min });
export const toRoute = (d: RouteDTO): Route => ({ id: d.id, name: d.name, assignedBusNo: d.assigned_bus_no, stops: d.stops.map(toStop) });
export const toTrip = (d: TripDTO): Trip => ({
  id: d.id, routeId: d.route_id, busNo: d.bus_no, driverId: d.driver_id, conductorId: d.conductor_id,
  direction: d.direction, status: d.status, startedAt: d.started_at, endedAt: d.ended_at, broadcasterId: d.broadcaster_id,
});
export const toTripSummary = (d: TripSummaryDTO): TripSummary => ({
  tripId: d.trip_id, durationMin: d.duration_min, distanceKm: d.distance_km, stopsCovered: d.stops_covered, boardedCount: d.boarded_count,
});
export const toStudentLite = (d: StudentLiteDTO): StudentLite => ({ id: d.id, name: d.name, stopId: d.stop_id, photoUrl: d.photo_url });
export const toBoarding = (d: BoardingDTO): Boarding => ({ tripId: d.trip_id, studentId: d.student_id, stopId: d.stop_id, state: d.state, at: d.at });
export const toTripAssignment = (d: TripAssignmentDTO): TripAssignment => ({ route: toRoute(d.route), busNo: d.bus_no, conductorName: d.conductor_name ?? null });
```

- [ ] **Step 2: Create `src/data/http/trip.repo.ts`**

```ts
import type { TripRepository } from '@/data/repositories/types';
import type { TripPing, Boarding, TripDirection } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import {
  toTripAssignment, toTrip, toTripSummary, toStudentLite, toBoarding,
  type TripAssignmentDTO, type TripDTO, type TripSummaryDTO, type StudentLiteDTO, type BoardingDTO,
} from './mappers';

export function httpTrip(http: HttpClient): TripRepository {
  return {
    myAssignment: () => http.get<TripAssignmentDTO>('/staff/trip/assignment').then(toTripAssignment),
    current: () =>
      http.get<TripDTO | null>('/staff/trip/current').then((d) => (d ? toTrip(d) : null)),
    startTrip: (routeId: string, direction: TripDirection) =>
      http.post<TripDTO>('/staff/trips', { route_id: routeId, direction }).then(toTrip),
    publishPing: (ping: TripPing) =>
      http
        .post<void>(`/staff/trips/${ping.tripId}/pings`, {
          lat: ping.lat, lng: ping.lng, speed_kmh: ping.speedKmh, heading: ping.heading, at: ping.at,
        })
        .then(() => undefined),
    endTrip: (tripId: string) =>
      http.post<TripSummaryDTO>(`/staff/trips/${tripId}/end`, {}).then(toTripSummary),
    roster: (tripId: string) =>
      http.get<StudentLiteDTO[]>(`/staff/trips/${tripId}/roster`).then((arr) => arr.map(toStudentLite)),
    setBoarding: (b: Boarding) =>
      http
        .post<void>(`/staff/trips/${b.tripId}/boarding`, {
          student_id: b.studentId, stop_id: b.stopId, state: b.state, at: b.at,
        })
        .then(() => undefined),
    boardingState: (tripId: string) =>
      http.get<BoardingDTO[]>(`/staff/trips/${tripId}/boarding`).then((arr) => arr.map(toBoarding)),
  };
}
```

- [ ] **Step 3: Wire into the http factory**

In `src/data/repositories/factory.ts`, add the import `import { httpTrip } from '@/data/http/trip.repo';` and add `trip: httpTrip(http),` to `createHttpRepositories`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (factory now complete for both adapters).

- [ ] **Step 5: Extend the contract test (mock vs http assignment shape)**

In `src/data/__tests__/contract.test.ts`, add a route to the `routes` map inside `fixtureHttp()`:

```ts
    'GET /staff/trip/assignment': {
      route: {
        id: 'route_7', name: 'Route 7', assigned_bus_no: 'HR-26-BX-4412',
        stops: [{ id: 'stop_1', name: 'School Gate', lat: 28.4595, lng: 77.0266, seq: 0 }],
      },
      bus_no: 'HR-26-BX-4412', conductor_name: 'Sita Devi',
    },
```

Add a test inside the `describe` block:

```ts
  it('trip.myAssignment returns the same TripAssignment shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = await mock.trip.myAssignment();
    const b = await http.trip.myAssignment();
    expect(keys(a)).toEqual(keys(b));
    expect(keys(a.route)).toEqual(keys(b.route));
    expect(a.busNo).toBe(b.busNo);
    expect(a.conductorName).toBe(b.conductorName);
  });
```

- [ ] **Step 6: Run the contract test**

Run: `npm test -- src/data/__tests__/contract.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/http/mappers.ts src/data/http/trip.repo.ts src/data/repositories/factory.ts src/data/__tests__/contract.test.ts
git commit -m "feat(http): TripRepository adapter + mappers + contract test"
```

---

### Task 6: Simulated-bus interpolation (pure function)

**Files:**
- Create: `src/features/trip/simulateBus.ts`
- Test: `src/features/trip/__tests__/simulateBus.test.ts`

- [ ] **Step 1: Write the test (failing)**

Create `src/features/trip/__tests__/simulateBus.test.ts`:

```ts
import { simulateBusPosition } from '@/features/trip/simulateBus';
import type { Route } from '@/data/domain';

const route: Route = {
  id: 'r', name: 'R', assignedBusNo: 'B',
  stops: [
    { id: 's0', name: 'A', lat: 0, lng: 0, seq: 0 },
    { id: 's1', name: 'B', lat: 0, lng: 10, seq: 1 },
    { id: 's2', name: 'C', lat: 0, lng: 20, seq: 2 },
  ],
};

it('sits at the first stop at elapsed 0', () => {
  const p = simulateBusPosition(route, 0, 60_000);
  expect(p.lat).toBeCloseTo(0);
  expect(p.lng).toBeCloseTo(0);
});

it('reaches the final stop at/after total duration', () => {
  const p = simulateBusPosition(route, 60_000, 60_000);
  expect(p.lng).toBeCloseTo(20);
});

it('is monotonic along the route and stays on the line', () => {
  const a = simulateBusPosition(route, 15_000, 60_000);
  const b = simulateBusPosition(route, 30_000, 60_000);
  expect(b.lng).toBeGreaterThan(a.lng);
  expect(a.lat).toBeCloseTo(0); // straight east line → lat stays 0
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/features/trip/__tests__/simulateBus.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/features/trip/simulateBus.ts`**

```ts
import type { Route } from '@/data/domain';

export interface SimPosition {
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  segmentIndex: number;
}

// Linearly interpolate the bus along the route's stops over [0, totalMs].
// Pure + deterministic — used for the mock/demo when no device GPS is available.
export function simulateBusPosition(route: Route, elapsedMs: number, totalMs: number): SimPosition {
  const stops = route.stops;
  if (stops.length === 0) return { lat: 0, lng: 0, heading: 0, speedKmh: 0, segmentIndex: 0 };
  if (stops.length === 1) return { lat: stops[0].lat, lng: stops[0].lng, heading: 0, speedKmh: 0, segmentIndex: 0 };

  const clamped = Math.max(0, Math.min(1, totalMs > 0 ? elapsedMs / totalMs : 0));
  const segCount = stops.length - 1;
  const pos = clamped * segCount;
  const i = Math.min(segCount - 1, Math.floor(pos));
  const f = pos - i;
  const a = stops[i];
  const b = stops[i + 1];
  const lat = a.lat + (b.lat - a.lat) * f;
  const lng = a.lng + (b.lng - a.lng) * f;
  const heading = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
  const speedKmh = clamped >= 1 ? 0 : 28;
  return { lat, lng, heading, speedKmh, segmentIndex: i };
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/features/trip/__tests__/simulateBus.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/trip/simulateBus.ts src/features/trip/__tests__/simulateBus.test.ts
git commit -m "feat(trip): pure simulated-bus interpolation"
```

---

### Task 7: Trip query keys + feature hooks

**Files:**
- Modify: `src/lib/queryClient.ts:16-20`
- Create: `src/features/trip/hooks.ts`
- Test: `src/features/trip/__tests__/hooks.test.tsx`

- [ ] **Step 1: Add trip query keys**

In `src/lib/queryClient.ts`, add to the `queryKeys` object:

```ts
  tripAssignment: (tenantId: string) => ['trip', 'assignment', tenantId] as const,
  tripCurrent: (tenantId: string) => ['trip', 'current', tenantId] as const,
  tripRoster: (tripId: string) => ['trip', 'roster', tripId] as const,
  tripBoarding: (tripId: string) => ['trip', 'boarding', tripId] as const,
```

- [ ] **Step 2: Write the hooks test (failing)**

Create `src/features/trip/__tests__/hooks.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { useTripAssignment } from '@/features/trip/hooks';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});

async function wrapper() {
  const repos = createMockRepositories(await createStore());
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepositoryProvider repositories={repos}>{children}</RepositoryProvider>
    </QueryClientProvider>
  );
}

it('useTripAssignment loads the assigned route', async () => {
  const Wrapper = await wrapper();
  const { result } = renderHook(() => useTripAssignment(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.route.name).toBe('Route 7');
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- src/features/trip/__tests__/hooks.test.tsx`
Expected: FAIL — `@/features/trip/hooks` does not exist.

- [ ] **Step 4: Create `src/features/trip/hooks.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { TripDirection, Boarding } from '@/data/domain';

export function useTripAssignment() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.tripAssignment(tenantId),
    queryFn: () => repos.trip.myAssignment(),
  });
}

export function useCurrentTrip() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.tripCurrent(tenantId),
    queryFn: () => repos.trip.current(),
  });
}

export function useStartTrip() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: (vars: { routeId: string; direction: TripDirection }) =>
      repos.trip.startTrip(vars.routeId, vars.direction),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tripCurrent(tenantId) }),
  });
}

export function useEndTrip() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: (tripId: string) => repos.trip.endTrip(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tripCurrent(tenantId) }),
  });
}

export function useRoster(tripId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.tripRoster(tripId ?? 'none'),
    queryFn: () => repos.trip.roster(tripId as string),
    enabled: !!tripId,
  });
}

export function useBoarding(tripId: string | undefined) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.tripBoarding(tripId ?? 'none'),
    queryFn: () => repos.trip.boardingState(tripId as string),
    enabled: !!tripId,
  });
  const setBoarding = useMutation({
    mutationFn: (b: Boarding) => repos.trip.setBoarding(b),
    onMutate: async (b) => {
      const key = queryKeys.tripBoarding(b.tripId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Boarding[]>(key) ?? [];
      const next = prev.filter((x) => x.studentId !== b.studentId).concat(b);
      qc.setQueryData<Boarding[]>(key, next);
      return { prev, key };
    },
    onError: (_e, _b, ctx) => { if (ctx) qc.setQueryData(ctx.key, ctx.prev); },
    onSettled: (_d, _e, b) => qc.invalidateQueries({ queryKey: queryKeys.tripBoarding(b.tripId) }),
  });
  return { ...query, setBoarding };
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- src/features/trip/__tests__/hooks.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queryClient.ts src/features/trip/hooks.ts src/features/trip/__tests__/hooks.test.tsx
git commit -m "feat(trip): query keys + assignment/current/start/end/roster/boarding hooks"
```

---

### Task 8: Ping queue + cadence (pure core)

**Files:**
- Create: `src/features/trip/pingQueue.ts`
- Test: `src/features/trip/__tests__/pingQueue.test.ts`

- [ ] **Step 1: Write the test (failing)**

Create `src/features/trip/__tests__/pingQueue.test.ts`:

```ts
import { shouldPublish, haversineMeters, createPingBuffer } from '@/features/trip/pingQueue';

describe('shouldPublish', () => {
  it('publishes the first ping', () => {
    expect(shouldPublish(null, { lat: 0, lng: 0, at: 1000 }, 10_000, 50)).toBe(true);
  });
  it('publishes after the cadence interval', () => {
    const last = { lat: 0, lng: 0, at: 0 };
    expect(shouldPublish(last, { lat: 0, lng: 0, at: 11_000 }, 10_000, 50)).toBe(true);
  });
  it('publishes after moving past the distance threshold', () => {
    const last = { lat: 0, lng: 0, at: 0 };
    expect(shouldPublish(last, { lat: 0.001, lng: 0, at: 1000 }, 10_000, 50)).toBe(true);
  });
  it('skips when neither time nor distance threshold is met', () => {
    const last = { lat: 0, lng: 0, at: 0 };
    expect(shouldPublish(last, { lat: 0, lng: 0, at: 1000 }, 10_000, 50)).toBe(false);
  });
});

describe('createPingBuffer (offline queue)', () => {
  it('flushes queued items in order and clears on success', async () => {
    const sent: number[] = [];
    const buf = createPingBuffer(async (p: { n: number }) => { sent.push(p.n); });
    buf.enqueue({ n: 1 });
    buf.enqueue({ n: 2 });
    await buf.flush();
    expect(sent).toEqual([1, 2]);
    expect(buf.size()).toBe(0);
  });
  it('retains items when the sender throws', async () => {
    const buf = createPingBuffer(async () => { throw new Error('offline'); });
    buf.enqueue({ n: 1 });
    await buf.flush();
    expect(buf.size()).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/features/trip/__tests__/pingQueue.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/features/trip/pingQueue.ts`**

```ts
export interface Sample { lat: number; lng: number; at: number; }

const R = 6_371_000; // earth radius (m)
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Battery-friendly gate: publish if enough time passed OR the bus moved far enough.
export function shouldPublish(
  last: Sample | null,
  next: Sample,
  cadenceMs: number,
  minMeters: number,
): boolean {
  if (!last) return true;
  if (next.at - last.at >= cadenceMs) return true;
  if (haversineMeters(last, next) >= minMeters) return true;
  return false;
}

export interface PingBuffer<T> {
  enqueue(item: T): void;
  flush(): Promise<void>;
  size(): number;
}

// FIFO buffer that flushes via `send`; on failure it keeps unsent items for the next flush.
export function createPingBuffer<T>(send: (item: T) => Promise<void>): PingBuffer<T> {
  let queue: T[] = [];
  return {
    enqueue(item) { queue.push(item); },
    size() { return queue.length; },
    async flush() {
      const pending = [...queue];
      const remaining: T[] = [];
      for (let i = 0; i < pending.length; i += 1) {
        try {
          await send(pending[i]);
        } catch {
          remaining.push(...pending.slice(i));
          break;
        }
      }
      queue = remaining;
    },
  };
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/features/trip/__tests__/pingQueue.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/trip/pingQueue.ts src/features/trip/__tests__/pingQueue.test.ts
git commit -m "feat(trip): pure ping cadence gate + offline buffer"
```

---

### Task 9: Background broadcaster (native shell) + app config

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Create: `src/features/trip/broadcaster.ts`
- Modify: `app.json`

> **Read first:** the installed-SDK docs for `expo-location` background updates (`startLocationUpdatesAsync`) + `expo-task-manager` (`TaskManager.defineTask`). The native foreground-service streaming is **not** covered by jest/web export — verify it on a physical Android device (start a trip, lock the screen, confirm the persistent notification + that pings keep arriving). This manual check is the acceptance for the native portion.

- [ ] **Step 1: Install the task-manager package**

Run: `npx expo install expo-task-manager`
Expected: `expo-task-manager` added to `package.json` dependencies at an SDK-compatible version.

- [ ] **Step 2: Create `src/features/trip/broadcaster.ts`**

```ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { TripPing } from '@/data/domain';
import { shouldPublish, type Sample } from './pingQueue';

export const TRIP_LOCATION_TASK = 'sms-trip-location';
const CADENCE_MS = 10_000;
const MIN_METERS = 50;

// The active publisher is registered at startBroadcast time and read by the task.
let activeTripId: string | null = null;
let publish: ((ping: TripPing) => Promise<void>) | null = null;
let last: Sample | null = null;

TaskManager.defineTask(TRIP_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data || !activeTripId || !publish) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const loc of locations) {
    const sample: Sample = { lat: loc.coords.latitude, lng: loc.coords.longitude, at: loc.timestamp };
    if (!shouldPublish(last, sample, CADENCE_MS, MIN_METERS)) continue;
    last = sample;
    const ping: TripPing = {
      tripId: activeTripId,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      speedKmh: Math.max(0, Math.round((loc.coords.speed ?? 0) * 3.6)),
      heading: loc.coords.heading ?? 0,
      at: new Date(loc.timestamp).toISOString(),
    };
    try { await publish(ping); } catch { /* offline — caller's buffer retries */ }
  }
});

export interface BroadcastDeps {
  tripId: string;
  onPing: (ping: TripPing) => Promise<void>;
}

// Returns true if the background stream started (permissions granted), false otherwise.
export async function startBroadcast({ tripId, onPing }: BroadcastDeps): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return false;

  activeTripId = tripId;
  publish = onPing;
  last = null;

  await Location.startLocationUpdatesAsync(TRIP_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: CADENCE_MS,
    distanceInterval: MIN_METERS,
    foregroundService: {
      notificationTitle: 'Trip live',
      notificationBody: 'Sharing the bus location with the school',
      notificationColor: '#0E5C4A',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
  return true;
}

export async function stopBroadcast(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TRIP_LOCATION_TASK);
    if (running) await Location.stopLocationUpdatesAsync(TRIP_LOCATION_TASK);
  } finally {
    activeTripId = null;
    publish = null;
    last = null;
  }
}
```

- [ ] **Step 3: Configure `app.json` for background location**

Add the `expo-location` plugin config and Android permissions to `app.json` (inside `expo`). Merge with existing keys — do not remove anything:

```json
{
  "expo": {
    "plugins": [
      ["expo-location", {
        "locationAlwaysAndWhenInUsePermission": "SchoolMate Staff uses your location to share the live bus position during a trip.",
        "isAndroidBackgroundLocationEnabled": true,
        "isAndroidForegroundServiceEnabled": true
      }]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location"],
        "NSLocationAlwaysAndWhenInUseUsageDescription": "SchoolMate Staff shares the live bus position during a trip.",
        "NSLocationWhenInUseUsageDescription": "SchoolMate Staff shares the live bus position during a trip."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ]
    }
  }
}
```

If `app.json` already has a `plugins` / `android.permissions` array, append into them rather than replacing.

- [ ] **Step 4: Typecheck + lint (the automated gate for this task)**

Run: `npm run typecheck`
Expected: PASS.
Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Manual device smoke test (native acceptance — not automated)**

On a physical Android device (`npx expo run:android` or a dev build): log in as bus driver → Start Trip → grant location (incl. "Allow all the time") → lock the screen → confirm the "Trip live" notification persists and (with mock data + a dev hook, or the real backend) pings continue. Document the result in the PR.

- [ ] **Step 6: Commit**

```bash
git add package.json src/features/trip/broadcaster.ts app.json
git commit -m "feat(trip): background location broadcaster + app config"
```

---

### Task 10: `RouteStrip` SVG map preview

**Files:**
- Create: `src/components/ui/RouteStrip.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/components/ui/__tests__/routeStrip.test.tsx`

- [ ] **Step 1: Write the test (failing)**

Create `src/components/ui/__tests__/routeStrip.test.tsx`:

```tsx
import React from 'react';
import { renderWithTheme } from '../testUtils';
import { RouteStrip } from '@/components/ui';
import type { Route } from '@/data/domain';

const route: Route = {
  id: 'r', name: 'Route 7', assignedBusNo: 'B',
  stops: [
    { id: 's0', name: 'School Gate', lat: 0, lng: 0, seq: 0 },
    { id: 's1', name: 'Sector 12', lat: 0, lng: 10, seq: 1 },
  ],
};

it('renders stop names and the current/next stop labels', () => {
  const { getByText } = renderWithTheme(
    <RouteStrip route={route} progress={0.25} accent="#E08A3C" currentStopName="School Gate" nextStopName="Sector 12" />,
  );
  expect(getByText(/Sector 12/)).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/components/ui/__tests__/routeStrip.test.tsx`
Expected: FAIL — `RouteStrip` not exported.

- [ ] **Step 3: Create `src/components/ui/RouteStrip.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Card } from './Card';
import type { Route } from '@/data/domain';

export interface RouteStripProps {
  route: Route;
  progress: number; // 0..1 along the route
  accent: string;
  currentStopName?: string;
  nextStopName?: string;
}

const W = 300;
const H = 64;
const PAD = 20;

export const RouteStrip: React.FC<RouteStripProps> = ({ route, progress, accent, currentStopName, nextStopName }) => {
  const { colors } = useTheme();
  const n = route.stops.length;
  const xs = route.stops.map((_, i) => (n <= 1 ? PAD : PAD + ((W - 2 * PAD) * i) / (n - 1)));
  const y = H / 2;
  const busX = PAD + (W - 2 * PAD) * Math.max(0, Math.min(1, progress));

  return (
    <Card>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={colors.sunken} strokeWidth={4} strokeLinecap="round" />
        <Line x1={PAD} y1={y} x2={busX} y2={y} stroke={accent} strokeWidth={4} strokeLinecap="round" />
        {xs.map((x, i) => (
          <Circle key={route.stops[i].id} cx={x} cy={y} r={5} fill={x <= busX ? accent : colors.surface} stroke={accent} strokeWidth={2} />
        ))}
        <Circle cx={busX} cy={y} r={8} fill={accent} stroke={colors.surface} strokeWidth={3} />
      </Svg>
      <View style={styles.labels}>
        <Text style={[TextScale.caption, { color: colors.inkSoft }]} numberOfLines={1}>
          {currentStopName ?? route.stops[0]?.name}
        </Text>
        <Text style={[TextScale.caption, { color: accent }]} numberOfLines={1}>
          → {nextStopName ?? route.stops[route.stops.length - 1]?.name}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
});
```

- [ ] **Step 4: Export from `src/components/ui/index.ts`**

Add:

```ts
export { RouteStrip } from './RouteStrip';
export type { RouteStripProps } from './RouteStrip';
```

- [ ] **Step 5: Run the test**

Run: `npm test -- src/components/ui/__tests__/routeStrip.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/RouteStrip.tsx src/components/ui/index.ts src/components/ui/__tests__/routeStrip.test.tsx
git commit -m "feat(ui): SVG RouteStrip live-trip preview"
```

---

### Task 11: `TripScreen` — driver Live flow

**Files:**
- Create: `src/screens/TripScreen.tsx`
- Test: `src/screens/__tests__/TripScreen.test.tsx`

This screen has three states driven by `useCurrentTrip()`: **pre-trip** (assignment + direction toggle + Start), **live** (RouteStrip + broadcasting banner + End), **ended** (summary). The conductor roster panel is added in Task 12.

- [ ] **Step 1: Write the screen test (failing)**

Create `src/screens/__tests__/TripScreen.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { TripScreen } from '@/screens/TripScreen';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});
// The screen calls the broadcaster; mock it so no native modules load in jest.
jest.mock('@/features/trip/broadcaster', () => ({
  startBroadcast: jest.fn(() => Promise.resolve(true)),
  stopBroadcast: jest.fn(() => Promise.resolve()),
}));

async function renderScreen() {
  const repos = createMockRepositories(await createStore());
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const nav = { goBack: jest.fn(), navigate: jest.fn() };
  const utils = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <RepositoryProvider repositories={repos}>
            <TripScreen navigation={nav as never} />
          </RepositoryProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return { ...utils, nav };
}

it('shows the assignment then starts a trip on Start', async () => {
  const { getByTestId, findByText } = await renderScreen();
  await findByText(/Route 7/);
  fireEvent.press(getByTestId('trip-start'));
  await waitFor(() => expect(getByTestId('trip-end')).toBeTruthy());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/screens/__tests__/TripScreen.test.tsx`
Expected: FAIL — `@/screens/TripScreen` does not exist.

- [ ] **Step 3: Create `src/screens/TripScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { IconBtn, Btn, Card, Pill, RouteStrip, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';
import { useTripAssignment, useCurrentTrip, useStartTrip, useEndTrip } from '@/features/trip/hooks';
import { startBroadcast, stopBroadcast } from '@/features/trip/broadcaster';
import type { TripDirection, TripSummary } from '@/data/domain';

export const TripScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const { colors, role } = useTheme();
  const repos = useRepositories();
  const assignment = useTripAssignment();
  const current = useCurrentTrip();
  const startTrip = useStartTrip();
  const endTrip = useEndTrip();
  const [direction, setDirection] = useState<TripDirection>('pickup');
  const [summary, setSummary] = useState<TripSummary | null>(null);

  const accent = role.accent;
  const trip = current.data;

  const onStart = async () => {
    if (!assignment.data) return;
    const started = await startTrip.mutateAsync({ routeId: assignment.data.route.id, direction });
    await startBroadcast({ tripId: started.id, onPing: (p) => repos.trip.publishPing(p) });
  };

  const onEnd = async () => {
    if (!trip) return;
    await stopBroadcast();
    const s = await endTrip.mutateAsync(trip.id);
    setSummary(s);
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <IconBtn icon="back" label={t('common.back')} onPress={() => navigation.goBack()} />
        <Text style={[TextScale.screenTitle, { color: colors.ink }]}>{t('trip.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {assignment.isLoading || current.isLoading ? (
          <Skeleton width="100%" height={160} radius={16} />
        ) : assignment.isError ? (
          <ErrorState onRetry={assignment.refetch} />
        ) : summary ? (
          <Card>
            <Text style={[TextScale.cardTitle, { color: accent }]}>{t('trip.summaryTitle')}</Text>
            <Text style={[TextScale.body, { color: colors.ink, marginTop: 8 }]}>
              {t('trip.summaryLine', { min: summary.durationMin, km: summary.distanceKm, stops: summary.stopsCovered })}
            </Text>
            <Btn label={t('common.done')} onPress={() => navigation.goBack()} accent={accent} style={styles.cta} />
          </Card>
        ) : trip ? (
          <>
            <View style={[styles.banner, { backgroundColor: accent }]}>
              <Text style={[TextScale.bodyStrong, { color: '#FFFFFF' }]}>{t('trip.broadcasting')}</Text>
            </View>
            {assignment.data && (
              <RouteStrip
                route={assignment.data.route}
                progress={0.1}
                accent={accent}
                currentStopName={assignment.data.route.stops[0]?.name}
                nextStopName={assignment.data.route.stops[1]?.name}
              />
            )}
            <Card>
              <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('trip.bus')}</Text>
              <Text style={[TextScale.body, { color: colors.ink }]}>{trip.busNo}</Text>
            </Card>
            <Btn testID="trip-end" label={t('trip.end')} onPress={onEnd} accent={colors.danger} loading={endTrip.isPending} style={styles.cta} />
          </>
        ) : (
          <>
            {assignment.data && (
              <Card>
                <Text style={[TextScale.cardTitle, { color: accent }]}>{assignment.data.route.name}</Text>
                <Text style={[TextScale.caption, { color: colors.inkSoft, marginTop: 4 }]}>{assignment.data.busNo}</Text>
                <View style={styles.pillRow}>
                  <Pill label={`${t('trip.stops')} · ${assignment.data.route.stops.length}`} color={accent} bg={colors.surface2} icon="route" />
                  {assignment.data.conductorName ? (
                    <Pill label={`${t('role.conductor')} · ${assignment.data.conductorName}`} color={colors.primary} bg={colors.primaryDim} icon="visitor" />
                  ) : null}
                </View>
              </Card>
            )}
            <View style={styles.segment}>
              {(['pickup', 'drop'] as TripDirection[]).map((d) => (
                <Pressable
                  key={d}
                  testID={`trip-dir-${d}`}
                  onPress={() => setDirection(d)}
                  style={[styles.segBtn, { backgroundColor: direction === d ? accent : colors.surface, borderColor: accent }]}
                >
                  <Text style={[TextScale.bodyStrong, { color: direction === d ? '#FFFFFF' : accent }]}>{t(`trip.dir.${d}`)}</Text>
                </Pressable>
              ))}
            </View>
            <Btn testID="trip-start" label={t('trip.start')} onPress={onStart} accent={accent} loading={startTrip.isPending} style={styles.cta} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerSpacer: { flex: 1 },
  body: { padding: 16, gap: 12 },
  banner: { borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  segment: { flexDirection: 'row', gap: 10 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  cta: { marginTop: 4 },
});
```

- [ ] **Step 4: Add the i18n strings used above (all 4 languages)**

Add these keys to `en.json` (and translated equivalents to `hi.json`, `mr.json`, `ta.json` — keep all four key-sets identical per `keys.test.ts`; Marathi/Tamil flagged for proofread):

`en.json`:
```json
  "common.back": "Back",
  "common.done": "Done",
  "trip.title": "Live Trip",
  "trip.start": "Start trip",
  "trip.end": "End trip",
  "trip.broadcasting": "Broadcasting live",
  "trip.bus": "Bus",
  "trip.stops": "Stops",
  "trip.dir.pickup": "Pickup",
  "trip.dir.drop": "Drop",
  "trip.summaryTitle": "Trip summary",
  "trip.summaryLine": "{{min}} min · {{km}} km · {{stops}} stops",
```
`hi.json`:
```json
  "common.back": "वापस",
  "common.done": "हो गया",
  "trip.title": "लाइव ट्रिप",
  "trip.start": "ट्रिप शुरू करें",
  "trip.end": "ट्रिप समाप्त करें",
  "trip.broadcasting": "लाइव प्रसारण हो रहा है",
  "trip.bus": "बस",
  "trip.stops": "स्टॉप",
  "trip.dir.pickup": "पिकअप",
  "trip.dir.drop": "ड्रॉप",
  "trip.summaryTitle": "ट्रिप सारांश",
  "trip.summaryLine": "{{min}} मिनट · {{km}} किमी · {{stops}} स्टॉप",
```
`mr.json`:
```json
  "common.back": "मागे",
  "common.done": "झाले",
  "trip.title": "लाइव्ह ट्रिप",
  "trip.start": "ट्रिप सुरू करा",
  "trip.end": "ट्रिप संपवा",
  "trip.broadcasting": "थेट प्रसारण सुरू आहे",
  "trip.bus": "बस",
  "trip.stops": "थांबे",
  "trip.dir.pickup": "पिकअप",
  "trip.dir.drop": "ड्रॉप",
  "trip.summaryTitle": "ट्रिप सारांश",
  "trip.summaryLine": "{{min}} मिनिटे · {{km}} किमी · {{stops}} थांबे",
```
`ta.json`:
```json
  "common.back": "பின்",
  "common.done": "முடிந்தது",
  "trip.title": "நேரடி பயணம்",
  "trip.start": "பயணத்தைத் தொடங்கு",
  "trip.end": "பயணத்தை முடி",
  "trip.broadcasting": "நேரடியாக ஒளிபரப்பப்படுகிறது",
  "trip.bus": "பேருந்து",
  "trip.stops": "நிறுத்தங்கள்",
  "trip.dir.pickup": "ஏற்றம்",
  "trip.dir.drop": "இறக்கம்",
  "trip.summaryTitle": "பயண சுருக்கம்",
  "trip.summaryLine": "{{min}} நிமிடம் · {{km}} கி.மீ · {{stops}} நிறுத்தங்கள்",
```

- [ ] **Step 5: Run the screen + i18n tests**

Run: `npm test -- src/screens/__tests__/TripScreen.test.tsx src/i18n`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/TripScreen.tsx src/screens/__tests__/TripScreen.test.tsx src/i18n
git commit -m "feat(trip): TripScreen driver live flow (pre-trip/live/summary)"
```

---

### Task 12: Conductor roster panel + boarding

**Files:**
- Modify: `src/screens/TripScreen.tsx`
- Test: `src/screens/__tests__/TripScreen.conductor.test.tsx`

When the logged-in role is `conductor` **and** a trip is live, the screen shows a student roster with a live headcount, each row cycling boarded → dropped → absent.

- [ ] **Step 1: Write the conductor test (failing)**

Create `src/screens/__tests__/TripScreen.conductor.test.tsx` (same harness as Task 11, but set the role to conductor before rendering):

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { TripScreen } from '@/screens/TripScreen';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});
jest.mock('@/features/trip/broadcaster', () => ({
  startBroadcast: jest.fn(() => Promise.resolve(true)),
  stopBroadcast: jest.fn(() => Promise.resolve()),
}));

// Helper that flips the theme role to conductor on mount.
const SetConductor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setRole } = useTheme();
  React.useEffect(() => { setRole('conductor'); }, [setRole]);
  return <>{children}</>;
};

async function renderConductor() {
  const repos = createMockRepositories(await createStore());
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const nav = { goBack: jest.fn(), navigate: jest.fn() };
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <SetConductor>
            <RepositoryProvider repositories={repos}>
              <TripScreen navigation={nav as never} />
            </RepositoryProvider>
          </SetConductor>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

it('shows the roster + headcount after starting a trip and boards a student', async () => {
  const { getByTestId, findByText } = await renderConductor();
  await findByText(/Route 7/);
  fireEvent.press(getByTestId('trip-start'));
  await waitFor(() => expect(getByTestId('roster-stu_1')).toBeTruthy());
  fireEvent.press(getByTestId('roster-stu_1'));
  await waitFor(() => expect(getByTestId('headcount').props.children).toMatch(/1/));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/screens/__tests__/TripScreen.conductor.test.tsx`
Expected: FAIL — no `roster-*` / `headcount` testIDs yet.

- [ ] **Step 3: Add the roster panel to `TripScreen.tsx`**

Add imports near the top:

```ts
import { useRoster, useBoarding } from '@/features/trip/hooks';
import type { BoardingState } from '@/data/domain';
```

Add a `RosterPanel` component at the bottom of the file (before the `styles` declaration), then render it inside the `trip ?` branch (only for conductor):

```tsx
const NEXT: Record<BoardingState, BoardingState> = { boarded: 'dropped', dropped: 'absent', absent: 'boarded' };

const RosterPanel: React.FC<{ tripId: string; accent: string }> = ({ tripId, accent }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const roster = useRoster(tripId);
  const boarding = useBoarding(tripId);
  const stateFor = (studentId: string): BoardingState =>
    boarding.data?.find((b) => b.studentId === studentId)?.state ?? 'absent';
  const onBoard = roster.data?.filter((s) => stateFor(s.id) === 'boarded').length ?? 0;
  const total = roster.data?.length ?? 0;

  return (
    <Card>
      <View style={styles.rosterHead}>
        <Text style={[TextScale.cardTitle, { color: accent }]}>{t('trip.roster')}</Text>
        <Text testID="headcount" style={[TextScale.bodyStrong, { color: colors.ink }]}>{`${onBoard} / ${total}`}</Text>
      </View>
      {roster.data?.map((s) => {
        const st = stateFor(s.id);
        const color = st === 'boarded' ? colors.success : st === 'dropped' ? colors.inkSoft : colors.danger;
        return (
          <Pressable
            key={s.id}
            testID={`roster-${s.id}`}
            onPress={() => boarding.setBoarding.mutate({ tripId, studentId: s.id, stopId: s.stopId, state: NEXT[st], at: new Date().toISOString() })}
            style={[styles.rosterRow, { borderColor: colors.sunken }]}
          >
            <Text style={[TextScale.body, { color: colors.ink, flex: 1 }]}>{s.name}</Text>
            <Text style={[TextScale.caption, { color }]}>{t(`trip.boarding.${st}`)}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
};
```

Inside the `trip ?` branch JSX (after the bus `Card`, before the End button), add:

```tsx
            {role.key === 'conductor' && <RosterPanel tripId={trip.id} accent={accent} />}
```

Add these styles to the `StyleSheet.create`:

```ts
  rosterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1 },
```

- [ ] **Step 4: Add the boarding-state i18n keys (all 4 languages)**

`en.json`:
```json
  "trip.roster": "Students",
  "trip.boarding.boarded": "On board",
  "trip.boarding.dropped": "Dropped",
  "trip.boarding.absent": "Absent",
```
`hi.json`:
```json
  "trip.roster": "छात्र",
  "trip.boarding.boarded": "सवार",
  "trip.boarding.dropped": "उतर गए",
  "trip.boarding.absent": "अनुपस्थित",
```
`mr.json`:
```json
  "trip.roster": "विद्यार्थी",
  "trip.boarding.boarded": "चढले",
  "trip.boarding.dropped": "उतरले",
  "trip.boarding.absent": "अनुपस्थित",
```
`ta.json`:
```json
  "trip.roster": "மாணவர்கள்",
  "trip.boarding.boarded": "ஏறினார்",
  "trip.boarding.dropped": "இறங்கினார்",
  "trip.boarding.absent": "வரவில்லை",
```

- [ ] **Step 5: Run the conductor + i18n tests**

Run: `npm test -- src/screens/__tests__/TripScreen.conductor.test.tsx src/i18n`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/TripScreen.tsx src/screens/__tests__/TripScreen.conductor.test.tsx src/i18n
git commit -m "feat(trip): conductor roster panel + optimistic boarding + headcount"
```

---

### Task 13: Navigation — role-gated Trip route + Home entry

**Files:**
- Modify: `src/navigation/types.ts:6-9`
- Modify: `src/navigation/MainTabNavigator.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Test: `src/screens/__tests__/HomeScreen.test.tsx`

- [ ] **Step 1: Add `Trip` to the stack param list**

In `src/navigation/types.ts`, change `MainStackParamList` to:

```ts
export type MainStackParamList = {
  Tabs: undefined;
  Attendance: undefined;
  Trip: undefined;
};
```

- [ ] **Step 2: Register the Trip overlay route**

In `src/navigation/MainTabNavigator.tsx`, add the import `import { TripScreen } from '@/screens/TripScreen';` and a sibling screen in the outer `Stack.Navigator` (next to Attendance):

```tsx
    <Stack.Screen
      name="Trip"
      component={TripScreen}
      options={{ presentation: 'card', animation: 'slide_from_right' }}
    />
```

- [ ] **Step 3: Add a role-gated CTA on Home (failing test first)**

In `src/screens/__tests__/HomeScreen.test.tsx`, add a test that the Trip CTA shows for a bus role and not for a non-bus role. (Use the file's existing render harness; if it logs in as `driver` by default, assert presence; add a second case forcing a non-bus role via the theme.) Add:

```tsx
it('shows the Live Trip CTA for the bus driver role', async () => {
  // (uses the existing harness in this file, which renders Home for the seeded driver)
  const { findByTestId } = renderHome(); // <- use this file's existing render helper
  expect(await findByTestId('home-open-trip')).toBeTruthy();
});
```

If the existing test file uses a different render helper name, match it; the assertion is that `home-open-trip` exists for the driver role.

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- src/screens/__tests__/HomeScreen.test.tsx`
Expected: FAIL — no `home-open-trip` testID.

- [ ] **Step 5: Render the CTA in `HomeScreen.tsx`**

Add `Btn` to the `@/components/ui` import. After the `RoleSpecializedCard` `Animated.View` block (the one with `delay(130)`), add:

```tsx
        {(role.key === 'driver' || role.key === 'conductor') && (
          <Animated.View entering={FadeInDown.delay(160).duration(300)}>
            <Btn
              testID="home-open-trip"
              label={t('trip.open')}
              icon="bus"
              accent={role.accent}
              onPress={() => navigation.navigate('Trip')}
            />
          </Animated.View>
        )}
```

- [ ] **Step 6: Add the `trip.open` i18n key (all 4 languages)**

- `en.json`: `"trip.open": "Open Live Trip",`
- `hi.json`: `"trip.open": "लाइव ट्रिप खोलें",`
- `mr.json`: `"trip.open": "लाइव्ह ट्रिप उघडा",`
- `ta.json`: `"trip.open": "நேரடி பயணத்தைத் திற",`

- [ ] **Step 7: Run the Home + i18n tests**

Run: `npm test -- src/screens/__tests__/HomeScreen.test.tsx src/i18n`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/navigation/types.ts src/navigation/MainTabNavigator.tsx src/screens/HomeScreen.tsx src/screens/__tests__/HomeScreen.test.tsx src/i18n
git commit -m "feat(nav): role-gated Trip overlay + Home Live Trip CTA"
```

---

### Task 14: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite** — Run: `npm test` — Expected: all suites PASS.
- [ ] **Step 2: Typecheck** — Run: `npm run typecheck` — Expected: 0 errors.
- [ ] **Step 3: Lint** — Run: `npm run lint` — Expected: 0 errors.
- [ ] **Step 4: Web export** — Run: `npx expo export --platform web` — Expected: succeeds. (The broadcaster's native modules are only invoked on press, so web export of the bundle still builds.)
- [ ] **Step 5: Device smoke test (manual, native acceptance)** — per Task 9 Step 5: driver Start Trip → lock screen → notification persists. Record in the PR.
- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore(trip): live-trip verification — suite/typecheck/lint/export green" --allow-empty
```

---

## Self-Review

- **Spec coverage:** location contract (`TripRepository` + domain) ✓ Tasks 1–2; mock simulated bus ✓ Tasks 4/6; http adapter = backend contract ✓ Task 5; driver start→live→end + background broadcast ✓ Tasks 7–9, 11; conductor roster/headcount + fallback broadcaster (same broadcaster module, role-gated) ✓ Task 12; route preview ✓ Task 10; permissions UX (foreground+background request, graceful `false` return) ✓ Task 9; offline queue + cadence ✓ Task 8; role-gated Trip nav ✓ Task 13; 4-language i18n ✓ Tasks 11–13; tests (contract/pure/hook/component/screen) ✓ throughout. Single active broadcaster enforced in the mock ✓ Task 4.
- **Placeholder scan:** none — every code step has full code; the one soft reference (Task 13 Step 3 "use this file's existing render helper") is unavoidable without the HomeScreen test's current helper name and is bounded to a single assertion (`home-open-trip` exists for driver).
- **Type consistency:** `TripPing` fields (`speedKmh`,`heading`) match between domain (Task 1), mapper body (`speed_kmh`,`heading`, Task 5), and broadcaster (Task 9). `TripDirection` `'pickup'|'drop'` consistent in domain, repo, hooks, and screen segmented control. `BoardingState` cycle `boarded→dropped→absent` matches the `NEXT` map (Task 12) and i18n keys. `queryKeys.trip*` defined in Task 7 and used only there.
- **Scope:** additive to the data layer; no existing repo/contract modified; no `react-native-maps`; native background behavior explicitly outside the automated gate.

## Out of scope (this plan)

- Real backend + real-time fan-out (SP-2); consumer live map in parent/teacher/principal (SP-3); CRM fleet view (SP-4).
- Finishing Roster/Leave/Tasks/Profile screens (Plan 7).
- A full interactive Google/Apple map on the staff side (SVG `RouteStrip` is sufficient for the broadcaster).
