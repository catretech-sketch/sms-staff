import React from 'react';
import { renderWithTheme } from '../testUtils';
import { RouteStrip } from '@/components/ui';
import type { Route } from '@/data/domain';

const route: Route = {
  id: 'r', name: 'Route 7', assignedBusNo: 'B',
  stops: [
    { id: 's0', name: 'School Gate', lat: 0, lng: 0, seq: 0 },
    { id: 's1', name: 'Sector 12', lat: 0, lng: 10, seq: 1 },
  ],
};

it('renders stop names and the current/next stop labels', () => {
  const { getByText } = renderWithTheme(
    <RouteStrip route={route} progress={0.25} accent="#E08A3C" currentStopName="School Gate" nextStopName="Sector 12" />,
  );
  expect(getByText(/Sector 12/)).toBeTruthy();
});
