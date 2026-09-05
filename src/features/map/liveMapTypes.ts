import type { Stop } from '@/data/domain';

export interface LiveMarker {
  latitude: number;
  longitude: number;
  headingDeg?: number;
}

export interface LiveMapViewProps {
  stops: Stop[];
  liveMarker?: LiveMarker | null;
  onMapReady?: () => void;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapEdgePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LiveMapHandle {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  fitToCoordinates: (
    coordinates: { latitude: number; longitude: number }[],
    options?: { edgePadding?: MapEdgePadding; animated?: boolean }
  ) => void;
}
