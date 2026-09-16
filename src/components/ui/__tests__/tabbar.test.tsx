import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { TabBar } from '@/components/ui';

const state = { index: 0, routes: [{ key: 'Home', name: 'Home' }, { key: 'Leave', name: 'Leave' }, { key: 'Tasks', name: 'Tasks' }, { key: 'Me', name: 'Me' }] };
const descriptors = Object.fromEntries(state.routes.map(r => [r.key, { options: {} }]));

it('renders all 4 tabs with no center FAB', () => {
  const navigation = { navigate: jest.fn(), emit: () => ({ defaultPrevented: false }) };
  const { getByTestId, queryByTestId } = renderWithTheme(
    <TabBar state={state as any} navigation={navigation as any} descriptors={descriptors as any} />,
  );
  expect(getByTestId('tab-Home')).toBeTruthy();
  expect(getByTestId('tab-Me')).toBeTruthy();
  expect(queryByTestId('tab-fab')).toBeNull();
});

it('pressing a non-focused tab emits tabPress and navigates', () => {
  const navigate = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigation = { navigate, emit };
  const { getByTestId } = renderWithTheme(
    <TabBar state={state as any} navigation={navigation as any} descriptors={descriptors as any} />,
  );
  fireEvent.press(getByTestId('tab-Leave'));
  expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'tabPress', target: 'Leave' }));
  expect(navigate).toHaveBeenCalledWith('Leave');
});
