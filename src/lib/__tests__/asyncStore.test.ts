import { asyncStore } from '@/lib/asyncStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => {
        mem[k] = v;
        return Promise.resolve();
      }),
      removeItem: jest.fn((k: string) => {
        delete mem[k];
        return Promise.resolve();
      }),
    },
  };
});

describe('asyncStore', () => {
  it('returns null for a missing key', async () => {
    expect(await asyncStore.get('missing')).toBeNull();
  });
  it('round-trips a JSON value', async () => {
    await asyncStore.set('k', { a: 1 });
    expect(await asyncStore.get<{ a: number }>('k')).toEqual({ a: 1 });
  });
  it('removes a value', async () => {
    await asyncStore.set('k2', 5);
    await asyncStore.remove('k2');
    expect(await asyncStore.get('k2')).toBeNull();
  });
});
