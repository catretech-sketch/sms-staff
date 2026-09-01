import { authErrorMessage } from '@/features/auth/authErrors';
import { AppError } from '@/lib/errors';

describe('authErrorMessage — new password-flow codes', () => {
  it.each([
    ['password_not_set', "You haven't set a password yet.", 'server message'],
    ['invalid_credentials', 'Incorrect email/phone or password.', 'server message'],
    ['wrong_role', 'This account is not registered for that role.', ''],
    ['access_removed', 'Your access to this school has been removed by the admin.', ''],
    ['access_inactive', 'Your access to this school has been deactivated by the admin.', ''],
    ['weak_password', 'Password must be at least 8 characters.', 'server message'],
  ])('maps %s', (code, expected, message) => {
    expect(authErrorMessage(new AppError(code, 401, message))).toBe(expected);
  });

  it('falls back to the server message for wrong_role/access_* when the backend supplies custom copy', () => {
    // Backend sends role/admin-specific wording for these three; prefer it over the static map.
    const err = new AppError('wrong_role', 403, 'Use the Guard tab to sign in.');
    expect(authErrorMessage(err)).toBe('Use the Guard tab to sign in.');
  });
});
