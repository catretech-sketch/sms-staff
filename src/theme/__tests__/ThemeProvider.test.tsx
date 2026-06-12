import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    },
  };
});

function Probe() {
  const { colors, role, dark, toggleDark, setRole } = useTheme();
  return (
    <>
      <Text testID="bg">{colors.bg}</Text>
      <Text testID="role">{role.key}</Text>
      <Text testID="dark">{String(dark)}</Text>
      <Pressable testID="toggle" onPress={toggleDark}><Text>t</Text></Pressable>
      <Pressable testID="conductor" onPress={() => setRole('conductor')}><Text>c</Text></Pressable>
    </>
  );
}

describe('ThemeProvider', () => {
  it('defaults to light theme and driver role', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('bg')).toHaveTextContent('#F2EEE4');
    expect(screen.getByTestId('role')).toHaveTextContent('driver');
    expect(screen.getByTestId('dark')).toHaveTextContent('false');
  });

  it('toggleDark flips to dark tokens', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.press(screen.getByTestId('toggle'));
    await waitFor(() => expect(screen.getByTestId('bg')).toHaveTextContent('#0B1512'));
  });

  it('setRole switches the active role', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.press(screen.getByTestId('conductor'));
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('conductor'));
  });
});
