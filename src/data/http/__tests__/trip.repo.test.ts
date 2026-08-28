import { httpTrip } from '@/data/http/trip.repo';
import type { HttpClient } from '@/lib/httpClient';

function fakeHttp(routes: Record<string, unknown>): { http: HttpClient; calls: Array<{ method: string; path: string; body?: unknown }> } {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const http: HttpClient = {
    get: <T>(path: string) => { calls.push({ method: 'GET', path }); return Promise.resolve(routes[`GET ${path}`] as T); },
    post: <T>(path: string, body?: unknown) => { calls.push({ method: 'POST', path, body }); return Promise.resolve(routes[`POST ${path}`] as T); },
    patch: <T>(path: string, body?: unknown) => { calls.push({ method: 'PATCH', path, body }); return Promise.resolve(routes[`PATCH ${path}`] as T); },
    delete: <T>(path: string) => { calls.push({ method: 'DELETE', path }); return Promise.resolve(routes[`DELETE ${path}`] as T); },
  };
  return { http, calls };
}

describe('httpTrip.publishPing', () => {
  // Backend binds this route to BulkPingRequest(IReadOnlyList<PingItem> Pings) — a flat
  // ping object with no "pings" wrapper fails model binding and is silently dropped.
  it('wraps the ping in a single-item pings array matching the backend BulkPingRequest contract', async () => {
    const { http, calls } = fakeHttp({ 'POST /staff/trips/t1/pings': undefined });
    await httpTrip(http).publishPing({
      tripId: 't1', lat: 12.9, lng: 77.6, speedKmh: 32, heading: 90, at: '2026-08-29T00:00:00Z',
    });
    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/staff/trips/t1/pings',
      body: { pings: [{ lat: 12.9, lng: 77.6, speed_kmh: 32, heading: 90, at: '2026-08-29T00:00:00Z' }] },
    });
  });
});
