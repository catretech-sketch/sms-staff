import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ToastProvider } from '@/components/ui';
import { LiveMapScreen } from '@/screens/LiveMapScreen';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  watchPositionAsync: jest.fn(async (_opts, cb) => {
    cb({ coords: { latitude: 12.15, longitude: 77.15 } });
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

jest.mock('@/features/trip/hooks', () => ({
  useTripAssignment: () => mockAssignment,
  useCurrentTrip: () => mockCurrent,
}));

jest.mock('@/features/map/LiveMapView', () => ({
  LiveMapView: ({ stops, liveMarker }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="live-map-view">
        <Text testID="stop-count">{stops.length}</Text>
        {liveMarker && <Text testID="has-live-marker">yes</Text>}
      </View>
    );
  },
}));

describe('LiveMapScreen', () => {
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
});
