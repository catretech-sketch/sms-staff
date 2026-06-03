import { createStore } from '@/data/mock/store';
import { createMockRepositories, createHttpRepositories } from '@/data/repositories/factory';
import type { HttpClient } from '@/lib/httpClient';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

function fixtureHttp(): HttpClient {
  const sessionDTO = {
    access_token: 'mock-access-token', refresh_token: 'mock-refresh-token',
    user: { id: 'staff_ramesh', name: 'Ramesh Kumar', first_name: 'Ramesh', role_key: 'driver', emp_id: 'EMP-2041', joined: '2019-06-12', rating: 4.6, duty_post: 'Bus / Route', shift: 'Morning Shift', timing: '7:30–3:30', phone: '98765 43210' },
    tenant: { id: 'school_greenfield', name: 'Greenfield Public School' },
  };
  const attendanceDTO = { checked_in: false, last_log: [], duty_post: 'Bus / Route', geofence_radius_m: 120 };
  const routes: Record<string, unknown> = {
    'POST /staff/auth/login': sessionDTO,
    'GET /staff/attendance': attendanceDTO,
  };
  return {
    get: <T>(path: string) => Promise.resolve(routes[`GET ${path}`] as T),
    post: <T>(path: string) => Promise.resolve(routes[`POST ${path}`] as T),
    patch: <T>() => Promise.resolve(undefined as T),
    delete: <T>() => Promise.resolve(undefined as T),
  };
}

const keys = (o: object) => Object.keys(o).sort();

describe('mock <-> http contract', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('login returns the same Session shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = await mock.auth.login('98765 43210', 'driver');
    const b = await http.auth.login('98765 43210', 'driver');
    expect(keys(a)).toEqual(keys(b));
    expect(keys(a.user)).toEqual(keys(b.user));
    expect(keys(a.tenant)).toEqual(keys(b.tenant));
    expect(a.user.roleKey).toBe(b.user.roleKey);
    expect(a.tenant.name).toBe(b.tenant.name);
  });

  it('attendance.status returns the same Attendance shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = await mock.attendance.status();
    const b = await http.attendance.status();
    expect(keys(a)).toEqual(keys(b));
    expect(a.checkedIn).toBe(b.checkedIn);
    expect(a.geofenceRadiusM).toBe(b.geofenceRadiusM);
  });
});
