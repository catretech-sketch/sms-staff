import type { Role } from '@/theme/roles';
import type { Staff, Tenant, RoleCard, TaskPeek, Attendance, Route, StudentLite, Boarding, Trip, Task, LeaveSummary } from '@/data/domain';

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

const route: Route = {
  id: 'route_7',
  name: 'Route 7',
  assignedBusNo: 'HR-26-BX-4412',
  stops: [
    { id: 'stop_1', name: 'School Gate', lat: 28.4595, lng: 77.0266, seq: 0 },
    { id: 'stop_2', name: 'Sector 12', lat: 28.4660, lng: 77.0410, seq: 1, etaMin: 6 },
    { id: 'stop_3', name: 'Sector 15 Market', lat: 28.4712, lng: 77.0525, seq: 2, etaMin: 12 },
    { id: 'stop_4', name: 'Green Park', lat: 28.4781, lng: 77.0648, seq: 3, etaMin: 18 },
    { id: 'stop_5', name: 'Rail Vihar', lat: 28.4850, lng: 77.0770, seq: 4, etaMin: 24 },
    { id: 'stop_6', name: 'Civil Lines', lat: 28.4925, lng: 77.0890, seq: 5, etaMin: 30 },
  ],
};

const students: StudentLite[] = [
  { id: 'stu_1', name: 'Aarav Sharma', stopId: 'stop_2' },
  { id: 'stu_2', name: 'Diya Gupta', stopId: 'stop_2' },
  { id: 'stu_3', name: 'Kabir Singh', stopId: 'stop_3' },
  { id: 'stu_4', name: 'Anaya Verma', stopId: 'stop_3' },
  { id: 'stu_5', name: 'Vivaan Mehta', stopId: 'stop_4' },
  { id: 'stu_6', name: 'Myra Reddy', stopId: 'stop_5' },
];

const conductorName = 'Sita Devi';
const currentTrip: Trip | null = null;
const boarding: Boarding[] = [];

const leaveSummary: LeaveSummary = {
  balances: [
    { type: 'casual', total: 12, used: 4 },
    { type: 'sick', total: 8, used: 1 },
    { type: 'earned', total: 15, used: 6 },
  ],
  requests: [
    { id: 'lv_1', type: 'casual', fromDate: '2026-05-20', toDate: '2026-05-21', reason: 'Family function', status: 'approved' },
  ],
};

const tasks: Task[] = [
  { id: 'task_1', title: 'Pre-trip bus inspection', priority: 'urgent', done: false, dueLabel: 'Today 7:00 AM' },
  { id: 'task_2', title: 'Submit trip log sheet', priority: 'normal', done: false, dueLabel: 'Today 4:00 PM' },
  { id: 'task_3', title: 'Refuel at depot', priority: 'normal', done: true, dueLabel: 'Yesterday' },
];

export interface SeedShape {
  staff: Staff;
  tenant: Tenant;
  roleCards: Record<Role, RoleCard>;
  tasksPeek: TaskPeek[];
  dashboardBase: typeof dashboardBase;
  attendance: Attendance;
  route: Route;
  students: StudentLite[];
  conductorName: string;
  currentTrip: Trip | null;
  boarding: Boarding[];
  tasks: Task[];
  leaveSummary: LeaveSummary;
}

export const seed: SeedShape = {
  staff, tenant, roleCards, tasksPeek, dashboardBase, attendance,
  route, students, conductorName, currentTrip, boarding, tasks, leaveSummary,
};
