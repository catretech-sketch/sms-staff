import { startBroadcast, stopBroadcast } from '@/features/trip/broadcaster';

type LocationCallback = (loc: unknown) => void;

const mockRemove = jest.fn();
const mockWatchPositionAsync = jest.fn(async (_opts: unknown, _cb: LocationCallback) => ({ remove: mockRemove }));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  startLocationUpdatesAsync: jest.fn(async () => {
    throw new Error('startLocationUpdatesAsync is not a function');
  }),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  stopLocationUpdatesAsync: jest.fn(async () => {}),
  watchPositionAsync: (...args: unknown[]) => mockWatchPositionAsync(args[0], args[1] as never),
  Accuracy: { High: 6 },
}));

jest.mock('@/features/trip/pingQueue', () => ({
  shouldPublish: jest.fn(() => true),
  createPersistedPingBuffer: jest.fn(async (onPing: (ping: unknown) => Promise<void>) => ({
    enqueue: jest.fn(async (ping: unknown) => {
      await onPing(ping);
    }),
    flush: jest.fn(async () => {}),
  })),
}));

beforeEach(() => {
  mockRemove.mockClear();
  mockWatchPositionAsync.mockClear();
});

describe('startBroadcast', () => {
  it('falls back to a foreground location watcher when background tasks are unsupported (e.g. web), instead of failing outright', async () => {
    const onPing = jest.fn(async () => {});
    await expect(startBroadcast({ tripId: 't1', onPing })).resolves.toBe(true);
    expect(mockWatchPositionAsync).toHaveBeenCalled();
  });

  it('publishes a ping when the foreground watcher reports a new position', async () => {
    const onPing = jest.fn(async () => {});
    await startBroadcast({ tripId: 't1', onPing });
    const watcherCallback = mockWatchPositionAsync.mock.calls[0][1] as (loc: unknown) => void;
    watcherCallback({
      coords: { latitude: 12.9, longitude: 77.6, speed: 5, heading: 90 },
      timestamp: Date.now(),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(onPing).toHaveBeenCalledWith(expect.objectContaining({ tripId: 't1', lat: 12.9, lng: 77.6 }));
  });

  it('resolves to false when even foreground permission is denied', async () => {
    const Location = jest.requireMock('expo-location');
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    await expect(startBroadcast({ tripId: 't1', onPing: jest.fn(async () => {}) })).resolves.toBe(false);
  });
});

describe('stopBroadcast', () => {
  it('removes the foreground watcher subscription when broadcasting via the fallback', async () => {
    await startBroadcast({ tripId: 't1', onPing: jest.fn(async () => {}) });
    await stopBroadcast();
    expect(mockRemove).toHaveBeenCalled();
  });
});
