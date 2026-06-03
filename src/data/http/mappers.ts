import type { Session, Staff, Tenant, Dashboard, RoleCard, Attendance, AttendanceLog, TaskPeek } from '@/data/domain';
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
  return { id: d.id, name: d.name, logoUrl: d.logo_url };
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
  return {
    checkedIn: d.checked_in,
    checkInAt: d.check_in_at,
    lastLog: d.last_log,
    dutyPost: d.duty_post,
    geofenceRadiusM: d.geofence_radius_m,
  };
}
