import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { TextField } from '@/components/ui/TextField';

function renderField(secureTextEntry: boolean) {
  const onChangeText = jest.fn();
  const utils = render(
    <AppProviders>
      <TextField
        testID="pw"
        value="hunter2222"
        onChangeText={onChangeText}
        accent="#000"
        icon="lock"
        placeholder="Password"
        secureTextEntry={secureTextEntry}
      />
    </AppProviders>,
  );
  return utils;
}

it('masks the value by default when secureTextEntry is set', async () => {
  const { getByTestId } = renderField(true);
  await waitFor(() => getByTestId('pw'));
  expect(getByTestId('pw').props.secureTextEntry).toBe(true);
});

it('does not render a toggle when secureTextEntry is not set', async () => {
  const { queryByTestId } = renderField(false);
  await waitFor(() => queryByTestId('pw'));
  expect(queryByTestId('pw-toggle')).toBeNull();
});

it('tapping the toggle reveals then re-masks the value', async () => {
  const { getByTestId } = renderField(true);
  await waitFor(() => getByTestId('pw'));
  expect(getByTestId('pw').props.secureTextEntry).toBe(true);
  fireEvent.press(getByTestId('pw-toggle'));
  expect(getByTestId('pw').props.secureTextEntry).toBe(false);
  fireEvent.press(getByTestId('pw-toggle'));
  expect(getByTestId('pw').props.secureTextEntry).toBe(true);
});
