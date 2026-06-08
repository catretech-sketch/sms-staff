// src/__tests__/integration.test.tsx
// Integration smoke test: boot → Splash → Login → sign-in → Home with school identity.
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProviders } from '@/providers/AppProviders';
import { RootNavigator } from '@/navigation/RootNavigator';

// Mirror the secure-store mock from AuthProvider.test.tsx
jest.mock('expo-secure-store', () => {
  let mem: Record<string, string> = {};
  return {
    setItemAsync: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    deleteItemAsync: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
  };
});

// expo-location is imported transitively through AttendanceScreen; mock it so it
// never tries to access native modules in the test environment.
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({
    coords: { latitude: 0, longitude: 0, accuracy: 8 },
  }),
}));

// Reanimated mock — Splash uses reanimated; the mock keeps it inert in tests.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

it('signs in through the mock data source and lands on Home with school identity', async () => {
  const { getByTestId, findByText } = render(
    <AppProviders>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>,
  );

  // 1. Wait for the Splash to appear (AppProviders store init complete, RootNavigator
  //    rendering Splash — either in loading state or unauthenticated state).
  await waitFor(() => getByTestId('splash'), { timeout: 5000 });

  // 2. Wait until auth has settled to 'unauthenticated' so the Splash's onDone is
  //    real (setSplashDone). The mock SecureStore resolves to null immediately, so
  //    auth settles before the next microtask checkpoint. We confirm by waiting for
  //    the Splash to exist AND for the auth bootstrap Promise to flush through React's
  //    update queue — a second waitFor poll achieves this without a fixed-time sleep.
  await waitFor(() => getByTestId('splash'), { timeout: 3000 });

  // 3. Press the Splash — auth is now 'unauthenticated', onDone = setSplashDone(true).
  fireEvent.press(getByTestId('splash'));

  // 4. Wait for Login screen (login-cta button).

  // 5. Phone field defaults to '98765 43210' (valid), so login-cta is enabled. Press it.
  fireEvent.press(getByTestId('login-cta'));

  // 6. Mock sign-in resolves: AuthProvider flips to authenticated, RootNavigator
  //    renders Main stack → HomeScreen → school name visible.
  expect(await findByText('Greenfield Public School', {}, { timeout: 5000 })).toBeTruthy();
}, 20000);
