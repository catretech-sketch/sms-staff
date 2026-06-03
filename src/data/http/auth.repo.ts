import type { AuthRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toSession, toStaff, type SessionDTO, type StaffDTO } from './mappers';

export function httpAuth(http: HttpClient): AuthRepository {
  return {
    login: (phone, roleKey) =>
      http.post<SessionDTO>('/staff/auth/login', { phone, role_key: roleKey }).then(toSession),
    refresh: (refreshToken) =>
      http.post<SessionDTO>('/staff/auth/refresh', { refresh_token: refreshToken }).then(toSession),
    me: () => http.get<StaffDTO>('/staff/auth/me').then(toStaff),
    logout: () => http.post<void>('/staff/auth/logout'),
  };
}
