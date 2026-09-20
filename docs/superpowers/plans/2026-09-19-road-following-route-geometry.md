# Road-Following Route Geometry (sms-staff / Driver-Conductor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the straight-line planned-route polyline in `LiveMapView`/`LiveMapView.web` with road-following geometry, without touching the device GPS publishing pipeline (`expo-location` + `TripRepository.publishPing`) — this app is a GPS **producer**, not a SignalR consumer.

**Architecture:** A new HTTP repo function + shared polyline decoder + React Query hook feed a decoded road path into `LiveMapView`/`LiveMapView.web`, replacing the current `toMapCoords`-derived straight-line `Polyline`. `routeSegments.ts`'s straight-line distance-label math is untouched (a different consumer of `toMapCoords`, not the rendered route line).

**Tech Stack:** React Native/Expo, `react-native-maps` (native) + `@teovilla/react-native-web-maps`/`@react-google-maps/api` (web), TanStack React Query, `expo-location` (untouched by this plan).

**Spec:** `docs/superpowers/specs/2026-09-19-road-following-route-geometry-design.md`

## Global Constraints

- Depends on the finalized `sms-backend` contract: `GET /v1/transport/routes/{routeId}/geometry`.
- Never fall back to the existing straight-line `toMapCoords`-derived polyline as production behavior when geometry is `unavailable` — show "Route unavailable" instead.
- Do not touch `expo-location`'s `watchPositionAsync`, `TripRepository.publishPing`/`httpTrip.publishPing`, or any trip-state logic in `src/features/trip/`.
- `toMapCoords.ts` itself is not modified or removed — `routeSegments.ts` still needs it for its own straight-line segment-distance labels, which is out of scope for this plan.
- Fetch geometry once per trip assignment, not per GPS tick.

---

### Task 1: `decodePolyline` utility

**Files:**
- Create: `src/lib/decodePolyline.ts`
- Test: `src/lib/decodePolyline.test.ts`

**Interfaces:**
- Produces: `function decodePolyline(encoded: string): { latitude: number; longitude: number }[]` matching this app's existing `MapCoord` shape (`toMapCoords.ts` returns `{ latitude, longitude }`), so the decoded output is a drop-in replacement wherever `toMapCoords`'s result currently feeds a `<Polyline>`.

- [ ] **Step 1: Write the failing test**

```ts
import { decodePolyline } from './decodePolyline'

describe('decodePolyline', () => {
  it('decodes a known Google encoded polyline fixture', () => {
    const result = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
    expect(result).toHaveLength(3)
    expect(result[0].latitude).toBeCloseTo(38.5, 4)
    expect(result[0].longitude).toBeCloseTo(-120.2, 4)
  })

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: this repo's test command (check `package.json`), filtered to `decodePolyline.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Write the implementation**

```ts
/** Decodes Google's polyline algorithm format into this app's MapCoord shape. */
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  if (!encoded) return []
  const points: { latitude: number; longitude: number }[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    lat += decodeSignedValue()
    lng += decodeSignedValue()
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 })
  }
  return points

  function decodeSignedValue(): number {
    let result = 0
    let shift = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    return (result & 1) !== 0 ? ~(result >> 1) : result >> 1
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: this repo's test command, filtered to `decodePolyline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/decodePolyline.ts src/lib/decodePolyline.test.ts
git commit -m "feat(transport): add Google encoded-polyline decoder"
```

---

### Task 2: Route geometry repo function + hook

**Files:**
- Create: `src/data/http/routeGeometry.repo.ts`
- Create: `src/features/trip/useRouteGeometry.ts`
- Test: `src/data/http/routeGeometry.repo.test.ts`

**Interfaces:**
- Consumes: this app's shared HTTP client, following exactly the pattern in `src/data/http/trip.repo.ts` (`httpTrip(http).myAssignment()` → `GET /staff/trip/assignment`, mapped via `toRoute`/`toStop` in `src/data/http/mappers.ts`).
- Produces:
  ```ts
  export interface RouteGeometryDTO {
    routeId: string; status: 'available' | 'unavailable'; format: string | null
    geometry: string | null; distanceMeters: number | null; durationSeconds: number | null
    stopSequenceHash: string; generatedAt: string | null
  }
  export function httpRouteGeometry(http: HttpClient): { get(routeId: string): Promise<RouteGeometryDTO> }
  export function useRouteGeometry(routeId: string | null | undefined): UseQueryResult<RouteGeometryDTO>
  ```

- [ ] **Step 1: Read `src/data/http/trip.repo.ts` and `src/data/http/mappers.ts` in full first**

Confirm the exact `http` client type, how `myAssignment()` issues its GET and unwraps the response, and the `toRoute`/`toStop` snake→camel mapping convention — mirror all three exactly.

- [ ] **Step 2: Write the failing repo test**, mirroring whatever exists for `trip.repo.ts` (check `src/data/http/trip.repo.test.ts` if present):

```ts
import { httpRouteGeometry } from './routeGeometry.repo'

describe('httpRouteGeometry', () => {
  it('gets route geometry for a route id', async () => {
    const http = { get: vi.fn().mockResolvedValue({ data: {
      route_id: 'r1', status: 'available', format: 'google-encoded-polyline',
      geometry: 'abc', distance_meters: 100, duration_seconds: 10,
      stop_sequence_hash: 'h', generated_at: '2026-09-19T10:00:00Z',
    } }) }
    const repo = httpRouteGeometry(http as any)
    const result = await repo.get('r1')
    expect(result.status).toBe('available')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

- [ ] **Step 4: Write `routeGeometry.repo.ts`**, following the confirmed `trip.repo.ts` pattern:

```ts
export interface RouteGeometryDTO {
  routeId: string
  status: 'available' | 'unavailable'
  format: string | null
  geometry: string | null
  distanceMeters: number | null
  durationSeconds: number | null
  stopSequenceHash: string
  generatedAt: string | null
}

export function httpRouteGeometry(http: HttpClient) {
  return {
    async get(routeId: string): Promise<RouteGeometryDTO> {
      const res = await http.get(`/transport/routes/${routeId}/geometry`)
      return {
        routeId: res.data.route_id,
        status: res.data.status,
        format: res.data.format,
        geometry: res.data.geometry,
        distanceMeters: res.data.distance_meters,
        durationSeconds: res.data.duration_seconds,
        stopSequenceHash: res.data.stop_sequence_hash,
        generatedAt: res.data.generated_at,
      }
    },
  }
}
```

- [ ] **Step 5: Write `useRouteGeometry`**, mirroring `useTripAssignment()`'s conventions in `src/features/trip/hooks.ts`:

```ts
export function useRouteGeometry(routeId: string | null | undefined) {
  return useQuery({
    queryKey: ['transport', 'routeGeometry', routeId],
    queryFn: () => httpRouteGeometry(http).get(routeId as string),
    enabled: !!routeId,
    staleTime: 60_000,
  })
}
```

- [ ] **Step 6: Run tests to verify they pass**

- [ ] **Step 7: Commit**

```bash
git add src/data/http/routeGeometry.repo.ts src/data/http/routeGeometry.repo.test.ts src/features/trip/useRouteGeometry.ts
git commit -m "feat(transport): add route geometry repo function and hook"
```

---

### Task 3: Wire road geometry into `LiveMapView` (native + web)

**Files:**
- Modify: `src/features/map/LiveMapView.tsx`
- Modify: `src/features/map/LiveMapView.web.tsx`
- Modify: `src/screens/LiveMapScreen.tsx`
- Test: whichever test file (if any) already covers `LiveMapView` — check first, following this repo's existing map-mocking pattern if one exists (`testID="map-polyline"` on the existing `<Polyline>` suggests there is already test coverage keyed off that testID — reuse it)

**Interfaces:**
- Consumes: `decodePolyline` (Task 1), `useRouteGeometry` (Task 2). Both `LiveMapView` variants gain a `routeGeometry?: RouteGeometryDTO` prop, additive alongside the existing `stops`/`toMapCoords`-derived prop.

- [ ] **Step 1: Read both files in full**, focusing on: `const coords = toMapCoords(stops)` (or equivalent) and `<Polyline testID="map-polyline" coordinates={coords} strokeWidth={6} strokeColor={colors.primary} />`.

- [ ] **Step 2: Write the failing test** (skip with a note if no existing render-test infra covers this component):

```tsx
it('renders no polyline and a Route unavailable badge when geometry is unavailable', () => {
  const { queryByTestId, getByText } = render(
    <LiveMapView stops={twoStops} routeGeometry={{ status: 'unavailable', geometry: null, /* ... */ }} />,
  )
  expect(queryByTestId('map-polyline')).toBeNull()
  expect(getByText(/route unavailable/i)).toBeTruthy()
})
```

- [ ] **Step 3: Run test to verify it fails** (skip if Step 2 skipped)

- [ ] **Step 4: Add the prop and swap the polyline source in both files**

```js
const roadPath = routeGeometry?.status === 'available' && routeGeometry.geometry
  ? decodePolyline(routeGeometry.geometry)
  : null
```

```jsx
{roadPath && roadPath.length > 1 && (
  <Polyline testID="map-polyline" coordinates={roadPath} strokeWidth={6} strokeColor={colors.primary} />
)}
{routeGeometry?.status === 'unavailable' && <RouteUnavailableBadge />}
```

Add a small `RouteUnavailableBadge` matching this component's existing overlay/label conventions (check `StopMarker.tsx`/`RouteSegmentLabel.tsx` for the styling pattern already used for map-overlaid text and reuse it rather than inventing new styles). `BusMarker` (own-device live GPS marker), `StopMarker`s, and `RouteSegmentLabel` distance/duration labels (still driven by `toMapCoords`/`routeSegments.ts`, unrelated to which polyline is drawn) are untouched.

- [ ] **Step 5: Wire the hook in `LiveMapScreen.tsx`**

```ts
const geometryQ = useRouteGeometry(tripAssignment?.route?.id)
```

```tsx
<LiveMapView stops={tripAssignment.route.stops} routeGeometry={geometryQ.data} {/* existing props unchanged */} />
```

Locate the exact existing prop list on this call site and add only the `routeGeometry` line.

- [ ] **Step 6: Run test to verify it passes** (skip if Step 2/3 skipped)

- [ ] **Step 7: Manual verification**

Run the app, open the driver/staff live trip screen with an active assignment, and confirm: own-device GPS marker (via `expo-location`) and ping publishing behave exactly as before; the route line renders from decoded geometry once backend geometry is available, or "Route unavailable" shows with no line otherwise; `RouteSegmentLabel` distance/duration text is unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/features/map/LiveMapView.tsx src/features/map/LiveMapView.web.tsx src/screens/LiveMapScreen.tsx
git commit -m "feat(transport): render road-following geometry in LiveMapView, preserving driver GPS publishing"
```

---

### Task 4: Full regression pass

- [ ] **Step 1: Run the full test suite**

Run: this repo's test command
Expected: PASS — including all existing trip/ping-publishing tests, unmodified.

- [ ] **Step 2: Confirm no unrelated files changed**

Run: `git status` and `git diff --stat`
Expected: only files from Tasks 1–3 changed; `expo-location` usage, `TripRepository.publishPing`/`httpTrip.publishPing`, `toMapCoords.ts`, and `routeSegments.ts` untouched.
