import type { AttendanceRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAttendance, type AttendanceDTO } from './mappers';

export function httpAttendance(http: HttpClient): AttendanceRepository {
  return {
    status: () => http.get<AttendanceDTO>('/staff/attendance').then(toAttendance),
    checkIn: (at, inZone) =>
      http.post<AttendanceDTO>('/staff/attendance/check-in', { at, in_zone: inZone }).then(toAttendance),
    checkOut: (at) =>
      http.post<AttendanceDTO>('/staff/attendance/check-out', { at }).then(toAttendance),
  };
}
