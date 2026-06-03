import type { AuthSnapshot } from './httpClient';

let current: AuthSnapshot = { accessToken: null, tenantId: null };

export const authSnapshot = {
  get(): AuthSnapshot {
    return current;
  },
  set(next: AuthSnapshot): void {
    current = next;
  },
  clear(): void {
    current = { accessToken: null, tenantId: null };
  },
};
