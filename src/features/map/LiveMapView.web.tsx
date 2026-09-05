import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from '@teovilla/react-native-web-maps';
import { useTheme } from '@/theme';
import { toMapCoords } from './toMapCoords';
import { BusMarker } from './BusMarker';
import { StopMarker } from './StopMarker';
import { RouteSegmentLabel } from './RouteSegmentLabel';
import { stopRoles } from './stopRoles';
import { routeSegments } from './routeSegments';
import type { LiveMapViewProps, LiveMapHandle } from './liveMapTypes';

export type { LiveMapViewProps, LiveMapHandle };

export const LiveMapView = forwardRef<LiveMapHandle, LiveMapViewProps>(({ stops, liveMarker, onMapReady }, ref) => {
  const { colors } = useTheme();
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const coords = toMapCoords(stops);
  const initial = coords[0] ?? { latitude: 0, longitude: 0 };
  const roles = stopRoles(stops, liveMarker ?? null);
  const segments = routeSegments(stops);

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
      ref={ref as never}
      provider="google"
      style={styles.map}
      googleMapsApiKey={apiKey}
      onMapReady={onMapReady}
      initialRegion={{ ...initial, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
    >
      <Polyline testID="map-polyline" coordinates={coords} strokeWidth={6} strokeColor={colors.primary} />
      {segments.map((seg, i) => (
        <Marker key={`seg-${i}`} testID={`map-segment-${i}`} coordinate={seg.midpoint}>
          <RouteSegmentLabel distanceKm={seg.distanceKm} durationMin={seg.durationMin} />
        </Marker>
      ))}
      {roles.map(({ stop, role, isDestination }) => (
        <Marker key={stop.id} testID={`map-stop-${stop.id}`} coordinate={{ latitude: stop.lat, longitude: stop.lng }} title={stop.name}>
          <StopMarker role={role} isDestination={isDestination} />
        </Marker>
      ))}
      {liveMarker && (
        <Marker testID="map-live-marker" coordinate={liveMarker}>
          <BusMarker headingDeg={liveMarker.headingDeg} />
        </Marker>
      )}
    </MapView>
  );
});
LiveMapView.displayName = 'LiveMapView';

const styles = StyleSheet.create({
  map: { flex: 1 },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackText: { fontSize: 14, color: '#666' },
});
