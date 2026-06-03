import type { Session, Staff, Dashboard, Attendance } from '@/data/domain';
import type { Role } from '@/theme/roles';

export interface AuthRepository {
  login(phone: string, roleKey: Role): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  me(): Promise<Staff>;
  logout(): Promise<void>;
}

export interface DashboardRepository {
  get(): Promise<Dashboard>;
}

export interface AttendanceRepository {
  status(): Promise<Attendance>;
  checkIn(at: string, inZone: boolean): Promise<Attendance>;
  checkOut(at: string): Promise<Attendance>;
}

export interface Repositories {
  auth: AuthRepository;
  dashboard: DashboardRepository;
  attendance: AttendanceRepository;
}
