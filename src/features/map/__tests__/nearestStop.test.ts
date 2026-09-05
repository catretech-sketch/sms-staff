import { nearestStop } from '@/features/map/nearestStop';
import type { Stop } from '@/data/domain';

const stops: Stop[] = [
  { id: 'a', name: 'Stop A', lat: 12.1, lng: 77.1, seq: 1 },
  { id: 'b', name: 'Stop B', lat: 12.2, lng: 77.2, seq: 2 },
  { id: 'c', name: 'Stop C', lat: 12.3, lng: 77.3, seq: 3 },
];

describe('nearestStop', () => {
  it('returns the stop closest to the live marker', () => {
    const result = nearestStop(stops, { latitude: 12.199, longitude: 77.199 });
    expect(result?.id).toBe('b');
  });

  it('returns null when there is no live marker', () => {
    expect(nearestStop(stops, null)).toBeNull();
  });

  it('returns null when there are no stops', () => {
    expect(nearestStop([], { latitude: 12.1, longitude: 77.1 })).toBeNull();
  });
});
