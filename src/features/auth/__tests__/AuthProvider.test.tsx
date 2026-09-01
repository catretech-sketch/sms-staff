import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
jest.mock('expo-secure-store', () => {
  let mem: Record<string, string> = {};
  return {
    setItemAsync: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    deleteItemAsync: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
  };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

function Harness() {
  const {
    status, session, pendingPasswordSetup,
    signInWithOtp, signInWithPassword, completePasswordSetup, cancelPasswordSetup, signOut,
  } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="pending">{pendingPasswordSetup ? 'yes' : 'no'}</Text>
      <Text testID="school">{session?.tenant.name ?? ''}</Text>
      <Text testID="role">{session?.user.roleKey ?? ''}</Text>
      <Pressable testID="otp-in" onPress={() => signInWithOtp('98765 43210', '123456', 'conductor')}><Text>otp-in</Text></Pressable>
      <Pressable testID="pw-in" onPress={() => signInWithPassword('98765 43210', 'hunter2222', 'peon')}><Text>pw-in</Text></Pressable>
      <Pressable testID="complete" onPress={() => completePasswordSetup('hunter2222')}><Text>complete</Text></Pressable>
      <Pressable testID="cancel" onPress={() => cancelPasswordSetup()}><Text>cancel</Text></Pressable>
      <Pressable testID="out" onPress={() => signOut()}><Text>out</Text></Pressable>
    </>
  );
}

async function renderWithProviders() {
  const repos = createMockRepositories(await createStore());
  return render(
    <RepositoryProvider repositories={repos}>
      <AuthProvider><Harness /></AuthProvider>
    </RepositoryProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('starts unauthenticated with no stored session', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('signInWithPassword authenticates directly and exposes school + role', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    fireEvent.press(screen.getByTestId('pw-in'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('school')).toHaveTextContent('Greenfield Public School');
    expect(screen.getByTestId('role')).toHaveTextContent('peon');
  });

  it('signInWithOtp verifies but stays unauthenticated, marking pendingPasswordSetup', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    fireEvent.press(screen.getByTestId('otp-in'));
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('yes'));
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('completePasswordSetup sets the password then authenticates', async () => {
    await renderWithProviders();
    fireEvent.press(screen.getByTestId('otp-in'));
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('yes'));
    fireEvent.press(screen.getByTestId('complete'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('pending')).toHaveTextContent('no');
    expect(screen.getByTestId('role')).toHaveTextContent('conductor');
  });

  it('cancelPasswordSetup clears the pending session without authenticating', async () => {
    await renderWithProviders();
    fireEvent.press(screen.getByTestId('otp-in'));
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('yes'));
    fireEvent.press(screen.getByTestId('cancel'));
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('no'));
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('fails safe to unauthenticated when token storage throws during bootstrap', async () => {
    const SecureStore = require('expo-secure-store');
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('SecureStore.getValueWithKeyAsync is not a function'),
    );
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('signOut returns to unauthenticated', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    fireEvent.press(screen.getByTestId('pw-in'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    fireEvent.press(screen.getByTestId('out'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });
});
