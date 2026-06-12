import type { ProfileRepository } from '@/data/repositories/types';
import type { Profile } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockProfile(store: Store): ProfileRepository {
  return {
    async get(): Promise<Profile> {
      await simulateLatency();
      return JSON.parse(JSON.stringify(store.profile)) as Profile;
    },
  };
}
