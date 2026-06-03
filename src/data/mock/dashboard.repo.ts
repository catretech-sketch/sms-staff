import type { DashboardRepository } from '@/data/repositories/types';
import type { Dashboard } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockDashboard(store: Store): DashboardRepository {
  return {
    async get(): Promise<Dashboard> {
      await simulateLatency();
      const role = store.session.user.roleKey;
      return {
        ...store.dashboardBase,
        roleCard: { ...store.roleCards[role] },
        pendingTasksPeek: store.tasksPeek.map((t) => ({ ...t })),
      };
    },
  };
}
