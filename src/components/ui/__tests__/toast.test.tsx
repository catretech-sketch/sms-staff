// src/components/ui/__tests__/toast.test.tsx
import React, { useEffect } from 'react';
import { act } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { ToastProvider, useToast } from '../Toast';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * A child component that fires show() on mount so the toast is triggered
 * immediately without any user interaction.
 */
function AutoShowChild({ msg, kind }: { msg: string; kind?: 'info' | 'error' | 'success' }) {
  const { show } = useToast();
  useEffect(() => {
    show(msg, kind ?? 'success');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/**
 * A component that calls useToast() outside a provider — used to verify the
 * guard throw.
 */
function NoProviderConsumer() {
  useToast(); // should throw
  return null;
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('ToastProvider / useToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the toast message text when show() is called on mount', async () => {
    const { getByText } = renderWithTheme(
      <ToastProvider>
        <AutoShowChild msg="Hello" kind="success" />
      </ToastProvider>,
    );

    // Allow state updates triggered by useEffect + Animated to flush
    await act(async () => {
      jest.advanceTimersByTime(300); // past the 260 ms fade-in
    });

    expect(getByText('Hello')).toBeTruthy();
  });

  it('renders an info toast message', async () => {
    const { getByText } = renderWithTheme(
      <ToastProvider>
        <AutoShowChild msg="Info notice" kind="info" />
      </ToastProvider>,
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(getByText('Info notice')).toBeTruthy();
  });

  it('renders an error toast message', async () => {
    const { getByText } = renderWithTheme(
      <ToastProvider>
        <AutoShowChild msg="Something went wrong" kind="error" />
      </ToastProvider>,
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('throws when useToast() is used outside a ToastProvider', () => {
    // Suppress the React error boundary console noise for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderWithTheme(<NoProviderConsumer />)).toThrow(
        'useToast must be used within a ToastProvider',
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
