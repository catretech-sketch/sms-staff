import React from 'react';
import { render } from '@testing-library/react-native';
import { LiveMapView } from '@/features/map/LiveMapView';
import type { Stop } from '@/data/domain';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = ({ children, testID }: any) => <View testID={testID}>{children}</View>;
  const MockMarker = ({ testID }: any) => <View testID={testID} />;
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

describe('LiveMapView (native)', () => {
  it('renders one marker per stop and a polyline', () => {
    const { getAllByTestId, getByTestId } = render(<LiveMapView stops={stops} liveMarker={null} />);
    expect(getAllByTestId(/^map-stop-/)).toHaveLength(2);
    expect(getByTestId('map-polyline')).toBeTruthy();
  });

  it('renders a live marker only when liveMarker is provided', () => {
    const { queryByTestId, rerender } = render(<LiveMapView stops={stops} liveMarker={null} />);
    expect(queryByTestId('map-live-marker')).toBeNull();
    rerender(<LiveMapView stops={stops} liveMarker={{ latitude: 12.15, longitude: 77.15 }} />);
    expect(queryByTestId('map-live-marker')).toBeTruthy();
  });
});
