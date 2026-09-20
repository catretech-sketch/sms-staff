import { findActiveStop, countPickup } from '../stopProgress';
import type { Stop, StudentLite, Boarding } from '@/data/domain';

const stops: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.10, lng: 77.10, seq: 1 },
  { id: 's2', name: 'Market', lat: 12.20, lng: 77.20, seq: 2 },
  { id: 's3', name: 'School', lat: 12.30, lng: 77.30, seq: 3 },
];

const roster: StudentLite[] = [
  { id: 'st1', name: 'A', stopId: 's1' },
  { id: 'st2', name: 'B', stopId: 's2' },
  { id: 'st3', name: 'C', stopId: 's2' },
];

describe('findActiveStop', () => {
  it('returns the first stop in seq order when no one has been picked up', () => {
    expect(findActiveStop(stops, roster, [])?.id).toBe('s1');
  });

  it('skips a stop once all its assigned students are boarded or dropped', () => {
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    expect(findActiveStop(stops, roster, boarding)?.id).toBe('s2');
  });

  it('treats a stop with zero assigned students as trivially resolved', () => {
    // s3 (School) has no roster entries at all, and s1/s2 are fully resolved,
    // so the route should be complete (no stop left needing attention).
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
      { tripId: 't1', studentId: 'st2', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
      { tripId: 't1', studentId: 'st3', stopId: 's2', state: 'dropped', at: '2026-09-20T00:00:00Z' },
    ];
    expect(findActiveStop(stops, roster, boarding)).toBeNull();
  });

  it('returns null (route complete) when every stop is resolved', () => {
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
      { tripId: 't1', studentId: 'st2', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
      { tripId: 't1', studentId: 'st3', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    expect(findActiveStop(stops, roster, boarding)).toBeNull();
  });

  it('returns null for an empty stop list', () => {
    expect(findActiveStop([], [], [])).toBeNull();
  });
});

describe('countPickup', () => {
  it('counts assigned, picked up, and remaining students at the active stop', () => {
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st2', stopId: 's2', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    const counts = countPickup(stops[1], roster, boarding);
    expect(counts).toEqual({ assignedCount: 2, pickedUpCount: 1, remainingCount: 1 });
  });

  it('returns all zeros when there is no active stop', () => {
    expect(countPickup(null, roster, [])).toEqual({ assignedCount: 0, pickedUpCount: 0, remainingCount: 0 });
  });
});
