// src/components/ui/__tests__/stattrio.test.tsx
import React from 'react';
import { renderWithTheme } from '../testUtils';
import { StatTrio } from '@/components/ui';

it('renders hours, streak, and leave numbers', () => {
  const { getByText } = renderWithTheme(
    <StatTrio hoursThisWeek={34} hoursTarget={44} streakDays={21} leaveLeft={12} />,
  );
  expect(getByText('34')).toBeTruthy();
  expect(getByText(/21/)).toBeTruthy();
  expect(getByText(/12/)).toBeTruthy();
});
