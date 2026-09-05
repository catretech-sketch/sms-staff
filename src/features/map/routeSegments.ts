import type { Stop } from '@/data/domain';
import { distanceMeters } from '@/lib/geo';

export interface RouteSegment {
  midpoint: { latitude: number; longitude: number };
  distanceKm: number;
  durationMin?: number;
}

export function routeSegments(stops: Stop[]): RouteSegment[] {
  const sorted = [...stops].sort((a, b) => a.seq - b.seq);
  if (sorted.length < 2) return [];

  const segments: RouteSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const distanceKm = distanceMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }) / 1000;
    const durationMin =
      a.etaMin != null && b.etaMin != null && b.etaMin > a.etaMin ? b.etaMin - a.etaMin : undefined;
    segments.push({
      midpoint: { latitude: (a.lat + b.lat) / 2, longitude: (a.lng + b.lng) / 2 },
      distanceKm,
      durationMin,
    });
  }
  return segments;
}
