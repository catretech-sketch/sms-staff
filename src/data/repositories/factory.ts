import type { Repositories } from './types';
import type { Store } from '@/data/mock/store';
import type { HttpClient } from '@/lib/httpClient';
import { mockAuth } from '@/data/mock/auth.repo';
import { mockDashboard } from '@/data/mock/dashboard.repo';
import { mockAttendance } from '@/data/mock/attendance.repo';
import { mockTrip } from '@/data/mock/trip.repo';
import { httpAuth } from '@/data/http/auth.repo';
import { httpDashboard } from '@/data/http/dashboard.repo';
import { httpAttendance } from '@/data/http/attendance.repo';
import { httpTrip } from '@/data/http/trip.repo';

export function createMockRepositories(store: Store): Repositories {
  return {
    auth: mockAuth(store),
    dashboard: mockDashboard(store),
    attendance: mockAttendance(store),
    trip: mockTrip(store),
  };
}

export function createHttpRepositories(http: HttpClient): Repositories {
  return {
    auth: httpAuth(http),
    dashboard: httpDashboard(http),
    attendance: httpAttendance(http),
    trip: httpTrip(http),
  };
}
