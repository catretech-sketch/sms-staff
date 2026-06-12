import type { Session, Staff, Tenant, Dashboard, RoleCard, Attendance, AttendanceLog, TaskPeek,
  Route, Stop, Trip, TripSummary, StudentLite, Boarding, TripAssignment,
  TripDirection, TripStatus, BoardingState,
} from '@/data/domain';
import type { Role } from '@/theme/roles';

export interface StaffDTO {
  id: string;
  name: string;
  first_name: string;
  role_key: Role;
  emp_id: string;
  joined: string;
  rating: number;
  duty_post: string;
  shift: string;
  timing: string;
  phone: string;
}
export interface TenantDTO {
  id: string;
  name: string;
  logo_url?: string;
}
export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  user: StaffDTO;
  tenant: TenantDTO;
}
export interface DashboardDTO {
  hours_this_week: number;
  hours_target: number;
  streak_days: number;
  leave_left: number;
  role_card: RoleCard;
  pending_tasks_peek: TaskPeek[];
  alert?: string;
}
export interface AttendanceDTO {
  checked_in: boolean;
  check_in_at?: string;
  last_log: AttendanceLog[];
  duty_post: string;
  geofence_radius_m: number;
}

export function toStaff(d: StaffDTO): Staff {
  return {
    id: d.id,
    name: d.name,
    firstName: d.first_name,
    roleKey: d.role_key,
    empId: d.emp_id,
    joined: d.joined,
    rating: d.rating,
    dutyPost: d.duty_post,
    shift: d.shift,
    timing: d.timing,
    phone: d.phone,
  };
}

export function toTenant(d: TenantDTO): Tenant {
  const t: Tenant = { id: d.id, name: d.name };
  if (d.logo_url !== undefined) t.logoUrl = d.logo_url;
  return t;
}

export function toSession(d: SessionDTO): Session {
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    user: toStaff(d.user),
    tenant: toTenant(d.tenant),
  };
}

export function toDashboard(d: DashboardDTO): Dashboard {
  return {
    hoursThisWeek: d.hours_this_week,
    hoursTarget: d.hours_target,
    streakDays: d.streak_days,
    leaveLeft: d.leave_left,
    roleCard: d.role_card,
    pendingTasksPeek: d.pending_tasks_peek,
    alert: d.alert,
  };
}

export function toAttendance(d: AttendanceDTO): Attendance {
  const a: Attendance = {
    checkedIn: d.checked_in,
    lastLog: d.last_log,
    dutyPost: d.duty_post,
    geofenceRadiusM: d.geofence_radius_m,
  };
  if (d.check_in_at !== undefined) a.checkInAt = d.check_in_at;
  return a;
}

export interface StopDTO { id: string; name: string; lat: number; lng: number; seq: number; eta_min?: number; }
export interface RouteDTO { id: string; name: string; assigned_bus_no: string; stops: StopDTO[]; }
export interface TripDTO {
  id: string; route_id: string; bus_no: string; driver_id: string; conductor_id?: string;
  direction: TripDirection; status: TripStatus; started_at?: string; ended_at?: string; broadcaster_id?: string;
}
export interface TripSummaryDTO { trip_id: string; duration_min: number; distance_km: number; stops_covered: number; boarded_count: number; }
export interface StudentLiteDTO { id: string; name: string; stop_id: string; photo_url?: string; }
export interface BoardingDTO { trip_id: string; student_id: string; stop_id: string; state: BoardingState; at: string; }
export interface TripAssignmentDTO { route: RouteDTO; bus_no: string; conductor_name?: string | null; }

export const toStop = (d: StopDTO): Stop => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng, seq: d.seq, etaMin: d.eta_min });
export const toRoute = (d: RouteDTO): Route => ({ id: d.id, name: d.name, assignedBusNo: d.assigned_bus_no, stops: d.stops.map(toStop) });
export const toTrip = (d: TripDTO): Trip => ({
  id: d.id, routeId: d.route_id, busNo: d.bus_no, driverId: d.driver_id, conductorId: d.conductor_id,
  direction: d.direction, status: d.status, startedAt: d.started_at, endedAt: d.ended_at, broadcasterId: d.broadcaster_id,
});
export const toTripSummary = (d: TripSummaryDTO): TripSummary => ({
  tripId: d.trip_id, durationMin: d.duration_min, distanceKm: d.distance_km, stopsCovered: d.stops_covered, boardedCount: d.boarded_count,
});
export const toStudentLite = (d: StudentLiteDTO): StudentLite => ({ id: d.id, name: d.name, stopId: d.stop_id, photoUrl: d.photo_url });
export const toBoarding = (d: BoardingDTO): Boarding => ({ tripId: d.trip_id, studentId: d.student_id, stopId: d.stop_id, state: d.state, at: d.at });
export const toTripAssignment = (d: TripAssignmentDTO): TripAssignment => ({ route: toRoute(d.route), busNo: d.bus_no, conductorName: d.conductor_name ?? null });
