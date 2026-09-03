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
