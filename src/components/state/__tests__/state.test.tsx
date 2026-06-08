// src/components/state/__tests__/state.test.tsx
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '@/components/ui/testUtils';
import { ErrorState, EmptyState } from '@/components/state';

it('ErrorState fires onRetry', () => {
  const onRetry = jest.fn();
  const { getByText } = renderWithTheme(<ErrorState message="Boom" onRetry={onRetry} />);
  fireEvent.press(getByText('Retry'));
  expect(onRetry).toHaveBeenCalled();
});
it('EmptyState shows its message', () => {
  const { getByText } = renderWithTheme(<EmptyState message="Nothing here" />);
  expect(getByText('Nothing here')).toBeTruthy();
});
