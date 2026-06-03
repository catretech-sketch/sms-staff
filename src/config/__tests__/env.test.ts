import { env } from '@/config/env';

describe('env', () => {
  it('defaults DATA_SOURCE to mock', () => {
    expect(env.DATA_SOURCE).toBe('mock');
  });
  it('exposes an API base URL string', () => {
    expect(typeof env.API_BASE_URL).toBe('string');
    expect(env.API_BASE_URL.length).toBeGreaterThan(0);
  });
});
