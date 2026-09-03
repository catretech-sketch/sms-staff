import type { AttendanceRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAttendance, toSchoolLocation, type AttendanceDTO, type SchoolLocationDTO } from './mappers';

export function httpAttendance(http: HttpClient): AttendanceRepository {
  return {
    status: () => http.get<AttendanceDTO>('/staff/attendance').then(toAttendance),
    schoolLocation: () =>
      http.get<SchoolLocationDTO>('/me/attendance/school-location').then(toSchoolLocation),
    checkIn: (at, lat, lng, accuracyMeters) =>
      http
        .post<AttendanceDTO>('/staff/attendance/check-in', { at, lat, lng, accuracy_meters: accuracyMeters })
        .then(toAttendance),
    checkOut: (at, lat, lng, accuracyMeters) =>
      http
        .post<AttendanceDTO>('/staff/attendance/check-out', { at, lat, lng, accuracy_meters: accuracyMeters })
        .then(toAttendance),
  };
}
