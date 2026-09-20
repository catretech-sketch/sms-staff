# Driver Stop-Sequence Workflow — Design Spec

Status: 2026-09-20. Sub-project 1 of 5 from the larger "Driver Bus Route
Navigation" request (see decomposition below). This spec covers only the
stop-by-stop pickup workflow UI and its state machine.

## Background / Decomposition

The original request bundled five largely independent pieces:

1. **Stop-sequence workflow UI** (this spec) — bottom sheet + state machine
   driving the driver through Arrived → pickup → next stop.
2. **Per-stop leg routing** — road-following distance/ETA broken out per
   stop-to-stop segment, extending the whole-route geometry already shipped
   (`docs/superpowers/specs/2026-09-19-road-following-route-geometry-design.md`).
3. **Off-route detection + rerouting** — deviation detection and
   recalculation from current GPS to the next pending stop.
4. **Offline-durable pickup actions** — `setBoarding` currently has no
   offline queue (unlike GPS pings, which already buffer via
   `src/features/trip/pingQueue.ts`); a dropped connection today silently
   fails a pickup mutation with just a toast.
5. **Dynamic first-leg from driver's live GPS to the first configured
   stop** — requires a new `sms-backend` endpoint (a different repo/session)
   since the existing geometry endpoint only computes cached geometry
   between the route's own configured stops, not from an arbitrary origin.
   Deferred to its own spec.

Each is buildable and shippable independently. This spec is sub-project 1
only. 2-5 are out of scope here and will get their own specs.

## Goal

Turn `LiveMapScreen`'s existing GPS-proximity-driven "next stop" card into
an explicit, driver-driven pickup workflow: Arrived → Mark Picked Up →
auto-advance to the next stop, ending in a Route Complete state.

## Current State (what already exists)

- `LiveMapScreen.tsx` has a `nextStopCard` showing the nearest stop
  (`stopRoles.ts` → `nearestStop.ts`), straight-line distance/ETA to it, and
  a "View students" toggle exposing a per-student tap-to-cycle boarding list
  (boarded → dropped → absent → boarded).
- `nearestStop.ts` picks the **closest stop by straight-line distance**
  across ALL stops, not the next pending one in route order. This can
  mislabel "current stop" if the route geometry loops back near an earlier
  point. This spec's state machine replaces that mechanism for determining
  the *active* stop (see below); `stopRoles.ts`'s completed/current/next/
  upcoming labels for map marker styling are a separate, existing concern
  and are untouched.
- `setBoarding` (`src/features/trip/hooks.ts`) is a plain React Query
  mutation — no offline queue (sub-project 4, deferred).

## State Machine

```ts
type StopWorkflowState =
  | 'NOT_STARTED'
  | 'EN_ROUTE'
  | 'ARRIVED_AT_STOP'
  | 'PICKUP_IN_PROGRESS'
  | 'STOP_COMPLETED'
  | 'ROUTE_COMPLETED';
```

No `OFF_ROUTE`/`RECALCULATING` — those belong to sub-project 3.

**`activeStopIndex` is derived, not stored.** On every render, it's
computed as the index (in `seq` order) of the first stop that does not yet
have all of its assigned roster students marked `boarded` or `dropped` in
the trip's `boarding` data. If every stop is fully resolved, the state is
`ROUTE_COMPLETED`. This means:
- No new persistence layer, no new backend field.
- The workflow survives app kills/restarts for free — on remount, the
  same `roster`/`boarding` queries that already exist reconstruct the
  correct active stop.
- The active stop only ever advances forward through the sequence; it is
  never re-picked by GPS proximity.

**Transitions:**
- `NOT_STARTED → EN_ROUTE`: trip start (existing `useStartTrip` flow,
  unchanged).
- `EN_ROUTE → ARRIVED_AT_STOP`: GPS live marker comes within **50 meters**
  of the active stop's coordinates (a fixed threshold, consistent with
  common transit-app arrival radii; not user-configurable in this spec).
- `ARRIVED_AT_STOP → PICKUP_IN_PROGRESS`: automatic, immediately —
  this state exists purely so the bottom sheet can render the pickup UI
  distinctly from "still approaching."
- `PICKUP_IN_PROGRESS → STOP_COMPLETED`: driver taps "Mark Students Picked
  Up" (bulk-sets every assigned student at this stop to `boarded`), OR the
  driver has resolved every student individually via the existing
  per-student list (both paths converge on the same derived state, since
  completion is just "all students at this stop are boarded/dropped").
- `STOP_COMPLETED → EN_ROUTE` (next stop) or `→ ROUTE_COMPLETED` (was the
  last stop in sequence): automatic, ~1 second after completion, purely a
  render-derived transition (no timer/side-effect needed since
  `activeStopIndex` recomputes to the next unresolved stop immediately).

**GPS-unavailable fallback:** if location permission is denied or GPS is
unavailable (both already detected and toasted today), a manual
**"Arrived"** button is additionally shown in the `EN_ROUTE` bottom-sheet
state. This is the only way to progress without GPS; it is not a general
alternative to auto-detection, only the escape hatch for that failure case.

## Bottom Sheet UI

Replaces `LiveMapScreen`'s existing `nextStopCard` block (`styles.bottom`
container is reused, not replaced) with state-conditional content:

- **`EN_ROUTE`**: "Next Stop" header, stop name, distance + ETA (reusing
  the existing straight-line `distanceM`/`etaMin` calculation already in
  `LiveMapScreen` — per-leg road routing is sub-project 2, deferred),
  student counts (`assigned` / `picked up` / `remaining`), a **"Navigate"**
  button (opens the stop's coordinates in the device's native maps app via
  `Linking.openURL` — no new dependency), and (only when GPS is
  unavailable) the manual "Arrived" fallback button.
- **`ARRIVED_AT_STOP` / `PICKUP_IN_PROGRESS`**: header switches to
  "Arrived", same student counts, the **"Mark Students Picked Up"**
  primary button, and the existing per-student list below it for
  individual corrections (e.g. one absent student that day).
- **`STOP_COMPLETED`**: brief confirmation (~1s) before the sheet re-renders
  to the next stop's `EN_ROUTE` view.
- **`ROUTE_COMPLETED`**: a "Route Complete" summary replaces the sheet
  (existing trip-summary flow on `TripScreen` after "End trip" is a
  separate, already-built concern — this state is just the map screen's
  own visual end-of-route indicator, not a new trip-end action).

## Data Flow & Error Handling

- No new backend endpoint or repository method. Consumes data already
  fetched by `LiveMapScreen`: `assignment.data.route.stops`, `roster`,
  `boarding`, `liveMarker`.
- "Mark Students Picked Up" reuses the existing `setBoarding` mutation
  (looped once per assigned student at that stop) — no offline queue yet
  (sub-project 4). A failed mutation shows the existing error toast; no
  silent loss, but also no automatic retry.
- GPS permission denied/unavailable: already handled (toast shown, map
  renders without a live marker) — this spec adds the manual "Arrived"
  fallback described above so the workflow isn't permanently stuck.

## Testing

- Unit tests for the derivation logic (pure function: given `stops` +
  `roster` + `boarding` → `{ activeStopIndex, state }`), covering: no trip
  started, mid-route with a partially-boarded stop, a fully-boarded stop
  advancing to the next, and full-route completion.
- Component tests for the bottom sheet in each of the 4 visible states
  (`EN_ROUTE`, `ARRIVED_AT_STOP`/`PICKUP_IN_PROGRESS` combined visually,
  `STOP_COMPLETED`, `ROUTE_COMPLETED`), added to the existing
  `LiveMapScreen.test.tsx` harness and mocks.
- GPS-unavailable fallback: a test confirming the manual "Arrived" button
  appears only when location permission/availability fails.

## Out of Scope (future specs)

- Per-stop leg road routing (sub-project 2).
- Off-route detection and rerouting (sub-project 3).
- Offline-durable pickup actions / sync-on-reconnect (sub-project 4).
- Dynamic first-leg from driver's live GPS to the first configured stop
  (sub-project 5) — requires new `sms-backend` work in a separate
  repo/session.
