import type { AuthRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';
import { dutyPostByRole } from './seed';

const cloneSession = (s: Store['session']) => ({
  ...s,
  user: { ...s.user },
  tenant: { ...s.tenant },
});

export function mockAuth(store: Store): AuthRepository {
  return {
    async login(phone, roleKey) {
      await simulateLatency();
      if (!phone) throw new AppError('invalid', 400, 'Phone number required');
      store.session.user.roleKey = roleKey;
      store.session.user.dutyPost = dutyPostByRole[roleKey];
      await store.persistRole();
      return cloneSession(store.session);
    },
    async refresh() {
      await simulateLatency();
      return cloneSession(store.session);
    },
    async me() {
      await simulateLatency();
      return { ...store.session.user };
    },
    async logout() {
      await simulateLatency();
    },
  };
}
