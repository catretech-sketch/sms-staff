import type { Stop } from '@/data/domain';
import { distanceMeters } from '@/lib/geo';

export function nearestStop(
  stops: Stop[],
  liveMarker: { latitude: number; longitude: number } | null
): Stop | null {
  if (!liveMarker || stops.length === 0) return null;
  const from = { lat: liveMarker.latitude, lng: liveMarker.longitude };
  return stops.reduce((closest, s) =>
    distanceMeters(from, { lat: s.lat, lng: s.lng }) < distanceMeters(from, { lat: closest.lat, lng: closest.lng })
      ? s
      : closest
  , stops[0]);
}
