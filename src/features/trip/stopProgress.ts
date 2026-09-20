import type { Stop, StudentLite, Boarding } from '@/data/domain';

export interface StopPickupCounts {
  assignedCount: number;
  pickedUpCount: number;
  remainingCount: number;
}

const RESOLVED_STATES = ['boarded', 'dropped', 'absent'] as const;

function isStopResolved(stop: Stop, roster: StudentLite[], boarding: Boarding[]): boolean {
  const assigned = roster.filter((s) => s.stopId === stop.id);
  if (assigned.length === 0) return true;
  return assigned.every((s) => {
    const state = boarding.find((b) => b.studentId === s.id)?.state;
    return state != null && (RESOLVED_STATES as readonly string[]).includes(state);
  });
}

/** The first stop (in seq order) that still has an unresolved assigned student, or null once every stop is resolved. */
export function findActiveStop(stops: Stop[], roster: StudentLite[], boarding: Boarding[]): Stop | null {
  const sorted = [...stops].sort((a, b) => a.seq - b.seq);
  return sorted.find((stop) => !isStopResolved(stop, roster, boarding)) ?? null;
}

export function countPickup(activeStop: Stop | null, roster: StudentLite[], boarding: Boarding[]): StopPickupCounts {
  if (!activeStop) return { assignedCount: 0, pickedUpCount: 0, remainingCount: 0 };
  const assigned = roster.filter((s) => s.stopId === activeStop.id);
  const pickedUp = assigned.filter((s) => boarding.find((b) => b.studentId === s.id)?.state === 'boarded');
  return { assignedCount: assigned.length, pickedUpCount: pickedUp.length, remainingCount: assigned.length - pickedUp.length };
}
