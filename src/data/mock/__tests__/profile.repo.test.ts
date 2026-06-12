import { createStore } from '@/data/mock/store';
import { mockProfile } from '@/data/mock/profile.repo';

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

describe('mock profile repo', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('returns the staff documents', async () => {
    const repo = mockProfile(await createStore());
    const p = await repo.get();
    expect(p.documents.length).toBe(3);
    expect(p.documents[0].label).toBe('Driving licence');
  });
});
