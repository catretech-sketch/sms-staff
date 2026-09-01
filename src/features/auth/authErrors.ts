import { AppError } from '@/lib/errors';

const MESSAGES: Record<string, string> = {
  not_registered: "This mobile or email isn't registered.",
  invalid_code: 'Code is invalid or expired.',
};

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

/** Maps an unknown error (usually an AppError from httpClient) to user-facing copy. */
export function authErrorMessage(err: unknown, fallback: string = DEFAULT_FALLBACK): string {
  if (err instanceof AppError) {
    if (err.status === 0) {
      return 'Cannot reach the server. Please check your connection and try again.';
    }
    if (err.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return MESSAGES[err.code] ?? err.message ?? fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
