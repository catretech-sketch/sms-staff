import { createHttpClient } from '@/lib/httpClient';
import { AppError } from '@/lib/errors';

describe('httpClient', () => {
  const getAuth = () => ({ accessToken: 'tok', tenantId: 'school1' });

  it('GET prepends base URL and attaches auth + tenant headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hello: 'world' }),
    });
    const http = createHttpClient({ baseUrl: 'https://api.test', getAuth, fetchImpl: fetchMock });
    const data = await http.get<{ hello: string }>('/ping');
    expect(data).toEqual({ hello: 'world' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/ping');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['X-Tenant-Id']).toBe('school1');
  });

  it('normalizes non-2xx into AppError', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ code: 'not_found', message: 'Missing' }),
    });
    const http = createHttpClient({ baseUrl: 'https://api.test', getAuth, fetchImpl: fetchMock });
    await expect(http.get('/missing')).rejects.toMatchObject({
      name: 'AppError',
      status: 404,
      code: 'not_found',
    });
    await expect(http.get('/missing')).rejects.toBeInstanceOf(AppError);
  });
});
