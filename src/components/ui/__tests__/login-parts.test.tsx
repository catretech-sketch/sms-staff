import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { RoleGrid } from '@/components/ui';

it('RoleGrid selects a role', () => {
  const onSelect = jest.fn();
  const { getByTestId } = renderWithTheme(<RoleGrid selected="driver" onSelect={onSelect} />);
  fireEvent.press(getByTestId('role-cook'));
  expect(onSelect).toHaveBeenCalledWith('cook');
});
