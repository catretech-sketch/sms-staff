import { httpRouteGeometry } from '@/data/http/routeGeometry.repo';
import type { HttpClient } from '@/lib/httpClient';

function fakeHttp(routes: Record<string, unknown>): { http: HttpClient; calls: Array<{ method: string; path: string }> } {
  const calls: Array<{ method: string; path: string }> = [];
  const http: HttpClient = {
    get: <T>(path: string) => { calls.push({ method: 'GET', path }); return Promise.resolve(routes[`GET ${path}`] as T); },
    post: <T>(path: string) => Promise.resolve(undefined as T),
    patch: <T>(path: string) => Promise.resolve(undefined as T),
    delete: <T>(path: string) => Promise.resolve(undefined as T),
  };
  return { http, calls };
}

describe('httpRouteGeometry', () => {
  it('gets route geometry for a route id', async () => {
    const { http, calls } = fakeHttp({
      'GET /transport/routes/r1/geometry': {
        route_id: 'r1', status: 'available', format: 'google-encoded-polyline',
        geometry: 'abc', distance_meters: 100, duration_seconds: 10,
        stop_sequence_hash: 'h', generated_at: '2026-09-19T10:00:00Z',
      },
    });
    const result = await httpRouteGeometry(http).get('r1');
    expect(calls[0]).toEqual({ method: 'GET', path: '/transport/routes/r1/geometry' });
    expect(result).toEqual({
      routeId: 'r1', status: 'available', format: 'google-encoded-polyline',
      geometry: 'abc', distanceMeters: 100, durationSeconds: 10,
      stopSequenceHash: 'h', generatedAt: '2026-09-19T10:00:00Z',
    });
  });

  it('maps an unavailable response with null fields', async () => {
    const { http } = fakeHttp({
      'GET /transport/routes/r2/geometry': {
        route_id: 'r2', status: 'unavailable', format: null,
        geometry: null, distance_meters: null, duration_seconds: null,
        stop_sequence_hash: 'h2', generated_at: null,
      },
    });
    const result = await httpRouteGeometry(http).get('r2');
    expect(result.status).toBe('unavailable');
    expect(result.geometry).toBeNull();
  });
});
