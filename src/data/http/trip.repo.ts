import type { TripRepository } from '@/data/repositories/types';
import type { TripPing, Boarding, TripDirection } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import {
  toTripAssignment, toTrip, toTripSummary, toStudentLite, toBoarding,
  type TripAssignmentDTO, type TripDTO, type TripSummaryDTO, type StudentLiteDTO, type BoardingDTO,
} from './mappers';

export function httpTrip(http: HttpClient): TripRepository {
  return {
    myAssignment: () => http.get<TripAssignmentDTO>('/staff/trip/assignment').then(toTripAssignment),
    current: () =>
      http.get<TripDTO | null>('/staff/trip/current').then((d) => (d ? toTrip(d) : null)),
    startTrip: (routeId: string, direction: TripDirection) =>
      http.post<TripDTO>('/staff/trips', { route_id: routeId, direction }).then(toTrip),
    publishPing: (ping: TripPing) =>
      http
        .post<void>(`/staff/trips/${ping.tripId}/pings`, {
          pings: [
            { lat: ping.lat, lng: ping.lng, speed_kmh: ping.speedKmh, heading: ping.heading, at: ping.at },
          ],
        })
        .then(() => undefined),
    endTrip: (tripId: string) =>
      http.post<TripSummaryDTO>(`/staff/trips/${tripId}/end`, {}).then(toTripSummary),
    roster: (tripId: string) =>
      http.get<StudentLiteDTO[]>(`/staff/trips/${tripId}/roster`).then((arr) => arr.map(toStudentLite)),
    setBoarding: (b: Boarding) =>
      http
        .post<void>(`/staff/trips/${b.tripId}/boarding`, {
          student_id: b.studentId, stop_id: b.stopId, state: b.state, at: b.at,
        })
        .then(() => undefined),
    boardingState: (tripId: string) =>
      http.get<BoardingDTO[]>(`/staff/trips/${tripId}/boarding`).then((arr) => arr.map(toBoarding)),
  };
}
