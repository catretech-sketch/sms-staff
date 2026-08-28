import { createStore } from '@/data/mock/store';
import { mockTrip } from '@/data/mock/trip.repo';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

describe('mock trip repository', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('returns the assigned route, bus number, and conductor', async () => {
    const repo = mockTrip(await createStore());
    const a = await repo.myAssignment();
    expect(a.route.name).toBe('Route 7');
    expect(a.busNo).toBe('HR-26-BX-4412');
    expect(a.conductorName).toBe('Sita Devi');
  });

  it('starts a trip, exposes it via current(), and ends it with a summary', async () => {
    const repo = mockTrip(await createStore());
    expect(await repo.current()).toBeNull();
    const trip = await repo.startTrip('route_7', 'pickup', 'HR-26-BX-4412');
    expect(trip.status).toBe('live');
    expect(trip.direction).toBe('pickup');
    const cur = await repo.current();
    expect(cur?.id).toBe(trip.id);
    const summary = await repo.endTrip(trip.id);
    expect(summary.tripId).toBe(trip.id);
    expect(summary.stopsCovered).toBe(6);
    expect(await repo.current()).toBeNull();
  });

  it('startTrip is idempotent while a trip is live (single active broadcaster)', async () => {
    const repo = mockTrip(await createStore());
    const t1 = await repo.startTrip('route_7', 'pickup', 'HR-26-BX-4412');
    const t2 = await repo.startTrip('route_7', 'drop', 'HR-26-BX-4412');
    expect(t2.id).toBe(t1.id);
  });

  it('tracks boarding state and counts boarded students in the summary', async () => {
    const repo = mockTrip(await createStore());
    const trip = await repo.startTrip('route_7', 'pickup', 'HR-26-BX-4412');
    await repo.setBoarding({ tripId: trip.id, studentId: 'stu_1', stopId: 'stop_2', state: 'boarded', at: '2026-06-12T08:00:00Z' });
    await repo.setBoarding({ tripId: trip.id, studentId: 'stu_2', stopId: 'stop_2', state: 'boarded', at: '2026-06-12T08:01:00Z' });
    await repo.setBoarding({ tripId: trip.id, studentId: 'stu_1', stopId: 'stop_2', state: 'dropped', at: '2026-06-12T08:30:00Z' });
    const state = await repo.boardingState(trip.id);
    expect(state.find((b) => b.studentId === 'stu_1')?.state).toBe('dropped');
    const summary = await repo.endTrip(trip.id);
    expect(summary.boardedCount).toBe(1); // only stu_2 still 'boarded'
  });

  it('roster returns the seeded students', async () => {
    const repo = mockTrip(await createStore());
    const trip = await repo.startTrip('route_7', 'pickup', 'HR-26-BX-4412');
    const roster = await repo.roster(trip.id);
    expect(roster.length).toBe(6);
    expect(roster[0].name).toBe('Aarav Sharma');
  });
});
