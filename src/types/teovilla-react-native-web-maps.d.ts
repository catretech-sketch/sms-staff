// Ambient module declaration for `@teovilla/react-native-web-maps`.
//
// The package's `package.json` "types" field points at
// `dist/typescript/index.d.ts`, which only re-exports the marker-clusterer
// helpers. The real web entry point types (default-exported `MapView`,
// `Marker`, `Polyline`, etc.) live in a sibling file,
// `dist/typescript/index.web.d.ts`, which plain TypeScript module
// resolution (moduleResolution: "bundler", no "exports" map in the
// package) never reaches for a bare `import ... from
// '@teovilla/react-native-web-maps'`. This is a types-only mismatch --
// Metro/Jest resolve the actual `.web.js` runtime module correctly.
//
// This declaration mirrors `index.web.d.ts` so `LiveMapView.web.tsx` type
// checks against the real web component shapes.
// The package also ships its own module augmentation
// (`src/override-types.ts` / `dist/typescript/override-types.d.ts`) that
// adds these web-only props to `react-native-maps`' `MapViewProps`, meant
// to be pulled in via a triple-slash reference in the consuming app's
// `app.d.ts`. We replicate it here instead so it's picked up automatically
// by `tsconfig`'s `include` without requiring a manual reference.
export {}; // Makes this file a module, so the `declare module` blocks below
// augment the named modules instead of replacing them wholesale.

declare module 'react-native-maps' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface MapViewProps {
    googleMapsApiKey?: string;
    googleMapsMapId?: string;
    loadingFallback?: JSX.Element;
    options?: google.maps.MapOptions;
  }
}

declare module '@teovilla/react-native-web-maps' {
  import type React from 'react';
  import type RNMapView from 'react-native-maps';
  import type { MapViewProps, MapPolylineProps, Marker as RNMarker } from 'react-native-maps';

  const MapView: React.MemoExoticComponent<
    React.ForwardRefExoticComponent<MapViewProps & React.RefAttributes<Partial<RNMapView>>>
  >;

  export const Marker: typeof RNMarker;
  export function Polyline(props: MapPolylineProps): JSX.Element;

  export default MapView;
}
