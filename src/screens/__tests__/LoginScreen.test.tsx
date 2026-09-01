import React from 'react';
import { fireEvent, waitFor, render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { LoginScreen } from '@/screens/LoginScreen';

function renderLogin() { return render(<AppProviders><LoginScreen /></AppProviders>); }

it('password login is the default mode: phone + password fields, CTA disabled until both are valid', async () => {
  const { getByTestId } = renderLogin();
  await waitFor(() => getByTestId('phone-input'));
  expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(true);
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  fireEvent.changeText(getByTestId('password-input'), 'hunter2222');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
});

it('switching to the Email tab swaps in an email field with its own validation', async () => {
  const { getByTestId } = renderLogin();
  await waitFor(() => getByTestId('channel-email'));
  fireEvent.press(getByTestId('channel-email'));
  await waitFor(() => getByTestId('email-input'));
  fireEvent.changeText(getByTestId('email-input'), 'not-an-email');
  fireEvent.changeText(getByTestId('password-input'), 'hunter2222');
  expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(true);
  fireEvent.changeText(getByTestId('email-input'), 'ramesh@example.com');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
});

it('tapping "first time / forgot password" enters the OTP flow', async () => {
  const { getByTestId, queryByTestId } = renderLogin();
  await waitFor(() => getByTestId('first-time-link'));
  fireEvent.press(getByTestId('first-time-link'));
  await waitFor(() => getByTestId('send-otp-cta'));
  expect(queryByTestId('password-input')).toBeNull();
});

it('sending an OTP from the setup flow advances to the verification step', async () => {
  const { getByTestId, queryByTestId } = renderLogin();
  await waitFor(() => getByTestId('first-time-link'));
  fireEvent.press(getByTestId('first-time-link'));
  await waitFor(() => getByTestId('phone-input'));
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  await waitFor(() => expect(getByTestId('send-otp-cta').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('send-otp-cta'));
  await waitFor(() => getByTestId('otp-input'));
  expect(queryByTestId('verify-cta')).toBeTruthy();
});

it('verifying the OTP in the setup flow shows the Set Password screen instead of logging in', async () => {
  const { getByTestId } = renderLogin();
  await waitFor(() => getByTestId('first-time-link'));
  fireEvent.press(getByTestId('first-time-link'));
  await waitFor(() => getByTestId('phone-input'));
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  await waitFor(() => expect(getByTestId('send-otp-cta').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('send-otp-cta'));
  await waitFor(() => getByTestId('otp-input'));
  fireEvent.changeText(getByTestId('otp-input'), '123456');
  fireEvent.press(getByTestId('verify-cta'));
  await waitFor(() => getByTestId('set-password-new-input'));
});
