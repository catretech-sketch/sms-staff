import type { TasksRepository } from '@/data/repositories/types';
import type { Task } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function mockTasks(store: Store): TasksRepository {
  return {
    async list(): Promise<Task[]> {
      await simulateLatency();
      return clone(store.tasks);
    },
    async complete(id: string): Promise<Task[]> {
      await simulateLatency();
      const task = store.tasks.find((t) => t.id === id);
      if (task) task.done = true;
      return clone(store.tasks);
    },
  };
}
