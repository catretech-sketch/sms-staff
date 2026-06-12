import { asyncStore } from '@/lib/asyncStore';
import { seed, dutyPostByRole } from './seed';
import type { Session, Attendance, Boarding, Trip, TripPing, Task, LeaveSummary, Profile } from '@/data/domain';
import type { Role } from '@/theme/roles';

const KEY = 'sms.mock.';

export interface Store {
  session: Session;
  attendance: Attendance;
  dashboardBase: typeof seed.dashboardBase;
  roleCards: typeof seed.roleCards;
  tasksPeek: typeof seed.tasksPeek;
  route: typeof seed.route;
  students: typeof seed.students;
  conductorName: string;
  currentTrip: Trip | null;
  boarding: Boarding[];
  pings: TripPing[];
  tasks: Task[];
  leave: LeaveSummary;
  profile: Profile;
  persistAttendance(): Promise<void>;
  persistLeave(): Promise<void>;
  persistRole(): Promise<void>;
  persistTrip(): Promise<void>;
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
  const currentTrip = (await asyncStore.get<Trip | null>(`${KEY}trip`)) ?? clone(seed.currentTrip);
  const boarding = (await asyncStore.get<Boarding[]>(`${KEY}boarding`)) ?? clone(seed.boarding);
  const leave = (await asyncStore.get<LeaveSummary>(`${KEY}leave`)) ?? clone(seed.leaveSummary);
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
    route: clone(seed.route),
    students: clone(seed.students),
    conductorName: seed.conductorName,
    currentTrip,
    boarding,
    pings: [],
    tasks: clone(seed.tasks),
    leave,
    profile: clone(seed.profile),
    async persistTrip() {
      await asyncStore.set(`${KEY}trip`, store.currentTrip);
      await asyncStore.set(`${KEY}boarding`, store.boarding);
    },
    async persistAttendance() {
      await asyncStore.set(`${KEY}attendance`, store.attendance);
    },
    async persistLeave() {
      await asyncStore.set(`${KEY}leave`, store.leave);
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
