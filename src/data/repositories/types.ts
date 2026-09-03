import type {
  Session, Staff, Dashboard, Attendance, SchoolLocation,
  TripAssignment, Trip, TripPing, TripSummary, StudentLite, Boarding, TripDirection,
  Task,
  LeaveSummary, LeaveRequest, NewLeaveRequest,
  Profile,
} from '@/data/domain';
import type { Role } from '@/theme/roles';

export interface OtpChallenge {
  channel: 'sms' | 'email';
  destination: string;
}

export interface AuthRepository {
  requestOtp(identifier: string): Promise<OtpChallenge>;
  verifyOtp(identifier: string, code: string, roleKey: Role): Promise<Session>;
  login(identifier: string, password: string, roleKey: Role): Promise<Session>;
  setPassword(password: string): Promise<void>;
  refresh(refreshToken: string): Promise<Session>;
  me(previous?: Staff): Promise<Staff>;
  logout(): Promise<void>;
}

export interface DashboardRepository {
  get(): Promise<Dashboard>;
}

export interface AttendanceRepository {
  status(): Promise<Attendance>;
  schoolLocation(): Promise<SchoolLocation>;
  checkIn(at: string, lat: number, lng: number, accuracyMeters: number): Promise<Attendance>;
  checkOut(at: string, lat: number, lng: number, accuracyMeters: number): Promise<Attendance>;
}

export interface TripRepository {
  myAssignment(): Promise<TripAssignment>;
  current(): Promise<Trip | null>;
  startTrip(routeId: string, direction: TripDirection, busNo: string): Promise<Trip>;
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

export interface LeaveRepository {
  summary(): Promise<LeaveSummary>;
  submit(req: NewLeaveRequest): Promise<LeaveRequest>;
}

export interface ProfileRepository { get(): Promise<Profile>; }

export interface Repositories {
  auth: AuthRepository;
  dashboard: DashboardRepository;
  attendance: AttendanceRepository;
  trip: TripRepository;
  tasks: TasksRepository;
  leave: LeaveRepository;
  profile: ProfileRepository;
}
