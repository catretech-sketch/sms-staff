import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ToastProvider } from '@/components/ui';
import { LiveMapScreen } from '@/screens/LiveMapScreen';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  watchPositionAsync: jest.fn(async (_opts, cb) => {
    // Unambiguously nearer to s1 (Gate, 12.1/77.1) than s2 (Market, 12.2/77.2),
    // so s1 resolves as the current stop and s2 as the next one.
    cb({ coords: { latitude: 12.11, longitude: 77.11 } });
    return { remove: jest.fn() };
  }),
  Accuracy: { Balanced: 3 },
}));

const mockAssignment = {
  data: {
    route: {
      id: 'r1', name: 'Route 1', assignedBusNo: 'KA-01',
      stops: [
        { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1 },
        { id: 's2', name: 'Market', lat: 12.2, lng: 77.2, seq: 2 },
      ],
    },
    busNo: 'KA-01',
  },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const mockCurrent = { data: { id: 't1', routeId: 'r1', busNo: 'KA-01', driverId: 'd1', direction: 'pickup', status: 'live' }, isLoading: false };
const mockRoster = { data: [] as any[] };
const mockBoarding = { data: [] as any[], setBoarding: { mutate: jest.fn() } };

jest.mock('@/features/trip/hooks', () => ({
  useTripAssignment: () => mockAssignment,
  useCurrentTrip: () => mockCurrent,
  useRoster: () => mockRoster,
  useBoarding: () => mockBoarding,
}));

const mockMapHandle = { animateToRegion: jest.fn(), fitToCoordinates: jest.fn() };

jest.mock('@/features/map/LiveMapView', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const LiveMapView = React.forwardRef(({ stops, liveMarker, onMapReady }: any, ref: any) => {
    React.useImperativeHandle(ref, () => mockMapHandle);
    React.useEffect(() => { onMapReady?.(); }, [onMapReady]);
    return (
      <View testID="live-map-view">
        <Text testID="stop-count">{stops.length}</Text>
        {liveMarker && <Text testID="has-live-marker">yes</Text>}
      </View>
    );
  });
  return { LiveMapView };
});

describe('LiveMapScreen', () => {
  beforeEach(() => {
    mockMapHandle.animateToRegion.mockClear();
    mockMapHandle.fitToCoordinates.mockClear();
  });

  it('renders a compact header with the bus number, direction, route name and a LIVE status pill', async () => {
    const { getByText, getAllByText } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getAllByText('LIVE').length).toBeGreaterThan(0));
    expect(getByText('KA-01')).toBeTruthy();
    expect(getByText('Route 1')).toBeTruthy();
  });

  it('shows the next stop with a distance to it once GPS resolves', async () => {
    const { getByTestId, getByText } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByTestId('has-live-marker')).toBeTruthy());
    expect(getByText('Market')).toBeTruthy();
    expect(getByTestId('view-students-btn')).toBeTruthy();
  });

  it('recenters the map on the live marker when the recenter button is pressed', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByTestId('has-live-marker')).toBeTruthy());
    fireEvent.press(getByTestId('recenter-btn'));
    expect(mockMapHandle.animateToRegion).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 12.11, longitude: 77.11 }),
      expect.any(Number)
    );
  });

  it('renders the map with stops and the live marker once GPS resolves', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByTestId('has-live-marker')).toBeTruthy());
    expect(getByTestId('stop-count').props.children).toBe(2);
  });

  it('shows a toast and still renders stops when location permission is denied', async () => {
    const Location = require('expo-location');
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const { getByTestId, queryByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByTestId('live-map-view')).toBeTruthy());
    expect(queryByTestId('has-live-marker')).toBeNull();
  });

  it('still renders the map without a live marker when watchPositionAsync throws', async () => {
    const Location = require('expo-location');
    Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    Location.watchPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
    const { getByTestId, queryByTestId } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );
    await waitFor(() => expect(getByTestId('live-map-view')).toBeTruthy());
    expect(queryByTestId('has-live-marker')).toBeNull();
  });

  it('removes the GPS subscription if the screen unmounts before watchPositionAsync resolves', async () => {
    const Location = require('expo-location');
    const removeMock = jest.fn();
    let resolveWatch: (value: { remove: () => void }) => void;
    const watchPromise = new Promise<{ remove: () => void }>((resolve) => {
      resolveWatch = resolve;
    });
    Location.watchPositionAsync.mockImplementationOnce(() => watchPromise);

    const { unmount } = render(
      <ThemeProvider>
        <ToastProvider>
          <LiveMapScreen navigation={{ goBack: jest.fn() }} route={{ params: { tripId: 't1' } }} />
        </ToastProvider>
      </ThemeProvider>
    );

    // Wait until the effect has progressed past permission checks and called
    // watchPositionAsync, then unmount before that call resolves.
    await waitFor(() => expect(Location.watchPositionAsync).toHaveBeenCalled());
    unmount();

    // Now let watchPositionAsync resolve with a live subscription.
    resolveWatch!({ remove: removeMock });
    await waitFor(() => expect(removeMock).toHaveBeenCalledTimes(1));
  });
});
