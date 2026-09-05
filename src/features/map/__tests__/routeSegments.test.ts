import { routeSegments } from '@/features/map/routeSegments';
import type { Stop } from '@/data/domain';

const stops: Stop[] = [
  { id: 's1', name: 'School Gate', lat: 28.4595, lng: 77.0266, seq: 0 },
  { id: 's2', name: 'Sector 12', lat: 28.466, lng: 77.041, seq: 1, etaMin: 6 },
  { id: 's3', name: 'Sector 15 Market', lat: 28.4712, lng: 77.0525, seq: 2, etaMin: 12 },
];

describe('routeSegments', () => {
  it('returns one segment per pair of consecutive stops', () => {
    expect(routeSegments(stops)).toHaveLength(2);
  });

  it('returns an empty array when there are fewer than 2 stops', () => {
    expect(routeSegments([stops[0]])).toEqual([]);
    expect(routeSegments([])).toEqual([]);
  });

  it('computes the midpoint and distance for each segment', () => {
    const [first] = routeSegments(stops);
    expect(first.midpoint.latitude).toBeCloseTo((28.4595 + 28.466) / 2, 5);
    expect(first.midpoint.longitude).toBeCloseTo((77.0266 + 77.041) / 2, 5);
    expect(first.distanceKm).toBeGreaterThan(0);
  });

  it('omits duration when the leading stop has no etaMin', () => {
    const [first] = routeSegments(stops);
    expect(first.durationMin).toBeUndefined();
  });

  it('derives duration from the difference between consecutive etaMin values', () => {
    const [, second] = routeSegments(stops);
    expect(second.durationMin).toBe(6);
  });
});
