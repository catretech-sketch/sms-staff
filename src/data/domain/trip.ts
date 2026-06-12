export type TripDirection = 'pickup' | 'drop';
export type TripStatus = 'idle' | 'live' | 'ended';
export type BoardingState = 'boarded' | 'dropped' | 'absent';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  seq: number;
  etaMin?: number;
}

export interface Route {
  id: string;
  name: string;
  assignedBusNo: string;
  stops: Stop[];
}

export interface Trip {
  id: string;
  routeId: string;
  busNo: string;
  driverId: string;
  conductorId?: string;
  direction: TripDirection;
  status: TripStatus;
  startedAt?: string;
  endedAt?: string;
  broadcasterId?: string;
}

export interface TripPing {
  tripId: string;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  at: string; // ISO timestamp
}

export interface StudentLite {
  id: string;
  name: string;
  stopId: string;
  photoUrl?: string;
}

export interface Boarding {
  tripId: string;
  studentId: string;
  stopId: string;
  state: BoardingState;
  at: string;
}

export interface TripSummary {
  tripId: string;
  durationMin: number;
  distanceKm: number;
  stopsCovered: number;
  boardedCount: number;
}

export interface TripAssignment {
  route: Route;
  busNo: string;
  conductorName?: string | null;
}
