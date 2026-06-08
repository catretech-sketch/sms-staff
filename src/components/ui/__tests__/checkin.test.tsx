import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { CheckInButton } from '@/components/ui';

it('is pressable only when ready or checkedIn', () => {
  const onPress = jest.fn();
  const { getByTestId, rerender } = renderWithTheme(<CheckInButton state="locating" onPress={onPress} accent="#E08A3C" />);
  fireEvent.press(getByTestId('checkin-btn'));
  expect(onPress).not.toHaveBeenCalled();           // disabled while locating

  rerender(<CheckInButton state="ready" onPress={onPress} accent="#E08A3C" />);
  fireEvent.press(getByTestId('checkin-btn'));
  expect(onPress).toHaveBeenCalledTimes(1);         // enabled when ready

  // checkedIn state: button must be enabled (e.g. tap to check out)
  rerender(<CheckInButton state="checkedIn" onPress={onPress} accent="#E08A3C" />);
  expect(getByTestId('checkin-btn').props.accessibilityState?.disabled).toBeFalsy();
  fireEvent.press(getByTestId('checkin-btn'));
  expect(onPress).toHaveBeenCalledTimes(2);

  // out state: button must be disabled (not in range / not actionable)
  rerender(<CheckInButton state="out" onPress={onPress} accent="#E08A3C" />);
  expect(getByTestId('checkin-btn').props.accessibilityState?.disabled).toBe(true);
  fireEvent.press(getByTestId('checkin-btn'));
  expect(onPress).toHaveBeenCalledTimes(2);         // count unchanged
});
