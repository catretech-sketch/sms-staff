import type { Stop } from '@/data/domain';
import { nearestStop } from './nearestStop';

export type StopRole = 'completed' | 'current' | 'next' | 'upcoming';

export interface StopWithRole {
  stop: Stop;
  role: StopRole;
  isDestination: boolean;
}

export function stopRoles(
  stops: Stop[],
  liveMarker: { latitude: number; longitude: number } | null
): StopWithRole[] {
  const sorted = [...stops].sort((a, b) => a.seq - b.seq);
  if (sorted.length === 0) return [];

  const destinationSeq = sorted[sorted.length - 1].seq;
  const current = nearestStop(stops, liveMarker);
  const currentSeq = current?.seq ?? sorted[0].seq - 1;

  return sorted.map((stop) => {
    let role: StopRole;
    if (stop.seq < currentSeq) role = 'completed';
    else if (stop.seq === currentSeq && current) role = 'current';
    else if (stop.seq === currentSeq + 1) role = 'next';
    else role = 'upcoming';
    return { stop, role, isDestination: stop.seq === destinationSeq };
  });
}
