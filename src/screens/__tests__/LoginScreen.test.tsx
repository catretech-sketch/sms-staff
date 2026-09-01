import React from 'react';
import { fireEvent, waitFor, render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { LoginScreen } from '@/screens/LoginScreen';

function renderLogin() { return render(<AppProviders><LoginScreen /></AppProviders>); }

it('disables the send-OTP CTA for an invalid phone and enables for a valid one', async () => {
  const { getByTestId } = renderLogin();
  await waitFor(() => getByTestId('phone-input'));
  fireEvent.changeText(getByTestId('phone-input'), '123');
  expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(true);
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
});

it('switching to the Email tab swaps in an email field with its own validation', async () => {
  const { getByTestId } = renderLogin();
  await waitFor(() => getByTestId('channel-email'));
  fireEvent.press(getByTestId('channel-email'));
  await waitFor(() => getByTestId('email-input'));
  fireEvent.changeText(getByTestId('email-input'), 'not-an-email');
  expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(true);
  fireEvent.changeText(getByTestId('email-input'), 'ramesh@example.com');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
});

it('sending an OTP advances to the verification step', async () => {
  const { getByTestId, queryByTestId } = renderLogin();
  await waitFor(() => getByTestId('phone-input'));
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('login-cta'));
  await waitFor(() => getByTestId('otp-input'));
  expect(queryByTestId('verify-cta')).toBeTruthy();
});
