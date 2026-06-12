import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { TripScreen } from '@/screens/TripScreen';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});
jest.mock('@/features/trip/broadcaster', () => ({
  startBroadcast: jest.fn(() => Promise.resolve(true)),
  stopBroadcast: jest.fn(() => Promise.resolve()),
}));

// Helper that flips the theme role to conductor on mount.
const SetConductor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setRole } = useTheme();
  React.useEffect(() => { setRole('conductor'); }, [setRole]);
  return <>{children}</>;
};

async function renderConductor() {
  const repos = createMockRepositories(await createStore());
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const nav = { goBack: jest.fn(), navigate: jest.fn() };
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <SetConductor>
            <RepositoryProvider repositories={repos}>
              <TripScreen navigation={nav as never} />
            </RepositoryProvider>
          </SetConductor>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

it('shows the roster + headcount after starting a trip and boards a student', async () => {
  const { getByTestId, findByText } = await renderConductor();
  await findByText(/Route 7/);
  fireEvent.press(getByTestId('trip-start'));
  await waitFor(() => expect(getByTestId('roster-stu_1')).toBeTruthy());
  fireEvent.press(getByTestId('roster-stu_1'));
  await waitFor(() => expect(getByTestId('headcount').props.children).toMatch(/1/));
});
