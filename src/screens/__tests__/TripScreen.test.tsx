import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '@/theme';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { TripScreen } from '@/screens/TripScreen';
import { ToastProvider } from '@/components/ui';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});
// The screen calls the broadcaster; mock it so no native modules load in jest.
jest.mock('@/features/trip/broadcaster', () => ({
  startBroadcast: jest.fn(() => Promise.resolve(true)),
  stopBroadcast: jest.fn(() => Promise.resolve()),
}));

// The mocked AsyncStorage's backing store persists across tests in this file
// (the jest.mock factory above runs once per file, not per test) since
// createStore() reads/writes through it — reset it so each test starts from
// a clean "no active trip" state regardless of run order.
beforeEach(async () => {
  await AsyncStorage.clear();
});

async function renderScreen() {
  const repos = createMockRepositories(await createStore());
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const nav = { goBack: jest.fn(), navigate: jest.fn() };
  const utils = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <ToastProvider>
            <RepositoryProvider repositories={repos}>
              <TripScreen navigation={nav as never} />
            </RepositoryProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return { ...utils, nav, repos };
}

it('shows the assignment then starts a trip on Start', async () => {
  const { getByTestId, findByText } = await renderScreen();
  await findByText(/Route 7/);
  fireEvent.press(getByTestId('trip-start'));
  await waitFor(() => expect(getByTestId('trip-end')).toBeTruthy());
});

it('navigates to LiveMap with the current tripId when "View Live Map" is pressed', async () => {
  const { getByTestId, findByText, nav, repos } = await renderScreen();
  await findByText(/Route 7/);
  fireEvent.press(getByTestId('trip-start'));
  await waitFor(() => expect(getByTestId('trip-end')).toBeTruthy());
  const liveTrip = await repos.trip.current();
  fireEvent.press(getByTestId('trip-view-map'));
  expect(nav.navigate).toHaveBeenCalledWith('LiveMap', { tripId: liveTrip!.id });
});
