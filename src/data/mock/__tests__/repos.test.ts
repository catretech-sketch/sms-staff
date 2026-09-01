import { createStore } from '@/data/mock/store';
import { mockAuth } from '@/data/mock/auth.repo';
import { mockDashboard } from '@/data/mock/dashboard.repo';
import { mockAttendance } from '@/data/mock/attendance.repo';
import { AppError } from '@/lib/errors';

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

describe('mock repositories', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('requestOtp returns a challenge for the given identifier', async () => {
    const store = await createStore();
    const challenge = await mockAuth(store).requestOtp('98765 43210');
    expect(challenge.channel).toBe('sms');
    expect(challenge.destination).toBe('98765 43210');
  });

  it('requestOtp detects an email identifier', async () => {
    const store = await createStore();
    const challenge = await mockAuth(store).requestOtp('ramesh@example.com');
    expect(challenge.channel).toBe('email');
  });

  it('requestOtp rejects an empty identifier with AppError', async () => {
    const store = await createStore();
    await expect(mockAuth(store).requestOtp('')).rejects.toBeInstanceOf(AppError);
  });

  it('verifyOtp sets the chosen role and returns a session', async () => {
    const store = await createStore();
    const session = await mockAuth(store).verifyOtp('98765 43210', '123456', 'conductor');
    expect(session.user.roleKey).toBe('conductor');
    expect(session.user.dutyPost).toBe('Bus / Students');
    expect(session.tenant.name).toBe('Greenfield Public School');
  });

  it('verifyOtp rejects a malformed code with AppError', async () => {
    const store = await createStore();
    await expect(mockAuth(store).verifyOtp('98765 43210', '12', 'driver')).rejects.toBeInstanceOf(AppError);
  });

  it('login sets the chosen role and returns a session for a valid password', async () => {
    const store = await createStore();
    const session = await mockAuth(store).login('98765 43210', 'hunter2222', 'peon');
    expect(session.user.roleKey).toBe('peon');
    expect(session.tenant.name).toBe('Greenfield Public School');
  });

  it('login rejects a too-short password with invalid_credentials', async () => {
    const store = await createStore();
    await expect(mockAuth(store).login('98765 43210', 'short', 'peon')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
  });

  it('setPassword resolves for a valid password', async () => {
    const store = await createStore();
    await expect(mockAuth(store).setPassword('hunter2222')).resolves.toBeUndefined();
  });

  it('setPassword rejects a too-short password with weak_password', async () => {
    const store = await createStore();
    await expect(mockAuth(store).setPassword('short')).rejects.toMatchObject({ code: 'weak_password' });
  });

  it('dashboard returns the role card matching the logged-in role', async () => {
    const store = await createStore();
    await mockAuth(store).verifyOtp('98765 43210', '123456', 'guard');
    const dash = await mockDashboard(store).get();
    expect(dash.roleCard.kind).toBe('guard');
    expect(dash.hoursThisWeek).toBe(34);
    expect(dash.pendingTasksPeek.length).toBeGreaterThan(0);
  });

  it('dashboard result does not alias store-internal arrays', async () => {
    const store = await createStore();
    await mockAuth(store).verifyOtp('98765 43210', '123456', 'gardener');
    const dash1 = await mockDashboard(store).get();
    if (dash1.roleCard.kind === 'gardener') {
      dash1.roleCard.zones.push('Rooftop');
    }
    const dash2 = await mockDashboard(store).get();
    // The mutation to dash1 must not leak into a fresh read.
    if (dash2.roleCard.kind === 'gardener') {
      expect(dash2.roleCard.zones).not.toContain('Rooftop');
    }
  });

  it('checkIn flips state, records a log, and persists', async () => {
    const store = await createStore();
    const repo = mockAttendance(store);
    const after = await repo.checkIn('2026-06-03T08:00:00Z', true);
    expect(after.checkedIn).toBe(true);
    expect(after.checkInAt).toBe('2026-06-03T08:00:00Z');
    expect(after.lastLog[0]).toEqual({ at: '2026-06-03T08:00:00Z', kind: 'in', inZone: true });
    const store2 = await createStore();
    expect(store2.attendance.checkedIn).toBe(true);
  });

  it('checkOut clears checkedIn and logs an out event', async () => {
    const store = await createStore();
    const repo = mockAttendance(store);
    await repo.checkIn('2026-06-03T08:00:00Z', true);
    const after = await repo.checkOut('2026-06-03T15:30:00Z');
    expect(after.checkedIn).toBe(false);
    expect(after.checkInAt).toBeUndefined();
    expect(after.lastLog[0].kind).toBe('out');
  });
});
