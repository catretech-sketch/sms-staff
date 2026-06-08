import React from 'react';
import { fireEvent, waitFor, render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { LoginScreen } from '@/screens/LoginScreen';

function renderLogin() { return render(<AppProviders><LoginScreen /></AppProviders>); }

it('disables CTA for an invalid phone and enables for a valid one', async () => {
  const { getByTestId } = renderLogin();
  // Wait for AppProviders async init (store setup) to complete and screen to render
  await waitFor(() => getByTestId('phone-input'));
  fireEvent.changeText(getByTestId('phone-input'), '123');
  expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(true);
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
});
