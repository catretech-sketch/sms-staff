import { httpAuth } from '@/data/http/auth.repo';
import { httpDashboard } from '@/data/http/dashboard.repo';
import { httpAttendance } from '@/data/http/attendance.repo';
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

const sessionDTO = {
  access_token: 'a', refresh_token: 'r',
  user: { id: 's1', name: 'R K', first_name: 'R', role_key: 'driver', emp_id: 'E', joined: '2020-01-01', rating: 4, duty_post: 'Bus / Route', shift: 'Morning Shift', timing: '7:30–3:30', phone: '1' },
  tenant: { id: 't1', name: 'School' },
};

describe('http repositories', () => {
  it('auth.login posts phone + role_key and maps the session', async () => {
    const { http, calls } = fakeHttp({ 'POST /auth/login': sessionDTO });
    const session = await httpAuth(http).login('98765 43210', 'driver');
    expect(session.accessToken).toBe('a');
    expect(session.user.roleKey).toBe('driver');
    expect(calls[0]).toEqual({ method: 'POST', path: '/auth/login', body: { phone: '98765 43210', role_key: 'driver' } });
  });

  it('dashboard.get fetches and maps', async () => {
    const { http } = fakeHttp({
      'GET /staff/dashboard': {
        hours_this_week: 34, hours_target: 44, streak_days: 21, leave_left: 12,
        role_card: { kind: 'driver', busNo: 'X', routeName: 'R7', licenseExpiresInDays: 24, fitnessOk: true },
        pending_tasks_peek: [], alert: 'Meeting',
      },
    });
    const d = await httpDashboard(http).get();
    expect(d.hoursThisWeek).toBe(34);
    expect(d.roleCard.kind).toBe('driver');
  });

  it('attendance.checkIn posts at + in_zone and maps the result', async () => {
    const { http, calls } = fakeHttp({
      'POST /staff/attendance/check-in': {
        checked_in: true, check_in_at: '2026-06-03T08:00:00Z', last_log: [], duty_post: 'Bus / Route', geofence_radius_m: 120,
      },
    });
    const a = await httpAttendance(http).checkIn('2026-06-03T08:00:00Z', true);
    expect(a.checkedIn).toBe(true);
    expect(calls[0]).toEqual({ method: 'POST', path: '/staff/attendance/check-in', body: { at: '2026-06-03T08:00:00Z', in_zone: true } });
  });
});
