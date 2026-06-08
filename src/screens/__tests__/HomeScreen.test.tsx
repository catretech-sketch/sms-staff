// HomeScreen.test.tsx
import React from 'react';
import { waitFor, render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { HomeScreen } from '@/screens/HomeScreen';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Render under providers; AuthProvider starts unauthenticated, so this test
// signs in through the mock first via a small harness, OR mock useDashboard/useAuth.
jest.mock('@/features/attendance/hooks', () => ({
  useAttendanceStatus: () => ({ data: { checkedIn: false, lastLog: [], dutyPost: 'Bus / Route', geofenceRadiusM: 120 }, isLoading: false }),
}));
jest.mock('@/features/dashboard/hooks', () => ({
  useDashboard: () => ({ data: {
    hoursThisWeek: 34, hoursTarget: 44, streakDays: 21, leaveLeft: 12,
    roleCard: { kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', licenseExpiresInDays: 24, fitnessOk: true },
    pendingTasksPeek: [{ id: 't1', title: 'Pre-trip bus inspection', priority: 'urgent', done: false }],
    alert: 'Staff meeting at 4:00 PM',
  }, isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('@/features/auth/AuthProvider', () => ({
  ...jest.requireActual('@/features/auth/AuthProvider'),
  useAuth: () => ({ status: 'authenticated', session: { user: { firstName: 'Ramesh', name: 'Ramesh Kumar', roleKey: 'driver', timing: '7:30–3:30', dutyPost: 'Bus / Route' }, tenant: { id: 'school_greenfield', name: 'Greenfield Public School' } }, signIn: jest.fn(), signOut: jest.fn() }),
}));

it('renders the dashboard with school identity and role card', async () => {
  const { getByText } = render(<AppProviders><HomeScreen navigation={{ navigate: jest.fn() } as any} /></AppProviders>);
  await waitFor(() => expect(getByText('Greenfield Public School')).toBeTruthy());
  expect(getByText(/HR-26-BX-4412/)).toBeTruthy();
});
