import { useState } from 'react';
import type { Stop, StudentLite, Boarding } from '@/data/domain';
import { distanceMeters } from '@/lib/geo';
import { findActiveStop, countPickup, type StopPickupCounts } from './stopProgress';

export type StopProgressState = 'EN_ROUTE' | 'PICKUP_IN_PROGRESS' | 'ROUTE_COMPLETED';

export interface StopProgress extends StopPickupCounts {
  state: StopProgressState;
  activeStop: Stop | null;
}

const ARRIVAL_RADIUS_METERS = 50;

export function useStopProgress(
  stops: Stop[],
  roster: StudentLite[],
  boarding: Boarding[],
  liveMarker: { latitude: number; longitude: number } | null,
): StopProgress & { markArrivedManually: () => void } {
  const activeStop = findActiveStop(stops, roster, boarding);
  const [manualArrivedStopId, setManualArrivedStopId] = useState<string | null>(null);

  const withinRadius =
    !!liveMarker &&
    !!activeStop &&
    distanceMeters(
      { lat: liveMarker.latitude, lng: liveMarker.longitude },
      { lat: activeStop.lat, lng: activeStop.lng },
    ) <= ARRIVAL_RADIUS_METERS;

  const arrived = manualArrivedStopId === activeStop?.id || withinRadius;
  const counts = countPickup(activeStop, roster, boarding);

  const state: StopProgressState = !activeStop ? 'ROUTE_COMPLETED' : arrived ? 'PICKUP_IN_PROGRESS' : 'EN_ROUTE';

  return {
    state,
    activeStop,
    ...counts,
    markArrivedManually: () => setManualArrivedStopId(activeStop?.id ?? null),
  };
}
