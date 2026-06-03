import { AppError, isAppError, toAppError } from '@/lib/errors';

describe('AppError', () => {
  it('constructs with code, status, message', () => {
    const e = new AppError('not_found', 404, 'Missing');
    expect(e.code).toBe('not_found');
    expect(e.status).toBe(404);
    expect(e.message).toBe('Missing');
    expect(e).toBeInstanceOf(Error);
  });

  it('isAppError narrows AppError instances', () => {
    expect(isAppError(new AppError('x', 0, 'y'))).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('toAppError passes through AppError and wraps unknowns', () => {
    const original = new AppError('a', 1, 'b');
    expect(toAppError(original)).toBe(original);
    const wrapped = toAppError(new Error('boom'));
    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.code).toBe('unknown');
    expect(wrapped.message).toBe('boom');
  });
});
