import { asyncStore } from '@/lib/asyncStore';
import { seed, dutyPostByRole } from './seed';
import type { Session, Attendance } from '@/data/domain';
import type { Role } from '@/theme/roles';

const KEY = 'sms.mock.';

export interface Store {
  session: Session;
  attendance: Attendance;
  dashboardBase: typeof seed.dashboardBase;
  roleCards: typeof seed.roleCards;
  tasksPeek: typeof seed.tasksPeek;
  persistAttendance(): Promise<void>;
  persistRole(): Promise<void>;
  genId(prefix: string): string;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export async function createStore(): Promise<Store> {
  const staff = clone(seed.staff);
  const savedRole = await asyncStore.get<Role>(`${KEY}role`);
  if (savedRole && dutyPostByRole[savedRole]) {
    staff.roleKey = savedRole;
    staff.dutyPost = dutyPostByRole[savedRole];
  }
  const attendance = (await asyncStore.get<Attendance>(`${KEY}attendance`)) ?? clone(seed.attendance);
  let counter = 0;

  const store: Store = {
    session: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: staff,
      tenant: clone(seed.tenant),
    },
    attendance,
    dashboardBase: clone(seed.dashboardBase),
    roleCards: clone(seed.roleCards),
    tasksPeek: clone(seed.tasksPeek),
    async persistAttendance() {
      await asyncStore.set(`${KEY}attendance`, store.attendance);
    },
    async persistRole() {
      await asyncStore.set(`${KEY}role`, store.session.user.roleKey);
    },
    genId(prefix) {
      counter += 1;
      return `${prefix}_${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };
  return store;
}
