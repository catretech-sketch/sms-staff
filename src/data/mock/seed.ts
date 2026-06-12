import type { Role } from '@/theme/roles';
import type { Staff, Tenant, RoleCard, TaskPeek, Attendance } from '@/data/domain';

export const dutyPostByRole: Record<Role, string> = {
  driver: 'Bus / Route',
  conductor: 'Bus / Students',
  sweeper: 'Block / Area',
  gardener: 'Grounds / Zone',
  guard: 'Gate / Post',
  peon: 'Office / Desk',
};

const tenant: Tenant = {
  id: 'school_greenfield',
  name: 'Greenfield Public School',
};

const staff: Staff = {
  id: 'staff_ramesh',
  name: 'Ramesh Kumar',
  firstName: 'Ramesh',
  roleKey: 'driver',
  empId: 'EMP-2041',
  joined: '2019-06-12',
  rating: 4.6,
  dutyPost: dutyPostByRole.driver,
  shift: 'Morning Shift',
  timing: '7:30–3:30',
  phone: '98765 43210',
};

const roleCards: Record<Role, RoleCard> = {
  driver: { kind: 'driver', busNo: 'HR-26-BX-4412', routeName: 'Route 7', licenseExpiresInDays: 24, fitnessOk: true },
  conductor: { kind: 'conductor', routeName: 'Route 7', onBoard: 18, capacity: 24, nextStop: 'Sector 12' },
  sweeper: { kind: 'sweeper', blocks: ['Block A', 'Block B'], suppliesLow: ['Phenyl'] },
  gardener: { kind: 'gardener', zones: ['Front lawn', 'Playground'], wateringDue: 2 },
  guard: { kind: 'guard', gate: 'Main Gate', roundsDone: 3, roundsTotal: 6, visitorsToday: 14 },
  peon: { kind: 'peon', errands: 4, bellDuty: true },
};

const tasksPeek: TaskPeek[] = [
  { id: 'task_1', title: 'Pre-trip bus inspection', priority: 'urgent', done: false },
  { id: 'task_2', title: 'Submit trip log sheet', priority: 'normal', done: false },
];

const dashboardBase = {
  hoursThisWeek: 34,
  hoursTarget: 44,
  streakDays: 21,
  leaveLeft: 12,
  alert: 'Staff meeting at 4:00 PM',
};

const attendance: Attendance = {
  checkedIn: false,
  lastLog: [],
  dutyPost: dutyPostByRole.driver,
  geofenceRadiusM: 120,
};

export interface SeedShape {
  staff: Staff;
  tenant: Tenant;
  roleCards: Record<Role, RoleCard>;
  tasksPeek: TaskPeek[];
  dashboardBase: typeof dashboardBase;
  attendance: Attendance;
}

export const seed: SeedShape = { staff, tenant, roleCards, tasksPeek, dashboardBase, attendance };
