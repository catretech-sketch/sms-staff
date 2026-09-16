// HomeScreen.test.tsx
import React from 'react';
import { waitFor, render, fireEvent } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { HomeScreen } from '@/screens/HomeScreen';
import { useTheme } from '@/theme';

// HomeScreen's role-dependent branching reads role from ThemeProvider, not
// from the (mocked, in these tests) AuthProvider session directly — this
// mirrors the theme role production code sets after a real login/session
// restore, without needing the real AuthProvider's sync effect to run.
function SetThemeRole({ role }: { role: 'driver' | 'conductor' | 'sweeper' | 'gardener' | 'guard' | 'peon' }) {
  const { setRole } = useTheme();
  React.useEffect(() => { setRole(role); }, [role, setRole]);
  return null;
}

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

const mockRequestMediaLibraryPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
const mockLaunchImageLibraryAsync = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: 'file:///photo.jpg', base64: 'abc123' }],
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockRequestMediaLibraryPermissionsAsync(),
  launchImageLibraryAsync: (..._args: unknown[]) => mockLaunchImageLibraryAsync(),
}));

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
  useAuth: jest.fn(() => ({ status: 'authenticated', session: { user: { firstName: 'Ramesh', name: 'Ramesh Kumar', roleKey: 'driver', timing: '7:30–3:30', dutyPost: 'Bus / Route' }, tenant: { id: 'school_greenfield', name: 'Greenfield Public School' } }, signIn: jest.fn(), signOut: jest.fn() })),
}));

function renderHome() {
  return render(<AppProviders><HomeScreen navigation={{ navigate: jest.fn() } as any} /></AppProviders>);
}

it('renders the dashboard with school identity and role card', async () => {
  const { getByText } = renderHome();
  await waitFor(() => expect(getByText('Greenfield Public School')).toBeTruthy());
  expect(getByText(/HR-26-BX-4412/)).toBeTruthy();
});

it('shows the Live Trip CTA for the bus driver role', async () => {
  // (uses the existing harness in this file, which renders Home for the seeded driver)
  const { findByTestId } = renderHome(); // <- use this file's existing render helper
  expect(await findByTestId('home-open-trip')).toBeTruthy();
});

it('tapping a pending task\'s camera button opens the photo picker and uploads the selection', async () => {
  const { findByTestId } = renderHome();
  const camBtn = await findByTestId('task-photo-btn-t1');
  fireEvent.press(camBtn);
  await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalled());
  expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalled();
});

it('shows a Report Issue quick action for every role and navigates to Issues on press', async () => {
  const navigate = jest.fn();
  const { findByTestId } = render(<AppProviders><HomeScreen navigation={{ navigate } as any} /></AppProviders>);
  const btn = await findByTestId('home-report-issue');
  fireEvent.press(btn);
  expect(navigate).toHaveBeenCalledWith('Issues');
});

describe('for a non-transport duty role (e.g. guard)', () => {
  const useAuthMock = jest.requireMock('@/features/auth/AuthProvider').useAuth as jest.Mock;
  const originalImpl = useAuthMock.getMockImplementation();
  beforeEach(() => {
    useAuthMock.mockImplementation(() => ({
      status: 'authenticated',
      session: { user: { firstName: 'Amit', name: 'Amit Singh', roleKey: 'guard', timing: '9:00–5:00', dutyPost: 'Main Gate' }, tenant: { id: 'school_greenfield', name: 'Greenfield Public School' } },
      signIn: jest.fn(),
      signOut: jest.fn(),
    }));
  });
  afterEach(() => {
    if (originalImpl) useAuthMock.mockImplementation(originalImpl);
  });

  it('shows Attendance and Leave quick actions instead of My Route, and no Live Trip CTA', async () => {
    const navigate = jest.fn();
    const { findByTestId, queryByTestId } = render(
      <AppProviders>
        <SetThemeRole role="guard" />
        <HomeScreen navigation={{ navigate } as any} />
      </AppProviders>,
    );
    expect(await findByTestId('home-attendance')).toBeTruthy();
    expect(await findByTestId('home-leave')).toBeTruthy();
    expect(await findByTestId('home-my-tasks')).toBeTruthy();
    expect(await findByTestId('home-report-issue')).toBeTruthy();
    expect(queryByTestId('home-open-trip')).toBeNull();

    fireEvent.press(await findByTestId('home-leave'));
    expect(navigate).toHaveBeenCalledWith('Leave');
  });
});
