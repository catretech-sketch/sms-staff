// src/screens/__tests__/SplashScreen.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/components/ui/testUtils';
import { SplashScreen } from '@/screens/SplashScreen';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.useFakeTimers();
it('auto-advances after the splash delay', () => {
  const onDone = jest.fn();
  renderWithTheme(<SplashScreen onDone={onDone} />);
  jest.advanceTimersByTime(2300);
  expect(onDone).toHaveBeenCalledTimes(1);
});
it('skips on tap', () => {
  const onDone = jest.fn();
  const { getByTestId } = renderWithTheme(<SplashScreen onDone={onDone} />);
  fireEvent.press(getByTestId('splash'));
  expect(onDone).toHaveBeenCalledTimes(1);
});
it('auto-advance calls the LATEST onDone even when the prop changes after mount', () => {
  // Reproduces the wedge: RootNavigator mounts Splash with a no-op onDone during
  // auth bootstrap, then swaps in the real onDone once status resolves. Because
  // React reconciles the same Splash in place (no remount), the timer must call
  // the current onDone, not the one captured at mount.
  const stale = jest.fn();
  const real = jest.fn();
  const { rerender } = renderWithTheme(<SplashScreen onDone={stale} />);
  rerender(<SplashScreen onDone={real} />);
  jest.advanceTimersByTime(2300);
  expect(stale).not.toHaveBeenCalled();
  expect(real).toHaveBeenCalledTimes(1);
});
it('fires onDone exactly once even if tapped and the timer also elapses', () => {
  const onDone = jest.fn();
  const { getByTestId } = renderWithTheme(<SplashScreen onDone={onDone} />);
  fireEvent.press(getByTestId('splash'));
  jest.advanceTimersByTime(2300);
  expect(onDone).toHaveBeenCalledTimes(1);
});
