# Live Map for Driver/Conductor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Google Map screen (route polyline, stop markers, live device-location marker) reachable from `TripScreen`, working on both native (Android/iOS) and web (Chrome via `react-native-web`).

**Architecture:** A cross-platform `LiveMapView` wrapper (`.tsx` for native via `react-native-maps`, `.web.tsx` for web via `@teovilla/react-native-web-maps`) sits behind a new `LiveMapScreen`, which reuses the existing `useTripAssignment`/`useCurrentTrip` hooks for route data and calls `expo-location`'s `watchPositionAsync` directly for the live marker. No `TripRepository`, broadcaster, or `TripScreen` rendering changes beyond a single new nav button.

**Tech Stack:** Expo SDK ~54.0.37, React 19.1.0, React Native 0.81.5, `react-native-web` ^0.21.0, `expo-location` ~19.0.8, `@tanstack/react-query` ^5.100.14, `react-native-maps` (native), `@teovilla/react-native-web-maps` + `@react-google-maps/api` (web), Jest ^29.7.0 + `jest-expo` ~54.0.18 + `@testing-library/react-native` ^13.3.3.

**Spec:** `docs/superpowers/specs/2026-09-03-live-map-driver-conductor-design.md`

## Global Constraints

- Platform scope: map must render on **both native and web** (Chrome via `react-native-web`).
- No changes to `TripRepository`, `features/trip/broadcaster.ts`, or `features/trip/simulateBus.ts` — purely additive.
- No real Google Maps API keys committed — `.env` and `app.json` get **placeholder/blank** values only.
- `react-native-maps` must never be imported by web code, and `@teovilla/react-native-web-maps`/`@react-google-maps/api` must never be imported by native code — isolate behind the `.tsx`/`.web.tsx` platform-extension split.
- All new user-facing strings must be added to **all four** locale files (`en`, `hi`, `mr`, `ta`) — enforced by `src/i18n/__tests__/keys.test.ts`'s "identical key sets" check.
- Hold the project's quality bar: TDD, green Jest suite, `tsc --noEmit` clean, `eslint .` clean.
- Deviation from spec (confirmed against actual code, not assumed): the spec mentions a "Settings deep-link affordance matching the attendance geofence's permission-denied pattern" — **no such deep-link pattern exists** in this codebase (`AttendanceScreen.tsx`'s denied path is just a silent no-op UI state, no toast, no Settings link). This plan uses a plain `useToast().show(...)` message on denial instead, which is simpler and consistent with what's actually precedented.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/features/map/toMapCoords.ts` (new) | Pure function: `Stop[]` → coordinates sorted by `seq`. Shared by both platform files. |
| `src/features/map/LiveMapView.tsx` (new) | Native map rendering via `react-native-maps` (`MapView`, `Marker`, `Polyline`, `PROVIDER_GOOGLE`). |
| `src/features/map/LiveMapView.web.tsx` (new) | Web map rendering via `@teovilla/react-native-web-maps`; same props; renders a fallback card if the API key is missing. |
| `src/screens/LiveMapScreen.tsx` (new) | Screen: reads route/trip via existing hooks, manages `watchPositionAsync`, renders `LiveMapView` + loading/error/empty states. |
| `src/navigation/types.ts` (modify) | Add `LiveMap: { tripId: string }` to `MainStackParamList`. |
| `src/navigation/MainTabNavigator.tsx` (modify) | Register the `LiveMap` stack screen. |
| `src/screens/TripScreen.tsx` (modify) | Add a "View Live Map" button in the live-trip branch. |
| `.env` (modify) | Add placeholder `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=`. |
| `app.json` (modify) | Add native Google Maps API key placeholders + `react-native-maps` config plugin. |
| `package.json` (modify) | Add `react-native-maps`, `@teovilla/react-native-web-maps`, `@react-google-maps/api`. |
| `src/i18n/resources/{en,hi,mr,ta}.json` (modify) | Add `trip.viewMap` and `trip.locationDenied` keys. |
| `src/i18n/__tests__/keys.test.ts` (modify) | Add the two new keys to `REQUIRED`. |

---

### Task 1: Install dependencies + config placeholders

**Files:**
- Modify: `package.json`
- Modify: `.env`
- Modify: `app.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `react-native-maps`, `@teovilla/react-native-web-maps`, `@react-google-maps/api` available as imports for later tasks; `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` readable via `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

- [ ] **Step 1: Install the Expo-managed native map dependency**

Run: `npx expo install react-native-maps`

Expected: `package.json` gains a `react-native-maps` entry at the version Expo 54 resolves as compatible; `package-lock.json` updates.

- [ ] **Step 2: Install the web map dependencies**

Run: `npm install @teovilla/react-native-web-maps@^0.9.5 @react-google-maps/api@^2.20.8`

Expected: both added to `package.json` dependencies; `package-lock.json` updates.

- [ ] **Step 3: Add the placeholder web API key to `.env`**

Current `.env`:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:5162/v1
EXPO_PUBLIC_DATA_SOURCE=live
```

New `.env`:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:5162/v1
EXPO_PUBLIC_DATA_SOURCE=live
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

- [ ] **Step 4: Add native Google Maps config + plugin to `app.json`**

Current `app.json` (`expo` object, relevant parts):
```json
{
  "expo": {
    "ios": { "supportsTablet": true, "infoPlist": { "...": "..." } },
    "android": {
      "package": "com.catretech.schoolmatestaff",
      "adaptiveIcon": { "...": "..." },
      "predictiveBackGestureEnabled": false,
      "permissions": ["..."]
    },
    "plugins": [
      ["expo-location", { "...": "..." }],
      "expo-secure-store"
    ]
  }
}
```

Edit `app.json`: add `"config": { "googleMaps": { "apiKey": "" } }` inside `expo.android`, add `"config": { "googleMapsApiKey": "" }` inside `expo.ios`, and append `"react-native-maps"` to the `plugins` array (react-native-maps' Expo config plugin requires no extra options beyond the key already set on `android.config`/`ios.config`). Resulting shape:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "config": { "googleMapsApiKey": "" },
      "infoPlist": { "...": "..." }
    },
    "android": {
      "package": "com.catretech.schoolmatestaff",
      "adaptiveIcon": { "...": "..." },
      "predictiveBackGestureEnabled": false,
      "permissions": ["..."],
      "config": { "googleMaps": { "apiKey": "" } }
    },
    "plugins": [
      ["expo-location", { "...": "..." }],
      "expo-secure-store",
      "react-native-maps"
    ]
  }
}
```

Keep every other existing key in `app.json` untouched — only add the `config` blocks and the `plugins` entry shown above.

**Note:** confirm the exact key names (`config.googleMaps.apiKey` for Android, `config.googleMapsApiKey` for iOS, and whether `react-native-maps` needs a bare string or `["react-native-maps", {...}]` tuple in `plugins`) against `node_modules/react-native-maps/app.plugin.js`'s README once installed — these are the documented names as of `react-native-maps@1.29.0` but Expo SDK 54 specifics should be double-checked at implementation time per `AGENTS.md`'s "Expo has changed" warning.

- [ ] **Step 5: Verify install and config don't break anything**

Run: `npx tsc --noEmit`
Expected: no new errors (no code imports the new packages yet, so this should be identical to pre-task output).

Run: `npx expo config --json | node -e "const c=require('fs').readFileSync(0,'utf8'); JSON.parse(c)"`
Expected: exits 0 (confirms `app.json` is still valid JSON that Expo can parse).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env app.json
git commit -m "chore(map): add map dependencies and placeholder Google Maps config"
```

---

### Task 2: `toMapCoords` pure function

**Files:**
- Create: `src/features/map/toMapCoords.ts`
- Test: `src/features/map/__tests__/toMapCoords.test.ts`

**Interfaces:**
- Consumes: `Stop` from `src/data/domain/trip.ts` (`{ id: string; name: string; lat: number; lng: number; seq: number; etaMin?: number }`).
- Produces: `toMapCoords(stops: Stop[]): { latitude: number; longitude: number }[]` — used by Tasks 3 and 4.

- [ ] **Step 1: Write the failing test**

```ts
// src/features/map/__tests__/toMapCoords.test.ts
import { toMapCoords } from '@/features/map/toMapCoords';
import type { Stop } from '@/data/domain';

describe('toMapCoords', () => {
  it('returns coordinates sorted by seq, regardless of input order', () => {
    const stops: Stop[] = [
      { id: 'b', name: 'Stop B', lat: 12.2, lng: 77.2, seq: 2 },
      { id: 'a', name: 'Stop A', lat: 12.1, lng: 77.1, seq: 1 },
      { id: 'c', name: 'Stop C', lat: 12.3, lng: 77.3, seq: 3 },
    ];
    expect(toMapCoords(stops)).toEqual([
      { latitude: 12.1, longitude: 77.1 },
      { latitude: 12.2, longitude: 77.2 },
      { latitude: 12.3, longitude: 77.3 },
    ]);
  });

  it('returns an empty array for no stops', () => {
    expect(toMapCoords([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/map/__tests__/toMapCoords.test.ts`
Expected: FAIL — `Cannot find module '@/features/map/toMapCoords'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/features/map/toMapCoords.ts
import type { Stop } from '@/data/domain';

export interface MapCoord {
  latitude: number;
  longitude: number;
}

export function toMapCoords(stops: Stop[]): MapCoord[] {
  return [...stops]
    .sort((a, b) => a.seq - b.seq)
    .map((s) => ({ latitude: s.lat, longitude: s.lng }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/map/__tests__/toMapCoords.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/map/toMapCoords.ts src/features/map/__tests__/toMapCoords.test.ts
git commit -m "feat(map): add toMapCoords pure stop-to-coordinate mapper"
```

---

### Task 3: i18n keys

**Files:**
- Modify: `src/i18n/resources/en.json`
- Modify: `src/i18n/resources/hi.json`
- Modify: `src/i18n/resources/mr.json`
- Modify: `src/i18n/resources/ta.json`
- Modify: `src/i18n/__tests__/keys.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `t('trip.viewMap')` and `t('trip.locationDenied')` usable from Tasks 5 and 7.

- [ ] **Step 1: Write the failing test**

Edit `src/i18n/__tests__/keys.test.ts` line 8:

```ts
const REQUIRED = ['login.sendOtp','home.tapCheckIn','attendance.checkIn','nav.home','role.conductor.onBoard','trip.viewMap','trip.locationDenied'];
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/i18n/__tests__/keys.test.ts`
Expected: FAIL — `expect(dict).toHaveProperty(["trip.viewMap"])` fails for `en`.

- [ ] **Step 3: Add the keys to all four locale files**

In `src/i18n/resources/en.json`, immediately after line 117 (`"trip.permissionDenied": "..."`):
```json
  "trip.viewMap": "View live map",
  "trip.locationDenied": "Location permission is needed to show your position on the map",
```

In `src/i18n/resources/hi.json`, immediately after the `trip.permissionDenied` line:
```json
  "trip.viewMap": "लाइव मैप देखें",
  "trip.locationDenied": "मैप पर आपकी स्थिति दिखाने के लिए स्थान अनुमति आवश्यक है",
```

In `src/i18n/resources/mr.json`, immediately after the `trip.permissionDenied` line:
```json
  "trip.viewMap": "लाइव्ह नकाशा पहा",
  "trip.locationDenied": "नकाशावर तुमचे स्थान दाखवण्यासाठी स्थान परवानगी आवश्यक आहे",
```

In `src/i18n/resources/ta.json`, immediately after the `trip.permissionDenied` line:
```json
  "trip.viewMap": "நேரடி வரைபடத்தைப் பார்",
  "trip.locationDenied": "வரைபடத்தில் உங்கள் இருப்பிடத்தைக் காட்ட இருப்பிட அனுமதி தேவை",
```

Each JSON file must remain valid (no trailing commas after the last inserted line if it precedes a closing brace — check the following line in each file and add/remove trailing commas accordingly).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/i18n/__tests__/keys.test.ts`
Expected: PASS (both tests: required keys present, identical key sets across all four dictionaries).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/resources/en.json src/i18n/resources/hi.json src/i18n/resources/mr.json src/i18n/resources/ta.json src/i18n/__tests__/keys.test.ts
git commit -m "feat(i18n): add trip.viewMap and trip.locationDenied keys"
```

---

### Task 4: Native `LiveMapView`

**Files:**
- Create: `src/features/map/LiveMapView.tsx`
- Test: `src/features/map/__tests__/LiveMapView.test.tsx`

**Interfaces:**
- Consumes: `Stop` from `@/data/domain`; `toMapCoords` from `@/features/map/toMapCoords` (Task 2); `react-native-maps` (Task 1).
- Produces: `LiveMapViewProps` and `LiveMapView` component — consumed by `LiveMapScreen` (Task 6). Props:
```ts
export interface LiveMapViewProps {
  stops: Stop[];
  liveMarker?: { latitude: number; longitude: number } | null;
}
```

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/map/__tests__/LiveMapView.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { LiveMapView } from '@/features/map/LiveMapView';
import type { Stop } from '@/data/domain';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = ({ children, testID }: any) => <View testID={testID}>{children}</View>;
  const MockMarker = ({ testID }: any) => <View testID={testID} />;
  const MockPolyline = ({ testID }: any) => <View testID={testID} />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    PROVIDER_GOOGLE: 'google',
  };
});

const stops: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1, etaMin: 5 },
  { id: 's2', name: 'Market', lat: 12.2, lng: 77.2, seq: 2, etaMin: 12 },
];

describe('LiveMapView (native)', () => {
  it('renders one marker per stop and a polyline', () => {
    const { getAllByTestId, getByTestId } = render(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getAllByTestId(/^map-stop-/)).toHaveLength(2);
    expect(getByTestId('map-polyline')).toBeTruthy();
  });

  it('renders a live marker only when liveMarker is provided', () => {
    const { queryByTestId, rerender } = render(<LiveMapView stops={stops} liveMarker={null} />);
    expect(queryByTestId('map-live-marker')).toBeNull();
    rerender(<LiveMapView stops={stops} liveMarker={{ latitude: 12.15, longitude: 77.15 }} />);
    expect(queryByTestId('map-live-marker')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/map/__tests__/LiveMapView.test.tsx`
Expected: FAIL — `Cannot find module '@/features/map/LiveMapView'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/features/map/LiveMapView.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Stop } from '@/data/domain';
import { toMapCoords } from './toMapCoords';

export interface LiveMapViewProps {
  stops: Stop[];
  liveMarker?: { latitude: number; longitude: number } | null;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({ stops, liveMarker }) => {
  const coords = toMapCoords(stops);
  const initial = coords[0] ?? { latitude: 0, longitude: 0 };

  return (
    <MapView
      testID="live-map"
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{ ...initial, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
    >
      <Polyline testID="map-polyline" coordinates={coords} strokeWidth={4} />
      {stops.map((s) => (
        <Marker
          key={s.id}
          testID={`map-stop-${s.id}`}
          coordinate={{ latitude: s.lat, longitude: s.lng }}
          title={s.name}
          description={s.etaMin != null ? `${s.etaMin} min` : undefined}
        />
      ))}
      {liveMarker && (
        <Marker testID="map-live-marker" coordinate={liveMarker} pinColor="blue" />
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: { flex: 1 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/map/__tests__/LiveMapView.test.tsx`
Expected: PASS (2 tests). If it fails on the `react-native-maps` import shape, check `node_modules/react-native-maps/lib/index.d.ts` for the actual named exports and adjust the mock/import accordingly — the default export and `Marker`/`Polyline`/`PROVIDER_GOOGLE` named exports are the documented v1.29.0 API but should be confirmed against the installed version.

- [ ] **Step 5: Commit**

```bash
git add src/features/map/LiveMapView.tsx src/features/map/__tests__/LiveMapView.test.tsx
git commit -m "feat(map): add native LiveMapView using react-native-maps"
```

---

### Task 5: Web `LiveMapView.web`

**Files:**
- Create: `src/features/map/LiveMapView.web.tsx`
- Test: `src/features/map/__tests__/LiveMapView.web.test.tsx`

**Interfaces:**
- Consumes: same `LiveMapViewProps` shape as Task 4 (`stops`, `liveMarker`); `toMapCoords` from Task 2; `@teovilla/react-native-web-maps` (Task 1); `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (Task 1).
- Produces: `LiveMapView` component (web variant) — Metro resolves this file automatically for web builds when other code imports `@/features/map/LiveMapView`; no separate import path needed.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/map/__tests__/LiveMapView.web.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { LiveMapView } from '@/features/map/LiveMapView.web';
import type { Stop } from '@/data/domain';

jest.mock('@teovilla/react-native-web-maps', () => {
  const { View } = require('react-native');
  const MockMapView = ({ children, testID }: any) => <View testID={testID}>{children}</View>;
  const MockMarker = ({ testID }: any) => <View testID={testID} />;
  const MockPolyline = ({ testID }: any) => <View testID={testID} />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

const stops: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1 },
  { id: 's2', name: 'Market', lat: 12.2, lng: 77.2, seq: 2 },
];

describe('LiveMapView (web)', () => {
  const OLD_ENV = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  afterEach(() => { process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = OLD_ENV; });

  it('renders the map with markers and a polyline when an API key is present', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    const { getAllByTestId, getByTestId } = render(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getAllByTestId(/^map-stop-/)).toHaveLength(2);
    expect(getByTestId('map-polyline')).toBeTruthy();
  });

  it('renders a fallback card instead of the map when the API key is missing', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = '';
    const { getByTestId, queryByTestId } = render(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getByTestId('map-unavailable')).toBeTruthy();
    expect(queryByTestId('live-map')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/map/__tests__/LiveMapView.web.test.tsx`
Expected: FAIL — `Cannot find module '@/features/map/LiveMapView.web'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/features/map/LiveMapView.web.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from '@teovilla/react-native-web-maps';
import type { Stop } from '@/data/domain';
import { toMapCoords } from './toMapCoords';

export interface LiveMapViewProps {
  stops: Stop[];
  liveMarker?: { latitude: number; longitude: number } | null;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({ stops, liveMarker }) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const coords = toMapCoords(stops);
  const initial = coords[0] ?? { latitude: 0, longitude: 0 };

  if (!apiKey) {
    return (
      <View testID="map-unavailable" style={styles.fallback}>
        <Text style={styles.fallbackText}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <MapView
      testID="live-map"
      style={styles.map}
      googleMapsApiKey={apiKey}
      initialRegion={{ ...initial, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
    >
      <Polyline testID="map-polyline" coordinates={coords} strokeWidth={4} />
      {stops.map((s) => (
        <Marker
          key={s.id}
          testID={`map-stop-${s.id}`}
          coordinate={{ latitude: s.lat, longitude: s.lng }}
          title={s.name}
        />
      ))}
      {liveMarker && (
        <Marker testID="map-live-marker" coordinate={liveMarker} />
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: { flex: 1 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackText: { fontSize: 14, color: '#666' },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/map/__tests__/LiveMapView.web.test.tsx`
Expected: PASS (2 tests). If the `googleMapsApiKey` prop name doesn't match, check `node_modules/@teovilla/react-native-web-maps/dist/index.d.ts` for the actual prop (documented as `googleMapsApiKey` as of v0.9.5) and adjust.

- [ ] **Step 5: Commit**

```bash
git add src/features/map/LiveMapView.web.tsx src/features/map/__tests__/LiveMapView.web.test.tsx
git commit -m "feat(map): add web LiveMapView using react-native-web-maps"
```

---

### Task 6: `LiveMapScreen`

**Files:**
- Create: `src/screens/LiveMapScreen.tsx`
- Test: `src/screens/__tests__/LiveMapScreen.test.tsx`

**Interfaces:**
- Consumes: `useTripAssignment`, `useCurrentTrip` from `@/features/trip/hooks` (return `assignment.data: TripAssignment | undefined`, `current.data: Trip | null | undefined`); `LiveMapView` from `@/features/map/LiveMapView` (Task 4, Metro resolves web variant automatically); `Skeleton`, `useToast` from `@/components/ui`; `ErrorState` from `@/components/state`; `expo-location`'s `requestForegroundPermissionsAsync`/`watchPositionAsync`.
- Produces: `LiveMapScreen` component with signature `({ navigation, route }: { navigation: any; route: { params: { tripId: string } } }) => JSX.Element` — consumed by `MainTabNavigator` (Task 7).

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/__tests__/LiveMapScreen.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { LiveMapScreen } from '@/screens/LiveMapScreen';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  watchPositionAsync: jest.fn(async (_opts, cb) => {
    cb({ coords: { latitude: 12.15, longitude: 77.15 } });
    return { remove: jest.fn() };
  }),
}));

const mockAssignment = {
  data: {
    route: {
      id: 'r1', name: 'Route 1', assignedBusNo: 'KA-01',
      stops: [
        { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1 },
        { id: 's2', name: 'Market', lat: 12.2, lng: 77.2, seq: 2 },
      ],
    },
    busNo: 'KA-01',
  },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const mockCurrent = { data: { id: 't1', routeId: 'r1', busNo: 'KA-01', driverId: 'd1', direction: 'pickup', status: 'live' }, isLoading: false };

jest.mock('@/features/trip/hooks', () => ({
  useTripAssignment: () => mockAssignment,
  useCurrentTrip: () => mockCurrent,
}));

jest.mock('@/features/map/LiveMapView', () => ({
  LiveMapView: ({ stops, liveMarker }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="live-map-view">
        <Text testID="stop-count">{stops.length}</Text>
        {liveMarker && <Text testID="has-live-marker">yes</Text>}
      </View>
    );
  },
}));

describe('LiveMapScreen', () => {
  it('renders the map with stops and the live marker once GPS resolves', async () => {
    const { getByTestId } = render(
      <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
    );
    await waitFor(() => expect(getByTestId('has-live-marker')).toBeTruthy());
    expect(getByTestId('stop-count').props.children).toBe(2);
  });

  it('shows a toast and still renders stops when location permission is denied', async () => {
    const Location = require('expo-location');
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const { getByTestId, queryByTestId } = render(
      <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
    );
    await waitFor(() => expect(getByTestId('live-map-view')).toBeTruthy());
    expect(queryByTestId('has-live-marker')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: FAIL — `Cannot find module '@/screens/LiveMapScreen'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/screens/LiveMapScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useTheme } from '@/theme';
import { IconBtn, Skeleton, useToast } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';
import { Text } from 'react-native';
import { useTripAssignment, useCurrentTrip } from '@/features/trip/hooks';
import { LiveMapView } from '@/features/map/LiveMapView';

export const LiveMapScreen = ({ navigation, route }: { navigation: any; route: { params: { tripId: string } } }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const assignment = useTripAssignment();
  const current = useCurrentTrip();
  const [liveMarker, setLiveMarker] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        toast.show(t('trip.locationDenied'), 'error');
        return;
      }
      try {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            if (!cancelled) {
              setLiveMarker({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            }
          }
        );
      } catch {
        // GPS unavailable — leave liveMarker null, route/stops still render.
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <IconBtn icon="back" label={t('common.back')} onPress={() => navigation.goBack()} />
        <Text style={[TextScale.screenTitle, { color: colors.ink }]}>{t('trip.viewMap')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.body}>
        {assignment.isLoading || current.isLoading ? (
          <Skeleton width="100%" height="100%" radius={16} />
        ) : assignment.isError ? (
          <ErrorState onRetry={assignment.refetch} />
        ) : (
          <LiveMapView stops={assignment.data?.route.stops ?? []} liveMarker={liveMarker} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerSpacer: { flex: 1 },
  body: { flex: 1 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/LiveMapScreen.test.tsx`
Expected: PASS (2 tests). If `Location.Accuracy` isn't a recognized export in the mocked module for a given test, extend the `jest.mock('expo-location', ...)` block in the test file to include `Accuracy: { Balanced: 3 }`.

- [ ] **Step 5: Commit**

```bash
git add src/screens/LiveMapScreen.tsx src/screens/__tests__/LiveMapScreen.test.tsx
git commit -m "feat(map): add LiveMapScreen with real GPS live marker"
```

---

### Task 7: Navigation wiring

**Files:**
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/MainTabNavigator.tsx`
- Test: `src/navigation/__tests__/MainTabNavigator.test.tsx` (create if no existing navigation test file covers stack screen registration — check first; if one exists, extend it instead)

**Interfaces:**
- Consumes: `LiveMapScreen` from `@/screens/LiveMapScreen` (Task 6).
- Produces: `MainStackParamList['LiveMap']: { tripId: string }` — consumed by Task 8's `navigation.navigate('LiveMap', { tripId })` call.

- [ ] **Step 1: Check for an existing navigator test**

Run: `ls src/navigation/__tests__/ 2>/dev/null || echo "none"`

If a test file already renders `MainTabNavigator` and asserts on registered screens, add a case there instead of creating a new file; otherwise proceed with Step 2 below creating a new one.

- [ ] **Step 2: Write the failing test**

```tsx
// src/navigation/__tests__/MainTabNavigator.test.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { MainTabNavigator } from '@/navigation/MainTabNavigator';

jest.mock('@/screens/HomeScreen', () => ({ HomeScreen: () => null }));
jest.mock('@/screens/LeaveScreen', () => ({ LeaveScreen: () => null }));
jest.mock('@/screens/TasksScreen', () => ({ TasksScreen: () => null }));
jest.mock('@/screens/MeScreen', () => ({ MeScreen: () => null }));
jest.mock('@/screens/AttendanceScreen', () => ({ AttendanceScreen: () => null }));
jest.mock('@/screens/TripScreen', () => ({ TripScreen: () => null }));
jest.mock('@/screens/LiveMapScreen', () => ({ LiveMapScreen: () => null }));

describe('MainTabNavigator', () => {
  it('renders without crashing now that LiveMap is registered', () => {
    expect(() => render(<NavigationContainer><MainTabNavigator /></NavigationContainer>)).not.toThrow();
  });
});
```

Adjust the mocked screen import paths above to match whatever `MainTabNavigator.tsx` actually imports (confirm exact filenames for Leave/Tasks/Me screens by reading the file before writing this test, since only Home/Trip/Attendance were confirmed during design).

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/navigation/__tests__/MainTabNavigator.test.tsx`
Expected: FAIL — `Cannot find module '@/screens/LiveMapScreen'` is already satisfied by Task 6, so instead this should fail because `LiveMap` isn't yet a valid screen name / `MainStackParamList` type error surfaces at typecheck, or the test simply passes vacuously. If it passes without the type change, that's fine — the real signal for this task is the `tsc --noEmit` step below; keep this test as a regression guard that the navigator still renders.

- [ ] **Step 4: Add `LiveMap` to `MainStackParamList`**

Current `src/navigation/types.ts`:
```ts
export type RootStackParamList = { Login: undefined; Main: undefined; };
export type MainStackParamList = { Tabs: undefined; Attendance: undefined; Trip: undefined; };
export type MainTabParamList = { Home: undefined; Leave: undefined; Tasks: undefined; Me: undefined; };
```

New:
```ts
export type RootStackParamList = { Login: undefined; Main: undefined; };
export type MainStackParamList = { Tabs: undefined; Attendance: undefined; Trip: undefined; LiveMap: { tripId: string }; };
export type MainTabParamList = { Home: undefined; Leave: undefined; Tasks: undefined; Me: undefined; };
```

- [ ] **Step 5: Register the screen in `MainTabNavigator.tsx`**

Add the import next to the existing `TripScreen` import:
```tsx
import { LiveMapScreen } from '@/screens/LiveMapScreen';
```

Add the stack screen next to the existing `Trip` registration:
```tsx
<Stack.Screen name="LiveMap" component={LiveMapScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest src/navigation/__tests__/MainTabNavigator.test.tsx`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 7: Commit**

```bash
git add src/navigation/types.ts src/navigation/MainTabNavigator.tsx src/navigation/__tests__/MainTabNavigator.test.tsx
git commit -m "feat(nav): register LiveMap stack screen"
```

---

### Task 8: "View Live Map" button on `TripScreen`

**Files:**
- Modify: `src/screens/TripScreen.tsx`
- Test: `src/screens/__tests__/TripScreen.test.tsx` (extend existing — check first with `ls src/screens/__tests__/TripScreen*` before assuming it doesn't exist)

**Interfaces:**
- Consumes: `MainStackParamList['LiveMap']` (Task 7); existing `trip: Trip | undefined` from `current.data` already in scope in `TripScreen`.
- Produces: nothing consumed by later tasks — this is the final integration point.

- [ ] **Step 1: Check for an existing TripScreen test file**

Run: `ls src/screens/__tests__/TripScreen* 2>/dev/null || echo "none"`

If one exists, add the new test case into it following its existing mocking setup (mirror how it already mocks `@/features/trip/hooks`); otherwise write a new minimal test file as below.

- [ ] **Step 2: Write the failing test**

```tsx
// src/screens/__tests__/TripScreen.test.tsx (new case, or add alongside existing ones)
it('navigates to LiveMap with the current tripId when "View Live Map" is pressed', () => {
  // reuse this file's existing mocks for useTripAssignment/useCurrentTrip/useStartTrip/useEndTrip
  // returning an active trip with id 't1', matching the file's existing "live trip" test setup
  const navigate = jest.fn();
  const { getByTestId } = render(<TripScreen navigation={{ goBack: jest.fn(), navigate }} />);
  fireEvent.press(getByTestId('trip-view-map'));
  expect(navigate).toHaveBeenCalledWith('LiveMap', { tripId: 't1' });
});
```

Adapt the exact mock shape (query hook return values, live-trip fixture) to match whatever this test file's existing "renders the live trip" test already sets up — do not duplicate a second incompatible mock scheme in the same file.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/TripScreen.test.tsx`
Expected: FAIL — `Unable to find an element with testID: trip-view-map`.

- [ ] **Step 4: Add the button to `TripScreen.tsx`**

In `src/screens/TripScreen.tsx`, insert a new `Btn` right after the bus-number `Card` block (after line 152, `</Card>`, before line 153 `{role.key === 'conductor' && <RosterPanel ... />}`):

```tsx
<Btn
  testID="trip-view-map"
  label={t('trip.viewMap')}
  onPress={() => navigation.navigate('LiveMap', { tripId: trip.id })}
  accent={accent}
  style={styles.cta}
/>
```

Resulting order inside the `trip ? (...)` branch: banner → `RouteStrip` → bus `Card` → **new "View Live Map" `Btn`** → `role.key === 'conductor' && <RosterPanel .../>` → "End trip" `Btn`. No `role.key` check on the new button — both driver and conductor see it whenever `trip` is truthy, per the spec's "visible for both driver and conductor whenever a trip is active."

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/TripScreen.test.tsx`
Expected: PASS.

Run: `npx jest` (full suite)
Expected: all tests green.

Run: `npx tsc --noEmit && npx eslint .`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/screens/TripScreen.tsx src/screens/__tests__/TripScreen.test.tsx
git commit -m "feat(trip): add View Live Map button navigating to LiveMap screen"
```

---

### Task 9: Full verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full Jest suite**

Run: `npx jest`
Expected: all tests pass, including every test added in Tasks 2–8.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint .`
Expected: no errors.

- [ ] **Step 4: Web export builds**

Run: `npx expo export --platform web`
Expected: exits 0, confirming `LiveMapView.web.tsx` and its dependencies bundle cleanly for web even though no real API key is set (the fallback-card path in Task 5 means this must succeed without a key).

- [ ] **Step 5: Manual smoke check (per the `run` skill's "drive it, don't just launch it")**

Run: `npx expo start --web` and open the app in Chrome (reuse the already-running dev server from this session if still up); log in as a driver or conductor role, start a trip, press "View Live Map", and confirm:
- the fallback "Map unavailable" card renders (since `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is still blank),
- no console errors/crashes,
- the back button returns to `TripScreen`.

This confirms the feature degrades gracefully with no real key, per the spec's explicit requirement. Full map rendering (actual tiles, live marker on a real map) can only be confirmed once the user supplies real API keys — note this limitation when reporting completion.

- [ ] **Step 6: Final commit (if anything was fixed during verification)**

```bash
git add -A
git commit -m "fix(map): address issues found during full verification pass"
```

(Skip this step if verification found nothing to fix.)
