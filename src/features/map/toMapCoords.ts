import type { Stop } from '@/data/domain';

export interface MapCoord {
  latitude: number;
  longitude: number;
}

export function toMapCoords(stops: Stop[]): MapCoord[] {
  return [...stops]
    .sort((a, b) => a.seq - b.seq)
    .map((s) => ({ latitude: s.lat, longitude: s.lng }));
}
