import React from 'react';
import { render } from '@testing-library/react-native';
import { LiveMapView } from '@/features/map/LiveMapView.web';
import type { Stop } from '@/data/domain';

jest.mock('@teovilla/react-native-web-maps', () => {
  const { View } = require('react-native');
  const MockMapView = ({ children, testID }: any) => <View testID={testID}>{children}</View>;
  const MockMarker = ({ testID }: any) => <View testID={testID} />;
  const MockPolyline = ({ testID }: any) => <View testID={testID} />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

const stops: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1 },
  { id: 's2', name: 'Market', lat: 12.2, lng: 77.2, seq: 2 },
];

describe('LiveMapView (web)', () => {
  const OLD_ENV = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  afterEach(() => { process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = OLD_ENV; });

  it('renders the map with markers and a polyline when an API key is present', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    const { getAllByTestId, getByTestId } = render(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getAllByTestId(/^map-stop-/)).toHaveLength(2);
    expect(getByTestId('map-polyline')).toBeTruthy();
  });

  it('renders a fallback card instead of the map when the API key is missing', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = '';
    const { getByTestId, queryByTestId } = render(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getByTestId('map-unavailable')).toBeTruthy();
    expect(queryByTestId('live-map')).toBeNull();
  });
});
