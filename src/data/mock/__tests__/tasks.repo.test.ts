import { createStore } from '@/data/mock/store';
import { mockTasks } from '@/data/mock/tasks.repo';

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

describe('mock tasks repo', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('lists seeded tasks', async () => {
    const repo = mockTasks(await createStore());
    const list = await repo.list();
    expect(list.length).toBe(3);
  });

  it('complete marks a task done and returns the updated list', async () => {
    const repo = mockTasks(await createStore());
    const list = await repo.complete('task_1');
    expect(list.find((t) => t.id === 'task_1')?.done).toBe(true);
  });
});
