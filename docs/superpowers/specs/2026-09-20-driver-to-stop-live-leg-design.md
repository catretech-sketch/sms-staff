# Driver-to-Next-Stop Live Road Leg — Design Spec

Status: 2026-09-20. Sub-project 5 of 5 from the larger "Driver Bus Route
Navigation" request (see
`docs/superpowers/specs/2026-09-20-stop-sequence-workflow-design.md`'s
decomposition). Spans two repos: `sms-backend` (new endpoint) and
`sms-staff` (frontend fetch + map rendering).

## Background

The whole-route road-following geometry shipped earlier this session
(`docs/superpowers/specs/2026-09-19-road-following-route-geometry-design.md`)
draws the road path between the route's own *configured* stops, cached by
stop-sequence hash. It has no notion of the driver's live position — the
map shows the planned route, not where the bus actually is relative to it.

This sub-project adds a second, uncached, continuously-refreshed leg: a
road-following path from the driver's **current GPS location** to the
**next pending stop** (as determined by `useStopProgress`'s `activeStop`,
shipped in sub-project 1). The existing cached whole-route geometry is
unchanged and keeps rendering for the rest of the route. The admin's
configured route in the database is never modified — this is purely a
display-time addition.

## Backend (`sms-backend`)

### New endpoint

`POST /v1/transport/routes/{routeId}/geometry/from-point`

Request body:
```json
{ "lat": 12.9716, "lng": 77.5946, "stop_id": "3f8e2b1a-..." }
```

Response (same envelope convention as the existing `/geometry` endpoint,
`OkData(...)`, snake_case via the existing global naming policy):
```csharp
public sealed record FromPointGeometryResponse(
    string Status, string? Format, string? Geometry,
    int? DistanceMeters, int? DurationSeconds);
```
No `route_id`, `stop_sequence_hash`, or `generated_at` — this result is
never cached, so those cache-identity fields don't apply.

### Implementation

- New controller action on the existing `RouteGeometryController` (same
  class, same `[Authorize]`, same `CanViewRouteAsync` check the existing
  `GetGeometry` action already uses — no new authorization logic).
- Look up the target stop's coordinates server-side via the existing
  `IRouteStopSource.ListRouteStopsAsync(routeId)` and find the entry
  matching `stop_id`; 400 if `stop_id` doesn't belong to `routeId`. This
  is a deliberate safety choice: the client says *which* configured stop
  it wants to reach, not *where that stop is* — an untrusted destination
  coordinate could otherwise be used to route (and bill Google Routes
  calls) to arbitrary points unrelated to the route.
- Call the **existing, unmodified**
  `IGoogleRoutesClient.ComputeRouteAsync([RouteWaypoint(lat,lng),
  RouteWaypoint(stop.Lat, stop.Lng)])` — this client already accepts any
  two waypoints; nothing about it needs to change for this feature.
- No `IRouteGeometryStore` write, no caching, no stop-sequence hash
  logic — this result is meaningless to cache (the origin changes on
  every call). On a `null` result from the client (provider failure),
  return `status: "unavailable"` — same "never fabricate a straight
  line" rule the existing endpoint follows.
- Validate `lat`/`lng` are finite, in-range values (basic sanity bounds:
  -90..90 / -180..180) before calling the client — reject with 400
  otherwise. This is the one new piece of input validation this feature
  needs, since `lat`/`lng` here come from a client-reported GPS reading,
  unlike the existing endpoint's inputs which are all server-resolved.

## Frontend (`sms-staff`)

### Repository layer

- `src/data/http/driverToStopGeometry.repo.ts`: `httpDriverToStopGeometry(http)`
  exposing `get(routeId, lat, lng, stopId): Promise<RouteGeometry>` — reuses
  the existing `RouteGeometry` domain type from
  `src/data/domain/trip.ts` (shipped in sub-project 2), since the response
  shape is a strict subset of it (the extra cache-identity fields on that
  type — `stopSequenceHash`, `generatedAt` — are simply left `''`/`null`
  by this repo's mapper, since domain types don't need every field
  populated meaningfully by every producer).
- `src/data/mock/driverToStopGeometry.repo.ts`: mock counterpart
  (`status: 'unavailable'`, consistent with the existing
  `mockRouteGeometry`'s convention).
- Registered as `driverToStopGeometry: DriverToStopGeometryRepository` on
  `Repositories` (`types.ts`, `factory.ts`), mirroring the existing
  `routeGeometry` entry exactly.

### Hook

`useDriverToStopGeometry(routeId: string | undefined, activeStop: Stop |
null, liveMarker: {latitude,longitude} | null)` in
`src/features/trip/useDriverToStopGeometry.ts`. Internally: a
`useState<RouteGeometry | null>` plus a `useEffect` (not a `useQuery` —
this isn't a cacheable resource) that:

1. Fires immediately whenever `activeStop?.id` changes (including the
   first time it becomes non-null), using the current `liveMarker` as
   origin — skips entirely if `liveMarker` is null (no GPS yet).
2. Tracks the `{lat, lng}` used for the **last successful fetch** in a
   ref. On every new `liveMarker` value, compute straight-line distance
   (reusing `distanceMeters` from `@/lib/geo`, already used elsewhere in
   `LiveMapScreen`) from the new `liveMarker` to that ref's value; if
   ≥100 meters, refetch (and update the ref). This is a straight-line
   distance from the last *fetch origin*, not a point-to-polyline
   projection onto the drawn path — simpler, and sufficient to satisfy
   "don't call Google Routes on every GPS tick, but do recompute once the
   driver has moved meaningfully since we last asked."
3. Does not poll on a timer — driven entirely by the two triggers above,
   both of which are already-existing state changes (`activeStop`
   changing, `liveMarker` updating from the existing GPS watcher) — no
   new subscription or interval.

Used only by `LiveMapScreen` (a live trip is a prerequisite — consistent
with the backend's `CanViewRouteAsync`/active-driver authorization
already requiring a live trip, established during sub-project 1's
investigation).

### Map rendering

`LiveMapView`/`LiveMapView.web` gain a new optional prop
`driverToStopGeometry?: RouteGeometry | null`, decoded via the existing
`decodePolyline` and rendered as a **second, separately-styled**
`<Polyline>` (`colors.gold` — an existing theme token already used
elsewhere for accent/warning contexts — instead of `colors.primary`, to
visually distinguish "live suggested path to your next stop" from the
planned route). No coordinate stitching/trimming between the two
polylines where they might overlap — two independently drawn lines is
simpler and adequate; this mirrors the same "don't over-engineer the
composition" choice already made for the existing route/segment-label
rendering.

If `driverToStopGeometry?.status === 'unavailable'`, render nothing extra
— no second `RouteUnavailableBadge`. The existing badge already covers
the whole-route-geometry-unavailable case; showing two unavailable
badges (one for the planned route, one for the live leg) would be
confusing noise, not useful signal. The existing cached route polyline
keeps rendering regardless of this leg's availability.

Wired into `LiveMapScreen.tsx` only, passed alongside the existing
`routeGeometry` prop to `LiveMapView`.

## Testing

- Backend: unit test for the new controller action covering (a) success
  path with a valid `stop_id` on the route, (b) 400 for a `stop_id` not
  belonging to `routeId`, (c) 400 for out-of-range `lat`/`lng`, (d)
  `status: "unavailable"` when `IGoogleRoutesClient` returns null, (e)
  403 via the existing `CanViewRouteAsync` check for an unauthorized
  caller (mirrors the existing endpoint's own authorization test, if one
  exists — check `RouteGeometryController`'s existing test file first and
  follow its pattern).
- Frontend: repo unit test (mirrors `routeGeometry.repo.test.ts`), hook
  tests for both fetch triggers (stop-change fires immediately; <100m
  movement does not refetch; ≥100m does, and updates the "last fetch"
  reference so a third small movement right after doesn't immediately
  refetch again), and a `LiveMapView` render test confirming the second
  polyline is present/absent based on the prop and that an `unavailable`
  status renders no second badge.

## Out of Scope

- Off-route detection/rerouting for the *planned* route (sub-project 3,
  still deferred) — this sub-project's "recompute on ≥100m drift" is
  specifically about keeping the *driver→next-stop* leg's origin fresh,
  not detecting that the whole trip has gone off-course.
- Per-leg routing between the route's own configured stops (sub-project
  2) — already out of scope there too; this sub-project only adds the
  one dynamic first/current leg, not a full re-decomposition of the
  cached whole-route polyline into per-stop segments.
- Offline-durable behavior for this leg specifically — if the fetch
  fails while offline, it surfaces as `status: 'unavailable'` (leg simply
  doesn't draw) rather than queuing for later, consistent with how the
  existing whole-route geometry already behaves on failure.
