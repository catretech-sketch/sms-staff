import type { Staff } from './staff';
import type { Tenant } from './tenant';

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: Staff;
  tenant: Tenant;
}
