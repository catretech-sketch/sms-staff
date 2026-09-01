import type { AuthRepository } from '@/data/repositories/types';
import type { Session } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import { authSnapshot } from '@/lib/authSnapshot';
import { toSession, type SessionDTO } from './mappers';
import {
  tokenSchema, meSchema, toStaffFromMe, toTenantFromMe, maskIdentifier, buildLoginRequest,
} from './auth.schema';

export function httpAuth(http: HttpClient): AuthRepository {
  return {
    requestOtp: async (identifier) => {
      await http.post('/auth/otp/request', { identifier });
      return {
        channel: identifier.includes('@') ? 'email' : 'sms',
        destination: maskIdentifier(identifier),
      };
    },
    verifyOtp: async (identifier, code, roleKey): Promise<Session> => {
      const t = tokenSchema.parse(await http.post('/auth/otp/verify', { identifier, code }));
      authSnapshot.set({ accessToken: t.access_token, tenantId: null });
      const me = meSchema.parse(await http.get('/auth/me'));
      authSnapshot.set({ accessToken: t.access_token, tenantId: me.tenant_id });
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        user: toStaffFromMe(me, roleKey),
        tenant: toTenantFromMe(me),
      };
    },
    login: async (identifier, password, roleKey): Promise<Session> => {
      const t = tokenSchema.parse(await http.post('/auth/login', buildLoginRequest(identifier, password, roleKey)));
      // Same ordering requirement as verifyOtp: /auth/me is [Authorize].
      authSnapshot.set({ accessToken: t.access_token, tenantId: null });
      const me = meSchema.parse(await http.get('/auth/me'));
      authSnapshot.set({ accessToken: t.access_token, tenantId: me.tenant_id });
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        user: toStaffFromMe(me, roleKey),
        tenant: toTenantFromMe(me),
      };
    },
    setPassword: async (password) => {
      await http.post('/auth/set-password', { password });
    },
    refresh: (refreshToken) =>
      http.post<SessionDTO>('/auth/refresh', { refresh_token: refreshToken }).then(toSession),
    me: async (previous) => {
      const me = meSchema.parse(await http.get('/auth/me'));
      return toStaffFromMe(me, previous?.roleKey ?? 'driver', previous);
    },
    logout: () => http.post<void>('/auth/logout'),
  };
}
