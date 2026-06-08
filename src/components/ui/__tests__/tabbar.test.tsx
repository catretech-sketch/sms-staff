import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { TabBar } from '@/components/ui';

const state = { index: 0, routes: [{ key: 'Home', name: 'Home' }, { key: 'Roster', name: 'Roster' }, { key: 'Tasks', name: 'Tasks' }, { key: 'Me', name: 'Me' }] };
const descriptors = Object.fromEntries(state.routes.map(r => [r.key, { options: {} }]));

it('fires the center FAB', () => {
  const onPressFab = jest.fn();
  const navigation = { navigate: jest.fn(), emit: () => ({ defaultPrevented: false }) };
  const { getByTestId } = renderWithTheme(<TabBar state={state as any} navigation={navigation as any} descriptors={descriptors as any} onPressFab={onPressFab} />);
  fireEvent.press(getByTestId('tab-fab'));
  expect(onPressFab).toHaveBeenCalled();
});

it('pressing a non-focused tab emits tabPress and navigates', () => {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigation = { navigate, emit };
  const { getByTestId } = renderWithTheme(
    <TabBar state={state as any} navigation={navigation as any} descriptors={descriptors as any} onPressFab={jest.fn()} />,
  );
  fireEvent.press(getByTestId('tab-Roster'));
  expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'tabPress', target: 'Roster' }));
  expect(navigate).toHaveBeenCalledWith('Roster');
});
