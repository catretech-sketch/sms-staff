import type { AuthRepository } from '@/data/repositories/types';
import type { Session } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';
import { dutyPostByRole } from './seed';

const cloneSession = (s: Store['session']): Session => JSON.parse(JSON.stringify(s)) as Session;

export function mockAuth(store: Store): AuthRepository {
  return {
    async requestOtp(identifier) {
      await simulateLatency();
      if (!identifier) throw new AppError('invalid', 400, 'Mobile number or email required');
      return {
        channel: identifier.includes('@') ? 'email' : 'sms',
        destination: identifier,
      };
    },
    async verifyOtp(identifier, code, roleKey) {
      await simulateLatency();
      if (!identifier) throw new AppError('invalid', 400, 'Mobile number or email required');
      if (!/^\d{6}$/.test(code)) throw new AppError('invalid_code', 400, 'Enter the 6-digit code');
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
