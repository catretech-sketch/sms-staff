import React from 'react';
import { render, within } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { LiveMapView } from '@/features/map/LiveMapView';
import type { Stop } from '@/data/domain';

const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = ({ children, testID }: any) => <View testID={testID}>{children}</View>;
  const MockMarker = ({ testID, children }: any) => <View testID={testID}>{children}</View>;
  const MockPolyline = ({ testID }: any) => <View testID={testID} />;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
    PROVIDER_GOOGLE: 'google',
  };
});

const stops: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1, etaMin: 5 },
  { id: 's2', name: 'Market', lat: 12.2, lng: 77.2, seq: 2, etaMin: 12 },
];

const stopsNoEta: Stop[] = [
  { id: 's1', name: 'Gate', lat: 12.1, lng: 77.1, seq: 1 },
  { id: 's2', name: 'Market', lat: 12.2, lng: 77.2, seq: 2 },
];

describe('LiveMapView (native)', () => {
  it('renders one marker per stop and a polyline', () => {
    const { getAllByTestId, getByTestId } = renderWithTheme(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getAllByTestId(/^map-stop-/)).toHaveLength(2);
    expect(getByTestId('map-polyline')).toBeTruthy();
  });

  it('renders a live marker only when liveMarker is provided', () => {
    const { queryByTestId, rerender } = renderWithTheme(<LiveMapView stops={stops} liveMarker={null} />);
    expect(queryByTestId('map-live-marker')).toBeNull();
    rerender(<ThemeProvider><LiveMapView stops={stops} liveMarker={{ latitude: 12.15, longitude: 77.15 }} /></ThemeProvider>);
    expect(queryByTestId('map-live-marker')).toBeTruthy();
  });

  it('highlights the nearest stop as the destination and marks earlier stops completed', () => {
    // Stop B is the last stop (destination) and also the nearest to the live marker,
    // so it renders as the destination marker rather than a plain "current" one.
    const { getByTestId } = renderWithTheme(
      <LiveMapView stops={stops} liveMarker={{ latitude: 12.2, longitude: 77.2 }} />
    );
    expect(within(getByTestId('map-stop-s1')).getByTestId('stop-marker-completed')).toBeTruthy();
    expect(within(getByTestId('map-stop-s2')).getByTestId('stop-marker-destination')).toBeTruthy();
  });

  it('marks the first stop next when there is no live marker yet', () => {
    const { getByTestId } = renderWithTheme(<LiveMapView stops={stops} liveMarker={null} />);
    expect(within(getByTestId('map-stop-s1')).getByTestId('stop-marker-next')).toBeTruthy();
  });

  it('renders a distance/duration label at each route segment, including duration when stops carry etaMin', () => {
    const { getByTestId } = renderWithTheme(<LiveMapView stops={stops} liveMarker={null} />);
    const label = within(getByTestId('map-segment-0')).getByTestId('route-segment-label');
    expect(label).toBeTruthy();
    expect(label).toHaveTextContent(/min/);
    expect(label).toHaveTextContent(/km/);
  });

  it('omits the duration from the segment label when stops have no etaMin', () => {
    const { getByTestId } = renderWithTheme(<LiveMapView stops={stopsNoEta} liveMarker={null} />);
    const label = within(getByTestId('map-segment-0')).getByTestId('route-segment-label');
    expect(label).not.toHaveTextContent(/min/);
    expect(label).toHaveTextContent(/km/);
  });
});
