import { env } from '@/config/env';

describe('env', () => {
  it('defaults DATA_SOURCE to mock', () => {
    expect(env.DATA_SOURCE).toBe('mock');
  });
  it('exposes the documented API base URL fallback', () => {
    expect(env.API_BASE_URL).toBe('https://api.schoolmate.local');
  });
});
