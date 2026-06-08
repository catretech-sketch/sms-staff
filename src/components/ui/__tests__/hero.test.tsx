// src/components/ui/__tests__/hero.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { HeroTodayCard } from '@/components/ui';

it('shows the check-in prompt and fires onPressCheckIn when not checked in', () => {
  const onPress = jest.fn();
  const { getByTestId } = renderWithTheme(
    <HeroTodayCard firstName="Ramesh" timing="7:30–3:30" dutyPostLabel="DUTY POST" dutyPost="Route 7" checkedIn={false} onPressCheckIn={onPress} />,
  );
  fireEvent.press(getByTestId('hero-checkin'));
  expect(onPress).toHaveBeenCalled();
});
