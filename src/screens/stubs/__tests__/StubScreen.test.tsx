import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { StubScreen } from '@/screens/stubs/StubScreen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

describe('StubScreen', () => {
  it('renders its title', () => {
    render(
      <ThemeProvider>
        <StubScreen title="Roster" />
      </ThemeProvider>,
    );
    expect(screen.getByText('Roster')).toBeOnTheScreen();
    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
  });
});
