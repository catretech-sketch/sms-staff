export interface AttendanceLog {
  at: string; // ISO timestamp
  kind: 'in' | 'out';
  inZone: boolean;
}

export interface Attendance {
  checkedIn: boolean;
  checkInAt?: string;
  lastLog: AttendanceLog[];
  dutyPost: string;
  geofenceRadiusM: number;
}

export interface SchoolLocation {
  lat: number;
  lng: number;
  radiusMeters: number;
  name?: string;
}
