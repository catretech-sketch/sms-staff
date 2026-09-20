# Road-Following Route Geometry — sms-staff (Driver/Conductor) Design

Status: Approved (pending final pre-implementation sign-off)
Repo: sms-staff
Depends on: `sms-backend` spec
`docs/superpowers/specs/2026-09-19-road-following-route-geometry-design.md`
(canonical `GET /v1/transport/routes/{routeId}/geometry` contract, gated by
the per-route `CanViewRouteAsync` check).

## 1. Objective

Replace the straight-line planned-route polyline in the driver/staff live
trip map with road-following geometry, without touching the device GPS
publishing pipeline (this app is the GPS **producer**, not a consumer of
SignalR pushes).

## 2. Existing architecture (from audit)

- `react-native-maps` (native) plus `@teovilla/react-native-web-maps` /
  `@react-google-maps/api` for web (`LiveMapView.tsx` / `LiveMapView.web.tsx`),
  rendered from `src/screens/LiveMapScreen.tsx`.
- Supporting: `src/features/map/toMapCoords.ts`, `routeSegments.ts`,
  `stopRoles.ts`, `BusMarker.tsx`, `StopMarker.tsx`, `RouteSegmentLabel.tsx`.
- Straight-line construction:
  ```js
  export function toMapCoords(stops: Stop[]): MapCoord[] {
    return [...stops].sort((a, b) => a.seq - b.seq).map((s) => ({ latitude: s.lat, longitude: s.lng }))
  }
  ```
  rendered as `<Polyline coordinates={coords} strokeWidth={6} .../>`.
  `routeSegments.ts` additionally computes per-segment straight-line
  distance for `RouteSegmentLabel` — this stays as-is (see §12 non-goals);
  only the rendered path geometry changes.
- **This app is the GPS producer, not a consumer**: `LiveMapScreen.tsx`
  uses `expo-location`'s `watchPositionAsync` to read the device's own GPS
  and publishes via `TripRepository.publishPing` → `POST /staff/trips/{tripId}/pings`
  (`src/data/http/trip.repo.ts`). No SignalR client exists in this repo.
  **Not touched by this spec.**
- Route/stop data: `httpTrip(http).myAssignment()` →
  `GET /staff/trip/assignment` → `TripAssignmentDTO { route: RouteDTO, ... }`,
  `RouteDTO = { id, name, bus_no, stops: StopDTO[] }`,
  `StopDTO = { id, name, lat, lng, seq, eta_min? }`. No `geometry` field
  exists today.

## 3. Exact files/components involved

New:
- `src/data/http/routeGeometry.repo.ts` — client for the geometry endpoint,
  following the existing `trip.repo.ts` pattern.
- `src/lib/decodePolyline.ts` — Google encoded-polyline decoder (own copy).
- `src/features/trip/useRouteGeometry.ts` — hook fetching geometry for the
  assigned route's `routeId`, once per trip assignment (not per GPS tick).

Modified:
- `src/features/map/toMapCoords.ts` — kept as-is for the segment-distance
  calculations `routeSegments.ts` already does; a new function (e.g.
  `toRoadCoords`) added alongside it that decodes the geometry response
  when available.
- `LiveMapView.tsx` / `LiveMapView.web.tsx` — render the decoded road
  polyline when `status === 'available'`; when `'unavailable'`, render no
  route line and an inline "Route unavailable" note. `BusMarker` (own live
  GPS marker), `StopMarker`s, and `RouteSegmentLabel` distance/duration
  labels remain untouched — those are independent of which polyline is
  drawn.
- `src/screens/LiveMapScreen.tsx` — call `useRouteGeometry(assignedRouteId)`
  and pass the result to `LiveMapView`.

## 4. API contract (consumed, not defined here)

**Confirmed final wire format** (verified against the shipped backend, not
assumed): the raw HTTP response is snake_case, wrapped in this backend's
standard envelope — `{ "data": { "route_id": "...", "status": "available",
"distance_meters": 4210, ... } }`. This matches the shape `trip.repo.ts`'s
existing `myAssignment()` call already unwraps for other endpoints — mirror
that exact unwrapping convention (`res.data.route_id` vs.
`res.data.data.route_id` depending on what this app's HTTP client returns)
rather than guessing.

## 5. Data model / migration

None.

## 6. Authentication / authorization

Uses the existing staff/driver auth token. Backend's `CanViewRouteAsync`
ensures a driver/conductor only receives geometry for their assigned
route — same trust boundary as their existing `myAssignment()` call.

## 7. Error handling

`status: 'unavailable'` or fetch failure → no route line, "Route
unavailable" indicator, own-device GPS marker (`watchPositionAsync`) and
ping publishing keep working exactly as today — this pipeline has no
dependency on route geometry at all. Existing straight-line `toMapCoords`
usage for the polyline may be removed from `LiveMapView` call sites once
this ships, but `toMapCoords` itself stays for `routeSegments.ts`'s
distance-label calculations (a different consumer of the same function).

## 8. Caching / performance

One fetch per trip assignment via the hook's own request-once behavior;
`watchPositionAsync`/ping publishing continues on its existing interval
and never triggers a geometry fetch.

## 9. Testing

- Unit test for `decodePolyline.ts`.
- Test for `LiveMapView`/`LiveMapView.web` covering `available`/
  `unavailable` states, confirming own-GPS marker, stop markers, and
  segment labels are unaffected.
- Regression: existing trip/ping-publishing tests continue passing
  unmodified.

## 10. Rollback / safety considerations

Additive only; reverting removes the new files and polyline-source swap
with no impact on GPS publishing or trip state.

## 11. Dependencies

Requires the `sms-backend` endpoint deployed (with the per-route
authorization extension); can be built against a mocked response first.

## 12. Non-goals

- Not touching `expo-location`/GPS publishing, trip ping ingestion, ETA
  labels from `routeSegments.ts`, or driver/conductor authorization.
- Not creating a driver-specific routing calculation or API.
