import { createStore } from '@/data/mock/store';
import { mockLeave } from '@/data/mock/leave.repo';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

describe('mock leave repo', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('returns balances and appends a submitted request as pending', async () => {
    const repo = mockLeave(await createStore());
    const before = await repo.summary();
    expect(before.balances.length).toBe(3);
    const req = await repo.submit({ type: 'sick', fromDate: '2026-06-20', toDate: '2026-06-20', reason: 'Fever' });
    expect(req.status).toBe('pending');
    const after = await repo.summary();
    expect(after.requests.length).toBe(before.requests.length + 1);
  });
});
