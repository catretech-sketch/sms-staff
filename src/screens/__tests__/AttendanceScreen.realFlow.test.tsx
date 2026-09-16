import React from 'react';
import { fireEvent, waitFor, render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { AttendanceScreen } from '@/screens/AttendanceScreen';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 0, longitude: 0, accuracy: 8 } }),
}));

it('shows a new history row immediately after a real check-in, then check-out', async () => {
  const { getByTestId, getByText, queryByText, findByText } = render(
    <AppProviders><AttendanceScreen navigation={{ goBack: jest.fn() } as any} /></AppProviders>,
  );

  await waitFor(() => getByTestId('demo-in-range'));
  fireEvent.press(getByTestId('demo-in-range'));
  await waitFor(() => expect(getByTestId('checkin-btn').props.accessibilityState?.disabled).toBe(false));

  expect(queryByText(/Checked in ·/)).toBeNull();

  fireEvent.press(getByTestId('checkin-btn'));
  await findByText(/Checked in ·/);

  await waitFor(() => expect(getByTestId('checkin-btn').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('checkin-btn'));
  await findByText(/Checked out ·/);

  expect(getByText(/Checked in ·/)).toBeTruthy();
});
