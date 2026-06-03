import type { DashboardRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toDashboard, type DashboardDTO } from './mappers';

export function httpDashboard(http: HttpClient): DashboardRepository {
  return {
    get: () => http.get<DashboardDTO>('/staff/dashboard').then(toDashboard),
  };
}
