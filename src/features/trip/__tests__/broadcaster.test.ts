import { startBroadcast } from '@/features/trip/broadcaster';

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
  Accuracy: { High: 6 },
}));

jest.mock('@/features/trip/pingQueue', () => ({
  shouldPublish: jest.fn(() => true),
  createPersistedPingBuffer: jest.fn(async () => ({
    enqueue: jest.fn(async () => {}),
    flush: jest.fn(async () => {}),
  })),
}));

describe('startBroadcast', () => {
  it('resolves to false instead of throwing when the platform has no background-location support', async () => {
    await expect(
      startBroadcast({ tripId: 't1', onPing: jest.fn(async () => {}) })
    ).resolves.toBe(false);
  });
});
