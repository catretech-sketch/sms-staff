import { renderHook, act } from '@testing-library/react-native';
import { useStopProgress } from '../useStopProgress';
import type { Stop, StudentLite, Boarding } from '@/data/domain';

const stops: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.10, lng: 77.10, seq: 1 },
  { id: 's2', name: 'Market', lat: 12.20, lng: 77.20, seq: 2 },
];
const roster: StudentLite[] = [
  { id: 'st1', name: 'A', stopId: 's1' },
  { id: 'st2', name: 'B', stopId: 's2' },
];

describe('useStopProgress', () => {
  it('is EN_ROUTE when far from the active stop', () => {
    const far = { latitude: 12.50, longitude: 77.50 };
    const { result } = renderHook(() => useStopProgress(stops, roster, [], far));
    expect(result.current.state).toBe('EN_ROUTE');
    expect(result.current.activeStop?.id).toBe('s1');
  });

  it('is PICKUP_IN_PROGRESS when within 50m of the active stop', () => {
    // ~5m north of s1 (12.10, 77.10) — well within the 50m radius.
    const near = { latitude: 12.10004, longitude: 77.10 };
    const { result } = renderHook(() => useStopProgress(stops, roster, [], near));
    expect(result.current.state).toBe('PICKUP_IN_PROGRESS');
  });

  it('is ROUTE_COMPLETED when there is no active stop', () => {
    const boarding: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    const { result } = renderHook(() => useStopProgress([stops[0]], roster, boarding, null));
    expect(result.current.state).toBe('ROUTE_COMPLETED');
    expect(result.current.activeStop).toBeNull();
  });

  it('markArrivedManually forces PICKUP_IN_PROGRESS even when far away', () => {
    const far = { latitude: 12.50, longitude: 77.50 };
    const { result } = renderHook(() => useStopProgress(stops, roster, [], far));
    expect(result.current.state).toBe('EN_ROUTE');
    act(() => result.current.markArrivedManually());
    expect(result.current.state).toBe('PICKUP_IN_PROGRESS');
  });

  it('resets the manual override once the active stop changes', () => {
    const far = { latitude: 12.50, longitude: 77.50 };
    const boardingBoth: Boarding[] = [
      { tripId: 't1', studentId: 'st1', stopId: 's1', state: 'boarded', at: '2026-09-20T00:00:00Z' },
    ];
    const { result, rerender } = renderHook(
      ({ boarding }: { boarding: Boarding[] }) => useStopProgress(stops, roster, boarding, far),
      { initialProps: { boarding: [] as Boarding[] } },
    );
    act(() => result.current.markArrivedManually());
    expect(result.current.state).toBe('PICKUP_IN_PROGRESS');

    // s1 becomes resolved -> active stop advances to s2 -> override should not carry over.
    rerender({ boarding: boardingBoth });
    expect(result.current.activeStop?.id).toBe('s2');
    expect(result.current.state).toBe('EN_ROUTE');
  });
});
