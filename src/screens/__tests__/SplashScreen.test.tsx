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
it('fires onDone exactly once even if tapped and the timer also elapses', () => {
  const onDone = jest.fn();
  const { getByTestId } = renderWithTheme(<SplashScreen onDone={onDone} />);
  fireEvent.press(getByTestId('splash'));
  jest.advanceTimersByTime(2300);
  expect(onDone).toHaveBeenCalledTimes(1);
});
