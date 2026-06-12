import type {
  Session, Staff, Dashboard, Attendance,
  TripAssignment, Trip, TripPing, TripSummary, StudentLite, Boarding, TripDirection,
  Task,
} from '@/data/domain';
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

export interface TripRepository {
  myAssignment(): Promise<TripAssignment>;
  current(): Promise<Trip | null>;
  startTrip(routeId: string, direction: TripDirection): Promise<Trip>;
  publishPing(ping: TripPing): Promise<void>;
  endTrip(tripId: string): Promise<TripSummary>;
  roster(tripId: string): Promise<StudentLite[]>;
  setBoarding(b: Boarding): Promise<void>;
  boardingState(tripId: string): Promise<Boarding[]>;
}

export interface TasksRepository {
  list(): Promise<Task[]>;
  complete(id: string): Promise<Task[]>;
}

export interface Repositories {
  auth: AuthRepository;
  dashboard: DashboardRepository;
  attendance: AttendanceRepository;
  trip: TripRepository;
  tasks: TasksRepository;
}
