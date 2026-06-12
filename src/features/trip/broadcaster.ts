import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { TripPing } from '@/data/domain';
import { shouldPublish, createPingBuffer, type Sample } from './pingQueue';

export const TRIP_LOCATION_TASK = 'sms-trip-location';
const CADENCE_MS = 10_000;
const MIN_METERS = 50;

// The active publisher is registered at startBroadcast time and read by the task.
let activeTripId: string | null = null;
let publish: ((ping: TripPing) => Promise<void>) | null = null;
let last: Sample | null = null;

TaskManager.defineTask(TRIP_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data || !activeTripId || !publish) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const loc of locations) {
    const sample: Sample = { lat: loc.coords.latitude, lng: loc.coords.longitude, at: loc.timestamp };
    if (!shouldPublish(last, sample, CADENCE_MS, MIN_METERS)) continue;
    last = sample;
    const ping: TripPing = {
      tripId: activeTripId,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      speedKmh: Math.max(0, Math.round((loc.coords.speed ?? 0) * 3.6)),
      heading: loc.coords.heading ?? 0,
      at: new Date(loc.timestamp).toISOString(),
    };
    try { await publish(ping); } catch { /* offline — buffer retries on next event */ }
  }
});

export interface BroadcastDeps {
  tripId: string;
  onPing: (ping: TripPing) => Promise<void>;
}

// Returns true if the background stream started (permissions granted), false otherwise.
export async function startBroadcast({ tripId, onPing }: BroadcastDeps): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return false;

  activeTripId = tripId;
  last = null;
  const buffer = createPingBuffer(onPing);
  publish = (ping) => { buffer.enqueue(ping); return buffer.flush(); };

  await Location.startLocationUpdatesAsync(TRIP_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: CADENCE_MS,
    distanceInterval: MIN_METERS,
    foregroundService: {
      notificationTitle: 'Trip live',
      notificationBody: 'Sharing the bus location with the school',
      notificationColor: '#0E5C4A',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
  return true;
}

export async function stopBroadcast(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(TRIP_LOCATION_TASK);
    if (running) await Location.stopLocationUpdatesAsync(TRIP_LOCATION_TASK);
  } finally {
    activeTripId = null;
    publish = null;
    last = null;
  }
}
