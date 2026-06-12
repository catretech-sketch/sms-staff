import type { LeaveRepository } from '@/data/repositories/types';
import type { LeaveSummary, LeaveRequest, NewLeaveRequest } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function mockLeave(store: Store): LeaveRepository {
  return {
    async summary(): Promise<LeaveSummary> {
      await simulateLatency();
      return clone(store.leave);
    },
    async submit(req: NewLeaveRequest): Promise<LeaveRequest> {
      await simulateLatency();
      const created: LeaveRequest = { id: store.genId('lv'), status: 'pending', ...req };
      store.leave.requests = [created, ...store.leave.requests];
      await store.persistLeave();
      return clone(created);
    },
  };
}
