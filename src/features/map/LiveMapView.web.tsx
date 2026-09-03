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
