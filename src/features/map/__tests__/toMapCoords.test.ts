import { toMapCoords } from '@/features/map/toMapCoords';
import type { Stop } from '@/data/domain';

describe('toMapCoords', () => {
  it('returns coordinates sorted by seq, regardless of input order', () => {
    const stops: Stop[] = [
      { id: 'b', name: 'Stop B', lat: 12.2, lng: 77.2, seq: 2 },
      { id: 'a', name: 'Stop A', lat: 12.1, lng: 77.1, seq: 1 },
      { id: 'c', name: 'Stop C', lat: 12.3, lng: 77.3, seq: 3 },
    ];
    expect(toMapCoords(stops)).toEqual([
      { latitude: 12.1, longitude: 77.1 },
      { latitude: 12.2, longitude: 77.2 },
      { latitude: 12.3, longitude: 77.3 },
    ]);
  });

  it('returns an empty array for no stops', () => {
    expect(toMapCoords([])).toEqual([]);
  });
});
