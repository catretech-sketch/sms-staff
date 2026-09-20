# Driver Stop-Sequence Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `LiveMapScreen`'s GPS-proximity-driven "next stop" card into an explicit, driver-driven pickup workflow: approaching a stop, arriving, bulk-marking students picked up, and auto-advancing through the route to completion.

**Architecture:** A new pure derivation module (`stopProgress.ts`) computes which stop is "active" from `stops` + `roster` + `boarding` data alone — the first stop (in `seq` order) that doesn't yet have every assigned student resolved (`boarded`/`dropped`). A thin hook (`useStopProgress`) wraps that with GPS-arrival detection (within 50m of the active stop, or a manual override) to produce a final `EN_ROUTE` / `PICKUP_IN_PROGRESS` / `ROUTE_COMPLETED` state. `LiveMapScreen`'s existing bottom-sheet card is made state-conditional on top of this, reusing its existing distance/ETA calculation and per-student list.

The spec's 6-state machine collapses to 3 *observable* states here: `NOT_STARTED` is handled upstream (this screen only renders once a trip is live), and `ARRIVED_AT_STOP` has no UI distinct from `PICKUP_IN_PROGRESS` (the spec itself groups them in one bottom-sheet section), so the hook returns `PICKUP_IN_PROGRESS` directly once arrival is detected — there is no separate transient render for "arrived but pickup UI not yet shown". `STOP_COMPLETED`'s spec'd "~1 second confirmation" is implemented as local component state in Task 4 (a `justCompletedStopName` string held for 1200ms via `setTimeout`), not as a value the hook returns — because completion is inherently transient screen furniture (an overlay confirming what just happened), not a fact derivable from `stops`/`roster`/`boarding` the way the other states are.

**Tech Stack:** React Native/Expo, TanStack React Query (existing `useBoarding`/`useRoster`/`useTripAssignment` hooks, untouched), `expo-location` (untouched), `react-native`'s `Linking` API (new usage, no new dependency), i18next.

**Spec:** `docs/superpowers/specs/2026-09-20-stop-sequence-workflow-design.md`

## Global Constraints

- No `OFF_ROUTE`/`RECALCULATING` states — out of scope (a later sub-project).
- The "active stop" is always derived from `stops`/`roster`/`boarding` data, never stored client-side or server-side, and always advances forward through `seq` order — never re-picked by GPS proximity.
- Arrival auto-detection uses a fixed **50 meter** radius from the active stop's coordinates.
- A manual "I've arrived" fallback button is shown only when GPS is unavailable (permission denied or `watchPositionAsync` failed) — it is not a general alternative to auto-detection.
- "Mark Students Picked Up" bulk-marks every unresolved assigned student at the active stop as `boarded`, via the existing `boarding.setBoarding` mutation (looped) — no new backend endpoint, no new repository method.
- Distance/ETA to the active stop reuses the existing straight-line `distanceMeters` calculation already in `LiveMapScreen` — no new routing call in this plan.
- "Navigate" opens `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` via `Linking.openURL` (works across iOS/Android/web without a new dependency).
- Every new i18n key must be added to all four locale files (`en.json`, `hi.json`, `mr.json`, `ta.json`) — `src/i18n/__tests__/keys.test.ts` enforces identical key sets across all four and will fail the build otherwise.
- `stopRoles.ts`/`nearestStop.ts` (used for map marker coloring — completed/current/next/upcoming pin styling) are untouched; this plan only changes what identifies the *bottom sheet's* active stop.

---

### Task 1: Pure stop-progress derivation

**Files:**
- Create: `src/features/trip/stopProgress.ts`
- Test: `src/features/trip/__tests__/stopProgress.test.ts`

**Interfaces:**
- Consumes: `Stop` (`{ id, name, lat, lng, seq, etaMin? }`), `StudentLite` (`{ id, name, stopId, photoUrl? }`), `Boarding` (`{ tripId, studentId, stopId, state: 'boarded'|'dropped'|'absent', at }`) — all from `@/data/domain`, already defined, no changes needed.
- Produces:
  ```ts
  export interface StopPickupCounts {
    assignedCount: number;
    pickedUpCount: number;
    remainingCount: number;
  }

  export function findActiveStop(stops: Stop[], roster: StudentLite[], boarding: Boarding[]): Stop | null

  export function countPickup(activeStop: Stop | null, roster: StudentLite[], boarding: Boarding[]): StopPickupCounts
  ```
  These two functions are consumed by Task 2's hook.

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/trip/__tests__/stopProgress.test.ts
import { findActiveStop, countPickup } from '../stopProgress';
import type { Stop, StudentLite, Boarding } from '@/data/domain';

const stops: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.10, lng: 77.10, seq: 1 },
  { id: 's2', name: 'Market', lat: 12.20, lng: 77.20, seq: 2 },
  { id: 's3', name: 'School', lat: 12.30, lng: 77.30, seq: 3 },
];

const roster: StudentLite[] = [
  { id: 'st1', name: 'A', stopId: 's1' },
  { id: 'st2', name: 'B', stopId: 's2' },
  { id: 'st3', name: 'C', stopId: 's2' },
];

describe('findActiveStop', () => {
  it('returns the first stop in seq order when no one has been picked up', () => {
    expect(findActiveStop(stops, roster, [])?.id).toBe('s1');
  });

  it('skips a stop once all its assigned students are boarded or dropped', () => {
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    expect(findActiveStop(stops, roster, boarding)?.id).toBe('s2');
  });

  it('treats a stop with zero assigned students as trivially resolved', () => {
    // s3 (School) has no roster entries at all, and s1/s2 are fully resolved,
    // so the route should be complete (no stop left needing attention).
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
      { tripId: 't1', studentId: 'st2', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
      { tripId: 't1', studentId: 'st3', stopId: 's2', state: 'dropped', at: '2026-09-20T00:00:00Z' },
    ];
    expect(findActiveStop(stops, roster, boarding)).toBeNull();
  });

  it('returns null (route complete) when every stop is resolved', () => {
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
      { tripId: 't1', studentId: 'st2', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
      { tripId: 't1', studentId: 'st3', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    expect(findActiveStop(stops, roster, boarding)).toBeNull();
  });

  it('returns null for an empty stop list', () => {
    expect(findActiveStop([], [], [])).toBeNull();
  });
});

describe('countPickup', () => {
  it('counts assigned, picked up, and remaining students at the active stop', () => {
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st2', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    const counts = countPickup(stops[1], roster, boarding);
    expect(counts).toEqual({ assignedCount: 2, pickedUpCount: 1, remainingCount: 1 });
  });

  it('returns all zeros when there is no active stop', () => {
    expect(countPickup(null, roster, [])).toEqual({ assignedCount: 0, pickedUpCount: 0, remainingCount: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/trip/__tests__/stopProgress.test.ts`
Expected: FAIL with "Cannot find module '../stopProgress'"

- [ ] **Step 3: Write the implementation**

```ts
// src/features/trip/stopProgress.ts
import type { Stop, StudentLite, Boarding } from '@/data/domain';

export interface StopPickupCounts {
  assignedCount: number;
  pickedUpCount: number;
  remainingCount: number;
}

const RESOLVED_STATES = ['boarded', 'dropped'] as const;

function isStopResolved(stop: Stop, roster: StudentLite[], boarding: Boarding[]): boolean {
  const assigned = roster.filter((s) => s.stopId === stop.id);
  if (assigned.length === 0) return true;
  return assigned.every((s) => {
    const state = boarding.find((b) => b.studentId === s.id)?.state;
    return state != null && (RESOLVED_STATES as readonly string[]).includes(state);
  });
}

/** The first stop (in seq order) that still has an unresolved assigned student, or null once every stop is resolved. */
export function findActiveStop(stops: Stop[], roster: StudentLite[], boarding: Boarding[]): Stop | null {
  const sorted = [...stops].sort((a, b) => a.seq - b.seq);
  return sorted.find((stop) => !isStopResolved(stop, roster, boarding)) ?? null;
}

export function countPickup(activeStop: Stop | null, roster: StudentLite[], boarding: Boarding[]): StopPickupCounts {
  if (!activeStop) return { assignedCount: 0, pickedUpCount: 0, remainingCount: 0 };
  const assigned = roster.filter((s) => s.stopId === activeStop.id);
  const pickedUp = assigned.filter((s) => boarding.find((b) => b.studentId === s.id)?.state === 'boarded');
  return { assignedCount: assigned.length, pickedUpCount: pickedUp.length, remainingCount: assigned.length - pickedUp.length };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/trip/__tests__/stopProgress.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/trip/stopProgress.ts src/features/trip/__tests__/stopProgress.test.ts
git commit -m "feat(trip): add pure stop-progress derivation (active stop + pickup counts)"
```

---

### Task 2: `useStopProgress` hook (arrival detection + state)

**Files:**
- Create: `src/features/trip/useStopProgress.ts`
- Test: `src/features/trip/__tests__/useStopProgress.test.ts`

**Interfaces:**
- Consumes: `findActiveStop`, `countPickup`, `StopPickupCounts` from Task 1 (`./stopProgress`); `distanceMeters` from `@/lib/geo` (existing, signature `(a: {lat,lng}, b: {lat,lng}) => number`).
- Produces:
  ```ts
  export type StopProgressState = 'EN_ROUTE' | 'PICKUP_IN_PROGRESS' | 'ROUTE_COMPLETED';

  export interface StopProgress extends StopPickupCounts {
    state: StopProgressState;
    activeStop: Stop | null;
  }

  export function useStopProgress(
    stops: Stop[],
    roster: StudentLite[],
    boarding: Boarding[],
    liveMarker: { latitude: number; longitude: number } | null,
  ): StopProgress & { markArrivedManually: () => void }
  ```
  Consumed by Task 3 (wiring into `LiveMapScreen`).

**Behavior:**
- `arrived` is true if either (a) `liveMarker` is within 50 meters of `activeStop`'s coordinates, or (b) the manual override (set via `markArrivedManually()`) is currently true.
- The manual override resets to `false` whenever `activeStop` changes (i.e. once a stop is completed and the next one becomes active, the fallback doesn't carry over).
- `state` is `'ROUTE_COMPLETED'` when `activeStop` is `null`; otherwise `'PICKUP_IN_PROGRESS'` when `arrived`, else `'EN_ROUTE'`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/trip/__tests__/useStopProgress.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useStopProgress } from '../useStopProgress';
import type { Stop, StudentLite, Boarding } from '@/data/domain';

const stops: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.10, lng: 77.10, seq: 1 },
  { id: 's2', name: 'Market', lat: 12.20, lng: 77.20, seq: 2 },
];
const roster: StudentLite[] = [{ id: 'st1', name: 'A', stopId: 's1' }];

describe('useStopProgress', () => {
  it('is EN_ROUTE when far from the active stop', () => {
    const far = { latitude: 12.50, longitude: 77.50 };
    const { result } = renderHook(() => useStopProgress(stops, roster, [], far));
    expect(result.current.state).toBe('EN_ROUTE');
    expect(result.current.activeStop?.id).toBe('s1');
  });

  it('is PICKUP_IN_PROGRESS when within 50m of the active stop', () => {
    // ~5m north of s1 (12.10, 77.10) — well within the 50m radius.
    const near = { latitude: 12.10004, longitude: 77.10 };
    const { result } = renderHook(() => useStopProgress(stops, roster, [], near));
    expect(result.current.state).toBe('PICKUP_IN_PROGRESS');
  });

  it('is ROUTE_COMPLETED when there is no active stop', () => {
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    const { result } = renderHook(() => useStopProgress([stops[0]], roster, boarding, null));
    expect(result.current.state).toBe('ROUTE_COMPLETED');
    expect(result.current.activeStop).toBeNull();
  });

  it('markArrivedManually forces PICKUP_IN_PROGRESS even when far away', () => {
    const far = { latitude: 12.50, longitude: 77.50 };
    const { result } = renderHook(() => useStopProgress(stops, roster, [], far));
    expect(result.current.state).toBe('EN_ROUTE');
    act(() => result.current.markArrivedManually());
    expect(result.current.state).toBe('PICKUP_IN_PROGRESS');
  });

  it('resets the manual override once the active stop changes', () => {
    const far = { latitude: 12.50, longitude: 77.50 };
    const boardingBoth: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    const { result, rerender } = renderHook(
      ({ boarding }) => useStopProgress(stops, roster, boarding, far),
      { initialProps: { boarding: [] as Boarding[] } },
    );
    act(() => result.current.markArrivedManually());
    expect(result.current.state).toBe('PICKUP_IN_PROGRESS');

    // s1 becomes resolved -> active stop advances to s2 -> override should not carry over.
    rerender({ boarding: boardingBoth });
    expect(result.current.activeStop?.id).toBe('s2');
    expect(result.current.state).toBe('EN_ROUTE');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/features/trip/__tests__/useStopProgress.test.ts`
Expected: FAIL with "Cannot find module '../useStopProgress'"

- [ ] **Step 3: Write the implementation**

```ts
// src/features/trip/useStopProgress.ts
import { useEffect, useRef, useState } from 'react';
import type { Stop, StudentLite, Boarding } from '@/data/domain';
import { distanceMeters } from '@/lib/geo';
import { findActiveStop, countPickup, type StopPickupCounts } from './stopProgress';

export type StopProgressState = 'EN_ROUTE' | 'PICKUP_IN_PROGRESS' | 'ROUTE_COMPLETED';

export interface StopProgress extends StopPickupCounts {
  state: StopProgressState;
  activeStop: Stop | null;
}

const ARRIVAL_RADIUS_METERS = 50;

export function useStopProgress(
  stops: Stop[],
  roster: StudentLite[],
  boarding: Boarding[],
  liveMarker: { latitude: number; longitude: number } | null,
): StopProgress & { markArrivedManually: () => void } {
  const activeStop = findActiveStop(stops, roster, boarding);
  const [manualArrived, setManualArrived] = useState(false);
  const lastActiveStopId = useRef<string | null>(null);

  useEffect(() => {
    if (activeStop?.id !== lastActiveStopId.current) {
      lastActiveStopId.current = activeStop?.id ?? null;
      setManualArrived(false);
    }
  }, [activeStop?.id]);

  const withinRadius =
    !!liveMarker &&
    !!activeStop &&
    distanceMeters(
      { lat: liveMarker.latitude, lng: liveMarker.longitude },
      { lat: activeStop.lat, lng: activeStop.lng },
    ) <= ARRIVAL_RADIUS_METERS;

  const arrived = manualArrived || withinRadius;
  const counts = countPickup(activeStop, roster, boarding);

  const state: StopProgressState = !activeStop ? 'ROUTE_COMPLETED' : arrived ? 'PICKUP_IN_PROGRESS' : 'EN_ROUTE';

  return { state, activeStop, ...counts, markArrivedManually: () => setManualArrived(true) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/trip/__tests__/useStopProgress.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/trip/useStopProgress.ts src/features/trip/__tests__/useStopProgress.test.ts
git commit -m "feat(trip): add useStopProgress hook (GPS arrival detection + manual override)"
```

---

### Task 3: Wire `useStopProgress` into `LiveMapScreen`'s bottom sheet identity

**Files:**
- Modify: `src/screens/LiveMapScreen.tsx`
- Modify: `src/screens/__tests__/LiveMapScreen.test.tsx`

**Interfaces:**
- Consumes: `useStopProgress` from Task 2.
- Produces: no new exports — this task only changes which stop identity (`activeStop` instead of `nextStop`) and student list the existing bottom-sheet UI reads from. The visual EN_ROUTE layout stays the same in this task; PICKUP_IN_PROGRESS-specific UI (bulk button, "Arrived" header) is Task 4.

**Why the existing test's mock roster must change:** `LiveMapScreen.test.tsx`'s `mockRoster.data` is currently `[]` (empty). Under the *old* `nearestStop`-based logic, an empty roster didn't matter — "next stop" was picked by GPS proximity alone. Under the *new* `findActiveStop` logic, a stop with **zero** assigned students is trivially "resolved" (Task 1's `isStopResolved`), so with an empty roster, `s1` and `s2` would both instantly resolve and the route would show `ROUTE_COMPLETED` — breaking the existing "shows the next stop" test's expectation of seeing "Market". Step 1 below fixes the mock roster to assign one student to `s2` (Market) so it's genuinely the active stop, matching the test's original intent.

- [ ] **Step 1: Update `mockRoster` and add the failing assertions to `LiveMapScreen.test.tsx`**

In `src/screens/__tests__/LiveMapScreen.test.tsx`, replace:

```ts
const mockRoster = { data: [] as any[] };
```

with:

```ts
// s2 (Market) has one assigned student, unresolved — that's what makes it
// the "active" stop under findActiveStop's derivation (s1/Gate has none,
// so it's vacuously resolved and skipped).
const mockRoster = { data: [{ id: 'st1', name: 'Riya', stopId: 's2' }] as any[] };
```

Then add this test at the end of the `describe('LiveMapScreen', ...)` block, right before the final closing `});`:

```ts
  it('shows the active stop (s2) rather than the GPS-nearest stop (s1)', async () => {
    // The GPS mock resolves near s1 (Gate), but s1 has no assigned students
    // (vacuously resolved), so s2 (Market) — which has an unresolved
    // student — must be the one shown, not s1.
    const { getByTestId, getByText, queryByText } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByTestId('has-live-marker')).toBeTruthy());
    expect(getByText('Market')).toBeTruthy();
    expect(queryByText('Gate')).toBeNull();
  });
```

- [ ] **Step 2: Run the existing suite to see it fail**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: FAIL — the new test fails (component still uses `nextStop`/`stopRoles`, not `useStopProgress`), and possibly others depending on stop identity.

- [ ] **Step 3: Wire the hook into `LiveMapScreen.tsx`**

In `src/screens/LiveMapScreen.tsx`, add the import alongside the other trip-feature imports:

```ts
import { useStopProgress } from '@/features/trip/useStopProgress';
```

Replace this block:

```ts
  const stops = useMemo(() => assignment.data?.route.stops ?? [], [assignment.data]);
  const roles = useMemo(() => stopRoles(stops, liveMarker), [stops, liveMarker]);
  const nextStop = useMemo(() => roles.find((r) => r.role === 'next')?.stop ?? null, [roles]);
  const stopStudents = useMemo(
    () => (nextStop ? roster.data?.filter((s) => s.stopId === nextStop.id) ?? [] : []),
    [nextStop, roster.data]
  );

  const distanceM = useMemo(
    () => (nextStop && liveMarker ? distanceMeters({ lat: liveMarker.latitude, lng: liveMarker.longitude }, { lat: nextStop.lat, lng: nextStop.lng }) : null),
    [nextStop, liveMarker]
  );
```

with:

```ts
  const stops = useMemo(() => assignment.data?.route.stops ?? [], [assignment.data]);
  const roles = useMemo(() => stopRoles(stops, liveMarker), [stops, liveMarker]);
  const progress = useStopProgress(stops, roster.data ?? [], boarding.data ?? [], liveMarker);
  const activeStop = progress.activeStop;
  const stopStudents = useMemo(
    () => (activeStop ? roster.data?.filter((s) => s.stopId === activeStop.id) ?? [] : []),
    [activeStop, roster.data]
  );

  const distanceM = useMemo(
    () => (activeStop && liveMarker ? distanceMeters({ lat: liveMarker.latitude, lng: liveMarker.longitude }, { lat: activeStop.lat, lng: activeStop.lng }) : null),
    [activeStop, liveMarker]
  );
```

`roles` (from `stopRoles`) stays — it still feeds `LiveMapView`'s map-marker coloring only, which this task doesn't touch (see spec).

Then find every remaining reference to `nextStop` in the file and rename it to `activeStop` (there are two: the `{nextStop && (` guard opening the bottom-sheet card, and `{nextStop.name}` inside it). Do not rename `t('trip.nextStop')` (the translation key) or the `styles.nextStopCard`/`nextStopHead`/`nextStopInfo` style names — those are cosmetic identifiers, not variable references, and renaming them is out of scope for this task.

- [ ] **Step 4: Run the suite to verify it passes**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 5: Run the full test suite to check for other regressions**

Run: `npm test -- --silent`
Expected: PASS — no other file references `LiveMapScreen`'s internals directly.

- [ ] **Step 6: Commit**

```bash
git add src/screens/LiveMapScreen.tsx src/screens/__tests__/LiveMapScreen.test.tsx
git commit -m "feat(trip): drive LiveMapScreen's bottom sheet from useStopProgress's active stop"
```

---

### Task 4: "Mark Students Picked Up" bulk action + PICKUP_IN_PROGRESS UI + auto-advance

**Files:**
- Modify: `src/screens/LiveMapScreen.tsx`
- Modify: `src/screens/__tests__/LiveMapScreen.test.tsx`
- Modify: `src/i18n/resources/en.json`, `hi.json`, `mr.json`, `ta.json`

**Interfaces:**
- Consumes: `progress.state`, `progress.remainingCount` (Task 2/3), `boarding.setBoarding.mutate` (existing, from `useBoarding`), `Btn` component (`@/components/ui`, `{ label, onPress, variant?, icon?, testID?, style? }`).
- Produces: no new exports.

- [ ] **Step 1: Add the new i18n keys**

In `src/i18n/resources/en.json`, add after `"trip.viewStudents": "View students",`:

```json
  "trip.stopArrived": "Arrived",
  "trip.markPickedUp": "Mark Students Picked Up",
  "trip.pickedUpCount": "{{n}} picked up",
  "trip.remainingCount": "{{n}} remaining",
  "trip.stopCompletedConfirm": "{{name}} — all picked up",
```

In `src/i18n/resources/hi.json`, add after the matching `"trip.viewStudents"` line:

```json
  "trip.stopArrived": "पहुंच गए",
  "trip.markPickedUp": "छात्रों को पिकअप किया गया चिह्नित करें",
  "trip.pickedUpCount": "{{n}} पिकअप हुए",
  "trip.remainingCount": "{{n}} शेष",
  "trip.stopCompletedConfirm": "{{name}} — सभी पिकअप हो गए",
```

In `src/i18n/resources/mr.json`, add after the matching `"trip.viewStudents"` line:

```json
  "trip.stopArrived": "पोहोचलो",
  "trip.markPickedUp": "विद्यार्थ्यांना पिकअप केले म्हणून चिन्हांकित करा",
  "trip.pickedUpCount": "{{n}} पिकअप झाले",
  "trip.remainingCount": "{{n}} शिल्लक",
  "trip.stopCompletedConfirm": "{{name}} — सर्व पिकअप झाले",
```

In `src/i18n/resources/ta.json`, add after the matching `"trip.viewStudents"` line:

```json
  "trip.stopArrived": "வந்துவிட்டேன்",
  "trip.markPickedUp": "மாணவர்களை ஏற்றியதாக குறிக்கவும்",
  "trip.pickedUpCount": "{{n}} ஏற்றப்பட்டனர்",
  "trip.remainingCount": "{{n}} மீதம்",
  "trip.stopCompletedConfirm": "{{name}} — அனைவரும் ஏற்றப்பட்டனர்",
```

- [ ] **Step 2: Make the shared mock fixtures reset between tests, then add the failing test**

This task's test needs to move `s2` to a spot the mock GPS location is actually within 50m of (the original fixture has `s2` ~1.5km from the GPS mock, which is correct for Task 3's "still approaching" test but not for this one). Since `mockAssignment`/`mockRoster`/`mockBoarding` are shared, module-level, mutable objects reused by every test in the file, any test that changes them must be reset afterward or it silently leaks into later tests (later tasks in this plan add tests that assert on the *original* `s2` coordinates — see Task 6). Fix this once, generally, rather than special-casing each test.

In `src/screens/__tests__/LiveMapScreen.test.tsx`, replace the existing `beforeEach`:

```ts
  beforeEach(() => {
    mockMapHandle.animateToRegion.mockClear();
    mockMapHandle.fitToCoordinates.mockClear();
  });
```

with:

```ts
  const originalStops = mockAssignment.data.route.stops;

  beforeEach(() => {
    mockMapHandle.animateToRegion.mockClear();
    mockMapHandle.fitToCoordinates.mockClear();
    mockAssignment.data.route.stops = originalStops;
    mockRoster.data = [{ id: 'st1', name: 'Riya', stopId: 's2' }];
    mockBoarding.data = [];
  });
```

Then add this test at the end of the `describe` block:

```ts
  it('marks every unresolved student at the active stop as boarded when "Mark Students Picked Up" is pressed', async () => {
    // GPS mock resolves at (12.11, 77.11) — within 50m of s2's own coordinates
    // in this test's fixture, so override mockAssignment's s2 to sit right there.
    // beforeEach restores the original stops array before the next test runs.
    mockAssignment.data.route.stops = [
      { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1 },
      { id: 's2', name: 'Market', lat: 12.11, lng: 77.11, seq: 2 },
    ];
    const { getByTestId, findByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    const markBtn = await findByTestId('mark-picked-up-btn');
    fireEvent.press(markBtn);
    expect(mockBoarding.setBoarding.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ tripId: 't1', studentId: 'st1', stopId: 's2', state: 'boarded' })
    );
  });
```

- [ ] **Step 3: Run the suite to see it fail**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: FAIL — `findByTestId('mark-picked-up-btn')` times out (button doesn't exist yet).

- [ ] **Step 4: Add the bulk action and PICKUP_IN_PROGRESS UI**

In `src/screens/LiveMapScreen.tsx`, import `Btn` alongside the other UI imports:

```ts
import { IconBtn, Btn, Pill, Skeleton, useToast } from '@/components/ui';
```

Add this handler function inside the component body, near `onRecenter`:

```ts
  const onMarkPickedUp = () => {
    if (!activeStop) return;
    stopStudents.forEach((s) => {
      const current = boarding.data?.find((b) => b.studentId === s.id)?.state ?? 'absent';
      if (current !== 'boarded') {
        boarding.setBoarding.mutate({ tripId, studentId: s.id, stopId: s.stopId, state: 'boarded', at: new Date().toISOString() });
      }
    });
  };
```

Then find the bottom-sheet block:

```tsx
        {activeStop && (
          <View style={styles.nextStopCard}>
            <View style={styles.nextStopHead}>
              <View style={styles.nextStopInfo}>
                <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('trip.nextStop')}</Text>
                <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{activeStop.name}</Text>
                <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
                  {t('trip.studentsExpected', { count: stopStudents.length })}
                  {distanceLabel ? ` · ${distanceLabel}` : ''}
                  {etaMin != null ? ` · ${t('trip.etaMin', { min: etaMin })}` : ''}
                </Text>
              </View>
            </View>
```

and replace its header `Text` (the one showing `t('trip.nextStop')`) plus add the pickup summary/button right after the existing `nextStopInfo` block closes (still inside `nextStopCard`, before the existing `view-students-btn` `Pressable`):

```tsx
        {activeStop && (
          <View style={styles.nextStopCard}>
            <View style={styles.nextStopHead}>
              <View style={styles.nextStopInfo}>
                <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
                  {progress.state === 'PICKUP_IN_PROGRESS' ? t('trip.stopArrived') : t('trip.nextStop')}
                </Text>
                <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{activeStop.name}</Text>
                <Text style={[TextScale.caption, { color: colors.inkSoft }]}>
                  {t('trip.studentsExpected', { count: stopStudents.length })}
                  {distanceLabel ? ` · ${distanceLabel}` : ''}
                  {etaMin != null ? ` · ${t('trip.etaMin', { min: etaMin })}` : ''}
                </Text>
              </View>
            </View>
            {progress.state === 'PICKUP_IN_PROGRESS' && (
              <>
                <Text testID="pickup-progress-summary" style={[TextScale.caption, { color: colors.inkSoft, marginTop: 8 }]}>
                  {t('home.studentsAssigned', { n: progress.assignedCount })}
                  {' · '}
                  {t('trip.pickedUpCount', { n: progress.pickedUpCount })}
                  {' · '}
                  {t('trip.remainingCount', { n: progress.remainingCount })}
                </Text>
                <Btn
                  testID="mark-picked-up-btn"
                  label={t('trip.markPickedUp')}
                  icon="check"
                  onPress={onMarkPickedUp}
                  style={styles.markPickedUpBtn}
                />
              </>
            )}
```

Add the new style next to `viewStudentsBtn` in the `StyleSheet.create` block:

```ts
  markPickedUpBtn: { marginTop: 10 },
```

- [ ] **Step 5: Add the ~1.2s "stop completed" confirmation overlay**

Add a failing assertion to the test added in Step 2 — replace it with:

```ts
  it('marks every unresolved student at the active stop as boarded and shows a brief confirmation when "Mark Students Picked Up" is pressed', async () => {
    mockAssignment.data.route.stops = [
      { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1 },
      { id: 's2', name: 'Market', lat: 12.11, lng: 77.11, seq: 2 },
    ];
    const { findByTestId, queryByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    const markBtn = await findByTestId('mark-picked-up-btn');
    fireEvent.press(markBtn);
    expect(mockBoarding.setBoarding.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ tripId: 't1', studentId: 'st1', stopId: 's2', state: 'boarded' })
    );
    expect(await findByTestId('stop-completed-confirm')).toHaveTextContent('Market');
    await waitFor(() => expect(queryByTestId('stop-completed-confirm')).toBeNull(), { timeout: 2000 });
  });
```

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: FAIL — `stop-completed-confirm` doesn't exist yet.

Add local state next to `gpsUnavailable`... actually add it next to `showStudents` in `LiveMapScreen.tsx`:

```ts
  const [justCompletedStopName, setJustCompletedStopName] = useState<string | null>(null);
```

Update `onMarkPickedUp` to capture the stop's name and clear it after 1200ms:

```ts
  const onMarkPickedUp = () => {
    if (!activeStop) return;
    const completedName = activeStop.name;
    stopStudents.forEach((s) => {
      const current = boarding.data?.find((b) => b.studentId === s.id)?.state ?? 'absent';
      if (current !== 'boarded') {
        boarding.setBoarding.mutate({ tripId, studentId: s.id, stopId: s.stopId, state: 'boarded', at: new Date().toISOString() });
      }
    });
    setJustCompletedStopName(completedName);
    setTimeout(() => setJustCompletedStopName(null), 1200);
  };
```

Render the confirmation as an overlay near the top of the `styles.bottom` container, right before the `statusRow` `View`:

```tsx
        {justCompletedStopName && (
          <Text testID="stop-completed-confirm" style={[TextScale.caption, { color: colors.success }]}>
            {t('trip.stopCompletedConfirm', { name: justCompletedStopName })}
          </Text>
        )}
```

This is deliberately a fire-and-forget local `setTimeout`, not a derived/persisted state — it's screen furniture confirming an action that already succeeded (or optimistically succeeded, per `useBoarding`'s existing `onMutate` cache update), not a fact about trip progress. If the screen unmounts before the timeout fires, React simply no-ops the `setJustCompletedStopName` call; there's no cleanup needed because there's no subscription to leak.

- [ ] **Step 6: Run the suite to verify it passes**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 7: Run the i18n key-parity test**

Run: `npx jest src/i18n/__tests__/keys.test.ts`
Expected: PASS — all four locale files have identical key sets.

- [ ] **Step 8: Commit**

```bash
git add src/screens/LiveMapScreen.tsx src/screens/__tests__/LiveMapScreen.test.tsx src/i18n/resources/en.json src/i18n/resources/hi.json src/i18n/resources/mr.json src/i18n/resources/ta.json
git commit -m "feat(trip): add bulk \"Mark Students Picked Up\" action for the active stop"
```

---

### Task 5: Manual "I've arrived" fallback when GPS is unavailable

**Files:**
- Modify: `src/screens/LiveMapScreen.tsx`
- Modify: `src/screens/__tests__/LiveMapScreen.test.tsx`
- Modify: `src/i18n/resources/en.json`, `hi.json`, `mr.json`, `ta.json`

**Interfaces:**
- Consumes: `progress.markArrivedManually` (Task 2).
- Produces: a new local boolean, `gpsUnavailable`, tracked in `LiveMapScreen`'s existing GPS-permission `useEffect`.

- [ ] **Step 1: Add the i18n key**

In `src/i18n/resources/en.json`, add after `"trip.markPickedUp": "Mark Students Picked Up",`:

```json
  "trip.arrivedManualFallback": "I've arrived",
```

In `hi.json`:
```json
  "trip.arrivedManualFallback": "मैं पहुंच गया हूं",
```

In `mr.json`:
```json
  "trip.arrivedManualFallback": "मी पोहोचलो आहे",
```

In `ta.json`:
```json
  "trip.arrivedManualFallback": "நான் வந்துவிட்டேன்",
```

- [ ] **Step 2: Add the failing test**

In `src/screens/__tests__/LiveMapScreen.test.tsx`, add:

```ts
  it('shows a manual "I\'ve arrived" fallback button and advances pickup state when GPS is unavailable', async () => {
    const Location = require('expo-location');
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const { getByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    const arrivedBtn = await waitFor(() => getByTestId('manual-arrived-btn'));
    fireEvent.press(arrivedBtn);
    expect(await waitFor(() => getByTestId('mark-picked-up-btn'))).toBeTruthy();
  });

  it('does not show the manual "I\'ve arrived" fallback button when GPS is available', async () => {
    const { getByTestId, queryByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByTestId('has-live-marker')).toBeTruthy());
    expect(queryByTestId('manual-arrived-btn')).toBeNull();
  });
```

- [ ] **Step 3: Run the suite to see it fail**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: FAIL — `manual-arrived-btn` doesn't exist yet.

- [ ] **Step 4: Track GPS availability and add the fallback button**

In `src/screens/LiveMapScreen.tsx`, add a new state var next to `mapReady`:

```ts
  const [gpsUnavailable, setGpsUnavailable] = useState(false);
```

In the GPS-permission `useEffect`, set it in both failure paths — replace:

```ts
      if (status !== 'granted') {
        toast.show(t('trip.locationDenied'), 'error');
        return;
      }
```

with:

```ts
      if (status !== 'granted') {
        toast.show(t('trip.locationDenied'), 'error');
        if (!cancelled) setGpsUnavailable(true);
        return;
      }
```

and replace:

```ts
      } catch {
        // GPS unavailable — leave liveMarker null, route/stops still render.
      }
```

with:

```ts
      } catch {
        // GPS unavailable — leave liveMarker null, route/stops still render.
        if (!cancelled) setGpsUnavailable(true);
      }
```

Then, inside the `nextStopCard` block, add the fallback button right after the `nextStopInfo`/head section closes and before the `PICKUP_IN_PROGRESS` block added in Task 4:

```tsx
            {gpsUnavailable && progress.state === 'EN_ROUTE' && (
              <Btn
                testID="manual-arrived-btn"
                label={t('trip.arrivedManualFallback')}
                icon="location"
                variant="ghost"
                onPress={progress.markArrivedManually}
                style={styles.markPickedUpBtn}
              />
            )}
```

- [ ] **Step 5: Run the suite to verify it passes**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: PASS (11 tests)

- [ ] **Step 6: Commit**

```bash
git add src/screens/LiveMapScreen.tsx src/screens/__tests__/LiveMapScreen.test.tsx src/i18n/resources/en.json src/i18n/resources/hi.json src/i18n/resources/mr.json src/i18n/resources/ta.json
git commit -m "feat(trip): add manual arrival fallback for when GPS is unavailable"
```

---

### Task 6: "Navigate" button (external maps handoff)

**Files:**
- Modify: `src/screens/LiveMapScreen.tsx`
- Modify: `src/screens/__tests__/LiveMapScreen.test.tsx`
- Modify: `src/i18n/resources/en.json`, `hi.json`, `mr.json`, `ta.json`

**Interfaces:**
- Consumes: `Linking` from `react-native` (new usage in this file, already part of the `react-native` package — no new dependency).
- Produces: no new exports.

- [ ] **Step 1: Add the i18n key**

`en.json`: `"trip.navigate": "Navigate",`
`hi.json`: `"trip.navigate": "नेविगेट करें",`
`mr.json`: `"trip.navigate": "नेव्हिगेट करा",`
`ta.json`: `"trip.navigate": "வழிசெலுத்து",`

(Add each after `"trip.arrivedManualFallback"` in its respective file.)

- [ ] **Step 2: Add the failing test**

```ts
  it('opens the device maps app with the active stop\'s coordinates when Navigate is pressed', async () => {
    const { Linking } = require('react-native');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { getByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByTestId('has-live-marker')).toBeTruthy());
    fireEvent.press(getByTestId('navigate-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('destination=12.2,77.2')
    );
  });
```

- [ ] **Step 3: Run the suite to see it fail**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: FAIL — `navigate-btn` doesn't exist yet.

- [ ] **Step 4: Add the Navigate button**

In `src/screens/LiveMapScreen.tsx`, add `Linking` to the `react-native` import:

```ts
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
```

Add a handler near `onMarkPickedUp`:

```ts
  const onNavigate = () => {
    if (!activeStop) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${activeStop.lat},${activeStop.lng}`).catch(() =>
      toast.show(t('common.somethingWrong'), 'error')
    );
  };
```

Add the button inside `nextStopInfo`'s parent (`nextStopHead`), as a sibling to `nextStopInfo`, so it sits to the side of the stop name/distance text:

```tsx
            <View style={styles.nextStopHead}>
              <View style={styles.nextStopInfo}>
                {/* ...unchanged... */}
              </View>
              <IconBtn testID="navigate-btn" icon="location" label={t('trip.navigate')} onPress={onNavigate} color={colors.primary} />
            </View>
```

(Confirm `common.somethingWrong` already exists in `en.json` before using it — it's referenced elsewhere in the codebase, e.g. `HomeScreen.tsx`'s photo-attach error path, so it should already be present in all four locale files.)

- [ ] **Step 5: Run the suite to verify it passes**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: PASS (12 tests)

- [ ] **Step 6: Commit**

```bash
git add src/screens/LiveMapScreen.tsx src/screens/__tests__/LiveMapScreen.test.tsx src/i18n/resources/en.json src/i18n/resources/hi.json src/i18n/resources/mr.json src/i18n/resources/ta.json
git commit -m "feat(trip): add Navigate button opening the device's native maps app"
```

---

### Task 7: `ROUTE_COMPLETED` summary

**Files:**
- Modify: `src/screens/LiveMapScreen.tsx`
- Modify: `src/screens/__tests__/LiveMapScreen.test.tsx`
- Modify: `src/i18n/resources/en.json`, `hi.json`, `mr.json`, `ta.json`

**Interfaces:**
- Consumes: `progress.state === 'ROUTE_COMPLETED'`.
- Produces: no new exports.

- [ ] **Step 1: Add the i18n keys**

`en.json`:
```json
  "trip.routeCompleteTitle": "Route complete",
  "trip.routeCompleteHint": "All stops on this trip are finished.",
```

`hi.json`:
```json
  "trip.routeCompleteTitle": "मार्ग पूरा हुआ",
  "trip.routeCompleteHint": "इस ट्रिप के सभी स्टॉप पूरे हो गए हैं।",
```

`mr.json`:
```json
  "trip.routeCompleteTitle": "मार्ग पूर्ण झाला",
  "trip.routeCompleteHint": "या ट्रिपचे सर्व थांबे पूर्ण झाले आहेत.",
```

`ta.json`:
```json
  "trip.routeCompleteTitle": "வழி முடிந்தது",
  "trip.routeCompleteHint": "இந்த பயணத்தின் அனைத்து நிறுத்தங்களும் முடிந்துவிட்டன.",
```

(Add each after `"trip.navigate"` in its respective file.)

- [ ] **Step 2: Add the failing test**

```ts
  it('shows a Route Complete summary once every stop is resolved', async () => {
    mockBoarding.data = [
      { tripId: 't1', studentId: 'st1', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    const { getByText, queryByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByText('Route complete')).toBeTruthy());
    expect(queryByTestId('mark-picked-up-btn')).toBeNull();
  });
```

Add this to the top-level `describe` block. No new `beforeEach` changes are needed — Task 4 already made `beforeEach` reset `mockBoarding.data` to `[]` before every test, so this test's mutation won't leak into whatever runs after it.

- [ ] **Step 3: Run the suite to see it fail**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: FAIL — no "Route complete" text rendered yet.

- [ ] **Step 4: Add the Route Complete summary**

In `src/screens/LiveMapScreen.tsx`, find the `{activeStop && (` block and add a sibling `else`-style block right after it closes (still inside the `styles.bottom` container):

```tsx
        {activeStop && (
          <View style={styles.nextStopCard}>
            {/* ...unchanged from Tasks 3-6... */}
          </View>
        )}
        {progress.state === 'ROUTE_COMPLETED' && (
          <View style={styles.nextStopCard}>
            <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{t('trip.routeCompleteTitle')}</Text>
            <Text style={[TextScale.caption, { color: colors.inkSoft, marginTop: 4 }]}>{t('trip.routeCompleteHint')}</Text>
          </View>
        )}
```

- [ ] **Step 5: Run the suite to verify it passes**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: PASS (13 tests)

- [ ] **Step 6: Commit**

```bash
git add src/screens/LiveMapScreen.tsx src/screens/__tests__/LiveMapScreen.test.tsx src/i18n/resources/en.json src/i18n/resources/hi.json src/i18n/resources/mr.json src/i18n/resources/ta.json
git commit -m "feat(trip): show a Route Complete summary once every stop is resolved"
```

---

### Task 8: Full regression pass

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --silent`
Expected: PASS — every suite, including `LiveMapScreen.test.tsx` (13 tests), `stopProgress.test.ts` (7 tests), `useStopProgress.test.ts` (5 tests), and `i18n/__tests__/keys.test.ts` (identical key sets across all 4 locales).

- [ ] **Step 2: Run the typechecker**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Confirm no unrelated files changed**

Run: `git status --short` and `git diff --stat main...HEAD -- src`
Expected: only files listed in Tasks 1-7's **Files** sections appear (plus the four locale JSON files and this plan/spec's own docs files from earlier commits) — no `stopRoles.ts`, `nearestStop.ts`, `TripScreen.tsx`, or backend files touched, per the spec's stated boundaries.

- [ ] **Step 4: Manual verification (if a running dev server is available)**

Start a trip with an assigned route that has at least 2 stops with students, open "View live map", and confirm: the bottom sheet shows the first stop with unresolved students (not necessarily the GPS-nearest one), "Mark Students Picked Up" appears once GPS reports within ~50m (or after tapping the manual fallback if GPS is unavailable), pressing it marks all of that stop's students boarded and the sheet advances to the next unresolved stop, and after the last stop resolves the sheet shows "Route complete".

- [ ] **Step 5: Commit (only if Step 3 found anything to clean up; otherwise skip)**

```bash
git add -A
git commit -m "chore(trip): regression-pass cleanup for stop-sequence workflow"
```
