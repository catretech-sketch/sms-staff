import { createStore } from '@/data/mock/store';

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

describe('createStore', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('hydrates a session and attendance from seed', async () => {
    const store = await createStore();
    expect(store.session.user.name).toBe('Ramesh Kumar');
    expect(store.session.tenant.name).toBe('Greenfield Public School');
    expect(store.attendance.checkedIn).toBe(false);
  });

  it('persistRole writes the current role; a new store rehydrates it', async () => {
    const store = await createStore();
    store.session.user.roleKey = 'cook';
    await store.persistRole();
    const store2 = await createStore();
    expect(store2.session.user.roleKey).toBe('cook');
  });

  it('persistAttendance survives a reload', async () => {
    const store = await createStore();
    store.attendance = { ...store.attendance, checkedIn: true, checkInAt: '2026-06-03T08:00:00Z' };
    await store.persistAttendance();
    const store2 = await createStore();
    expect(store2.attendance.checkedIn).toBe(true);
    expect(store2.attendance.checkInAt).toBe('2026-06-03T08:00:00Z');
  });

  it('genId produces unique prefixed ids', () => {
    return createStore().then((store) => {
      const a = store.genId('x');
      const b = store.genId('x');
      expect(a.startsWith('x_')).toBe(true);
      expect(a).not.toBe(b);
    });
  });

  it('mutating the store does not mutate the shared seed', async () => {
    const store = await createStore();
    store.session.user.name = 'Changed';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { seed } = require('@/data/mock/seed') as typeof import('@/data/mock/seed');
    expect(seed.staff.name).toBe('Ramesh Kumar');
  });
});
