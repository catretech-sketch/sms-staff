import type { HttpClient } from '@/lib/httpClient';
import type { RouteGeometry } from '@/data/domain';

interface RouteGeometryWireDTO {
  route_id: string;
  status: 'available' | 'unavailable';
  format: string | null;
  geometry: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  stop_sequence_hash: string;
  generated_at: string | null;
}

const toRouteGeometry = (d: RouteGeometryWireDTO): RouteGeometry => ({
  routeId: d.route_id,
  status: d.status,
  format: d.format,
  geometry: d.geometry,
  distanceMeters: d.distance_meters,
  durationSeconds: d.duration_seconds,
  stopSequenceHash: d.stop_sequence_hash,
  generatedAt: d.generated_at,
});

export function httpRouteGeometry(http: HttpClient) {
  return {
    get: (routeId: string): Promise<RouteGeometry> =>
      http.get<RouteGeometryWireDTO>(`/transport/routes/${routeId}/geometry`).then(toRouteGeometry),
  };
}
