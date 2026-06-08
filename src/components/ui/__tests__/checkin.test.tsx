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
  expect(onPress).toHaveBeenCalledTimes(1);
});
