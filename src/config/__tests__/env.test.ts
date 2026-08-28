import { env } from '@/config/env';

describe('env', () => {
  // Dev/test default is mock; production builds force live (see resolveDataSource in env.ts).
  it('defaults DATA_SOURCE to mock in development/test', () => {
    expect(env.DATA_SOURCE).toBe('mock');
  });
  it('exposes the documented API base URL fallback', () => {
    expect(env.API_BASE_URL).toBe('https://api.schoolmate.local');
  });
});
