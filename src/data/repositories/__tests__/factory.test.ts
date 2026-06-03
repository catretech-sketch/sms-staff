import { createMockRepositories, createHttpRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import type { HttpClient } from '@/lib/httpClient';

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

const noopHttp = {
  get: () => Promise.resolve(undefined),
  post: () => Promise.resolve(undefined),
  patch: () => Promise.resolve(undefined),
  delete: () => Promise.resolve(undefined),
} as unknown as HttpClient;

describe('repository factory', () => {
  it('mock bundle exposes auth/dashboard/attendance', async () => {
    const repos = createMockRepositories(await createStore());
    expect(typeof repos.auth.login).toBe('function');
    expect(typeof repos.dashboard.get).toBe('function');
    expect(typeof repos.attendance.checkIn).toBe('function');
  });
  it('http bundle exposes auth/dashboard/attendance', () => {
    const repos = createHttpRepositories(noopHttp);
    expect(typeof repos.auth.login).toBe('function');
    expect(typeof repos.dashboard.get).toBe('function');
    expect(typeof repos.attendance.checkIn).toBe('function');
  });
});
