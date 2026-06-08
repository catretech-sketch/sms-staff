// src/components/ui/__tests__/header.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { Header } from '@/components/ui';

it('renders school name and toggles theme', () => {
  const onToggle = jest.fn();
  const { getByText, getByLabelText } = renderWithTheme(
    <Header schoolName="Greenfield Public School" firstName="Ramesh" staffName="Ramesh Kumar" dark={false} onToggleTheme={onToggle} />,
  );
  expect(getByText('Greenfield Public School')).toBeTruthy();
  fireEvent.press(getByLabelText('sun'));   // sun shown in light mode -> tap to go dark
  expect(onToggle).toHaveBeenCalled();
});
