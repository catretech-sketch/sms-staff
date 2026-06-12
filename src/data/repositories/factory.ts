import type { Repositories } from './types';
import type { Store } from '@/data/mock/store';
import type { HttpClient } from '@/lib/httpClient';
import { mockAuth } from '@/data/mock/auth.repo';
import { mockDashboard } from '@/data/mock/dashboard.repo';
import { mockAttendance } from '@/data/mock/attendance.repo';
import { mockTrip } from '@/data/mock/trip.repo';
import { mockTasks } from '@/data/mock/tasks.repo';
import { mockLeave } from '@/data/mock/leave.repo';
import { mockProfile } from '@/data/mock/profile.repo';
import { httpAuth } from '@/data/http/auth.repo';
import { httpDashboard } from '@/data/http/dashboard.repo';
import { httpAttendance } from '@/data/http/attendance.repo';
import { httpTrip } from '@/data/http/trip.repo';
import { httpTasks } from '@/data/http/tasks.repo';
import { httpLeave } from '@/data/http/leave.repo';
import { httpProfile } from '@/data/http/profile.repo';

export function createMockRepositories(store: Store): Repositories {
  return {
    auth: mockAuth(store),
    dashboard: mockDashboard(store),
    attendance: mockAttendance(store),
    trip: mockTrip(store),
    tasks: mockTasks(store),
    leave: mockLeave(store),
    profile: mockProfile(store),
  };
}

export function createHttpRepositories(http: HttpClient): Repositories {
  return {
    auth: httpAuth(http),
    dashboard: httpDashboard(http),
    attendance: httpAttendance(http),
    trip: httpTrip(http),
    tasks: httpTasks(http),
    leave: httpLeave(http),
    profile: httpProfile(http),
  };
}
