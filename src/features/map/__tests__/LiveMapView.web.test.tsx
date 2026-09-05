import React from 'react';
import { render, within } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { LiveMapView } from '@/features/map/LiveMapView.web';
import type { Stop } from '@/data/domain';

const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

const mockMapViewProps: any[] = [];

jest.mock('@teovilla/react-native-web-maps', () => {
  const { View } = require('react-native');
  const MockMapView = (props: any) => {
    // eslint-disable-next-line react/prop-types
    mockMapViewProps.push(props);
    return <View testID={props.testID}>{props.children}</View>;
  };
  const MockMarker = ({ testID, children }: any) => <View testID={testID}>{children}</View>;
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

const stopsWithEta: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1, etaMin: 5 },
  { id: 's2', name: 'Market', lat: 12.2, lng: 77.2, seq: 2, etaMin: 12 },
];

describe('LiveMapView (web)', () => {
  const OLD_ENV = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  afterEach(() => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = OLD_ENV;
    mockMapViewProps.length = 0;
  });

  it('renders the map with markers and a polyline when an API key is present', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    const { getAllByTestId, getByTestId } = renderWithTheme(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getAllByTestId(/^map-stop-/)).toHaveLength(2);
    expect(getByTestId('map-polyline')).toBeTruthy();
  });

  it('passes provider="google" to the underlying MapView so it actually renders on web', () => {
    // @teovilla/react-native-web-maps' MapView returns null unless
    // provider === 'google' — omitting this prop silently blanks the map.
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    renderWithTheme(<LiveMapView stops={stops} liveMarker={null} />);
    expect(mockMapViewProps).toHaveLength(1);
    expect(mockMapViewProps[0].provider).toBe('google');
  });

  it('highlights the nearest stop as the destination and marks earlier stops completed', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    const { getByTestId } = renderWithTheme(
      <LiveMapView stops={stops} liveMarker={{ latitude: 12.2, longitude: 77.2 }} />
    );
    expect(within(getByTestId('map-stop-s1')).getByTestId('stop-marker-completed')).toBeTruthy();
    expect(within(getByTestId('map-stop-s2')).getByTestId('stop-marker-destination')).toBeTruthy();
  });

  it('renders a fallback card instead of the map when the API key is missing', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = '';
    const { getByTestId, queryByTestId } = renderWithTheme(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getByTestId('map-unavailable')).toBeTruthy();
    expect(queryByTestId('live-map')).toBeNull();
  });

  it('renders a distance/duration label at each route segment', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
    const { getByTestId } = renderWithTheme(<LiveMapView stops={stopsWithEta} liveMarker={null} />);
    const label = within(getByTestId('map-segment-0')).getByTestId('route-segment-label');
    expect(label).toHaveTextContent(/min/);
    expect(label).toHaveTextContent(/km/);
  });
});
