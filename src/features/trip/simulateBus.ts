import type { Route } from '@/data/domain';

export interface SimPosition {
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  segmentIndex: number;
}

// Linearly interpolate the bus along the route's stops over [0, totalMs].
// Pure + deterministic — used for the mock/demo when no device GPS is available.
export function simulateBusPosition(route: Route, elapsedMs: number, totalMs: number): SimPosition {
  const stops = route.stops;
  if (stops.length === 0) return { lat: 0, lng: 0, heading: 0, speedKmh: 0, segmentIndex: 0 };
  if (stops.length === 1) return { lat: stops[0].lat, lng: stops[0].lng, heading: 0, speedKmh: 0, segmentIndex: 0 };

  const clamped = Math.max(0, Math.min(1, totalMs > 0 ? elapsedMs / totalMs : 0));
  const segCount = stops.length - 1;
  const pos = clamped * segCount;
  const i = Math.min(segCount - 1, Math.floor(pos));
  const f = pos - i;
  const a = stops[i];
  const b = stops[i + 1];
  const lat = a.lat + (b.lat - a.lat) * f;
  const lng = a.lng + (b.lng - a.lng) * f;
  const heading = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
  const speedKmh = clamped >= 1 ? 0 : 28;
  return { lat, lng, heading, speedKmh, segmentIndex: i };
}
