# SchoolMate Staff — Live Map for Driver/Conductor Trip

**Date:** 2026-09-03
**Status:** Approved design, ready for implementation planning
**Scope:** SP-1 follow-up — the **Staff app** only. Add a real Google Map (route polyline, stop
markers, live device-location marker) reachable from the existing `TripScreen`, for the driver
and conductor roles.

## Background

`src/screens/TripScreen.tsx` already shows the bus driver/conductor a `RouteStrip` progress bar
and a "broadcasting" banner, but the position on screen is faked by
`src/features/trip/simulateBus.ts` interpolating along the assigned route — there is no map and
no real device location involved. `expo-location` is already installed and already used for a
different feature (the attendance geofence check-in in `AttendanceScreen.tsx`), but no map
library (`react-native-maps` or equivalent) exists anywhere in the repo.

This spec adds a real map view. It does not touch the existing broadcasting/ping mechanism
(`features/trip/broadcaster.ts`), the `TripRepository` contract, or `RouteStrip` — it is purely
additive: a new screen, reached by a new button on `TripScreen`.

### Relationship to the wider live-tracking program

Per [[sms-staff-live-tracking-program]] this sits inside **SP-1** (Staff app). SP-2 (backend
contract), SP-3 (consumer maps in parent/teacher/principal apps) and SP-4 (CRM fleet view) are
unaffected and out of scope here.

## Goals

- Give the driver and conductor a real Google Map showing the assigned route (stops + polyline)
  and their own live device location, replacing the mental model of the fake `simulateBus.ts`
  position with something backed by `expo-location`.
- Work on **both native (Android/iOS) and web** (Chrome via `react-native-web`), since this app
  is run and demoed in the browser as well as on device.
- Stay additive: no changes to `TripRepository`, the broadcaster, or `RouteStrip`/`TripScreen`'s
  existing rendering — only a new screen and a new nav entry point.
- Leave real Google Maps API keys as placeholders (env var + `app.json` config) for the user to
  fill in later; the feature must degrade gracefully without a key rather than crash.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Platform scope | **Native + Web.** The map must render in the Chrome/web build, not just native. |
| API key | **Placeholder only.** `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` + `app.json` config fields left blank; user supplies real keys later. |
| Where the map lives | **New screen** (`LiveMapScreen`), pushed from `TripScreen` via a button. `TripScreen`'s existing `RouteStrip`/banner are untouched. |
| Position source | **Real device GPS** via `expo-location`'s foreground `watchPositionAsync`, not `simulateBus.ts`. Driver and conductor are physically on the bus, so the viewer's own location *is* the bus position — no new backend call needed to read back the other role's ping. |
| Backend/repository changes | **None.** Reuses existing `useTripAssignment()` (route/stops) and `useCurrentTrip()` (trip status). |

## Stack additions

On top of the existing stack (Expo SDK 54, React 19, RN 0.81, `react-native-web`,
`expo-location`, TanStack Query):

- **`react-native-maps`** — native (Android/iOS) map rendering with `PROVIDER_GOOGLE`.
- **`@teovilla/react-native-web-maps`** + **`@react-google-maps/api`** — web-compatible
  implementation of the same `react-native-maps`-shaped API, so the app can share a single
  component contract across platforms via Metro's `.web.tsx` platform-extension resolution.

No change to auth, theme, i18n, navigation library, or `src/data` foundation contract.

**Verify against the installed Expo SDK before coding** — per `AGENTS.md`, Expo has changed;
confirm `react-native-maps`'s config-plugin/`app.json` shape against the exact installed SDK
version (54) before wiring `app.json`.

## Component design

### `LiveMapView` (cross-platform wrapper)

Two files, same props, selected automatically by Metro:

```ts
type LiveMapViewProps = {
  stops: Stop[];              // from Route.stops, already lat/lng/seq/name/etaMin
  liveMarker?: { lat: number; lng: number } | null;
  onPermissionDenied?: () => void;
};
```

- **`src/features/map/LiveMapView.tsx`** (native) — `react-native-maps` `MapView` with
  `PROVIDER_GOOGLE`, a `Polyline` built from `stops` sorted by `seq`, a `Marker` per stop
  (name + `etaMin` in callout), and a live marker for `liveMarker` when present.
- **`src/features/map/LiveMapView.web.tsx`** (web) — same props, rendered via
  `@teovilla/react-native-web-maps`'s `MapView`/`Marker`/`Polyline`, backed by
  `@react-google-maps/api` and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. If the key is missing/empty,
  renders a plain fallback card ("Map unavailable") instead of invoking the JS loader.

A shared pure function, `src/features/map/toMapCoords.ts` (`stops: Stop[] => {lat,lng}[]` sorted
by `seq`), is used by both platform files so the stop-ordering logic isn't duplicated or tied to
either map library — this is the one piece of logic worth unit testing directly.

### `LiveMapScreen` (new screen)

`src/screens/LiveMapScreen.tsx`:

- Route param: `{ tripId: string }` (added to `MainStackParamList` in
  `src/navigation/types.ts`).
- Reads `route: Route` via the existing `useTripAssignment()` hook and trip status via
  `useCurrentTrip()`.
- Requests foreground location permission on mount (if not already granted) and starts
  `Location.watchPositionAsync` (foreground accuracy, ~5s interval) to feed `liveMarker`; stops
  watching on unmount.
- Renders `LiveMapView` with `stops`, `liveMarker`, and the existing `Skeleton` /
  `ErrorState` / `EmptyState` components for the loading/error/no-route cases (same pattern
  already used in `TripScreen`).
- Permission denied: map still renders route + stops with no live marker; a `Toast` (existing
  component) informs the user, with a Settings deep-link affordance matching the pattern already
  used for the attendance geofence's permission-denied state.

### Navigation

- `MainStackParamList` (`src/navigation/types.ts`) gains `LiveMap: { tripId: string }`.
- A new `Stack.Screen` for `LiveMap` is registered in `MainTabNavigator.tsx` alongside the
  existing `Trip`/`Attendance` stack screens (card presentation, slide-in — matching `Trip`).
- `TripScreen` gets a **"View Live Map"** button, visible for both driver and conductor whenever
  a trip is active, navigating to `LiveMap` with the current `tripId`. No other change to
  `TripScreen`.

## Config

- `.env`: new placeholder `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=` (empty, matching the existing
  `EXPO_PUBLIC_API_BASE_URL` convention already in the file).
- `app.json`: placeholder fields for native keys —
  `expo.android.config.googleMaps.apiKey` and `expo.ios.config.googleMapsApiKey` — left blank
  for the user to fill in.
- `react-native-maps`'s Expo config plugin added to `app.json`'s `plugins` array per the
  installed SDK's documented shape (confirm exact key names against SDK 54 docs during
  implementation, not assumed here).

## Error handling

- **Missing web API key** → `LiveMapView.web.tsx` fallback card, no crash, no network call.
- **Location permission denied** → map renders without a live marker; toast explains why, with
  a Settings deep-link (reusing the existing denied-state pattern from `AttendanceScreen`).
- **No route/stops data** (e.g. trip assignment still loading or failed) → existing
  `Skeleton`/`ErrorState`/`EmptyState` components, same as `TripScreen` already does.
- **watchPositionAsync failure** (e.g. GPS unavailable) → live marker simply absent; no crash;
  route/stops still render.

## Testing

- **`toMapCoords.ts`** — pure-function unit test: given stops out of `seq` order, returns
  coordinates sorted by `seq`.
- **`LiveMapView` (native)** — Jest manual mock of `react-native-maps`; assert marker count
  equals `stops.length`, polyline built in `seq` order, live marker rendered iff `liveMarker`
  present.
- **`LiveMapView.web`** — Jest manual mock of `@teovilla/react-native-web-maps`/
  `@react-google-maps/api`; assert same marker/polyline behavior, and the missing-API-key
  fallback path renders the fallback card instead of the map.
- **`LiveMapScreen`** — mock `expo-location.watchPositionAsync` and `useTripAssignment`/
  `useCurrentTrip`; cover: happy path (stops + live marker render), permission-denied path (toast
  shown, no live marker, route/stops still shown), loading/error/empty states via existing
  `Skeleton`/`ErrorState`/`EmptyState`.
- **Navigation** — `TripScreen` renders the "View Live Map" button for driver and conductor when
  a trip is active, and navigating fires with the correct `tripId` param.
- No new repository/HTTP contract tests are needed — no repository changes.

## Gotchas (carried + new)

- Carried: dropdowns/toasts render at screen root with a scrim; each component owns its
  `StyleSheet.create`; clipping containers need `flexShrink:0`.
- **`react-native-maps` has no first-party web support** — the web build must go through
  `@teovilla/react-native-web-maps`, a separate package with its own API surface; keep it fully
  isolated behind the `.web.tsx` platform file so `LiveMapScreen` never imports a map library
  directly.
- **Two separate API keys/mechanisms**: native `react-native-maps` uses the `app.json`
  config-plugin key (used by the native Google Maps SDK at build time); web uses
  `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` at runtime via the JS loader. Both must be set independently
  for the feature to fully work — a placeholder in one does not cover the other.
- **Foreground-only location** for this feature (unlike the background broadcaster in
  `features/trip/broadcaster.ts`, which is a separate, already-running mechanism) — `LiveMapScreen`
  only tracks location while it is open; do not conflate the two location consumers.
- Confirm `react-native-maps`'s Expo config-plugin key names against the installed SDK 54 docs
  before editing `app.json` — do not assume prior-SDK key shapes.

## Out of scope

- Real Google Maps API keys (left as placeholders for the user).
- Changes to `TripRepository`, `broadcaster.ts`, or `simulateBus.ts`.
- Reading back the *other* role's live position (e.g. conductor seeing driver's GPS pin) — both
  roles see their own device location only, since they're on the same bus.
- SP-2/SP-3/SP-4 (backend contract, consumer maps in other apps, CRM fleet view).
