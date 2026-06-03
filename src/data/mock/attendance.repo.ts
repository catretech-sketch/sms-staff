import type { AttendanceRepository } from '@/data/repositories/types';
import type { Attendance } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = (a: Attendance): Attendance => ({ ...a, lastLog: a.lastLog.map((l) => ({ ...l })) });

export function mockAttendance(store: Store): AttendanceRepository {
  return {
    async status() {
      await simulateLatency();
      return clone(store.attendance);
    },
    async checkIn(at, inZone) {
      await simulateLatency();
      store.attendance = {
        ...store.attendance,
        checkedIn: true,
        checkInAt: at,
        lastLog: [{ at, kind: 'in', inZone }, ...store.attendance.lastLog],
      };
      await store.persistAttendance();
      return clone(store.attendance);
    },
    async checkOut(at) {
      await simulateLatency();
      store.attendance = {
        ...store.attendance,
        checkedIn: false,
        checkInAt: undefined,
        lastLog: [{ at, kind: 'out', inZone: true }, ...store.attendance.lastLog],
      };
      await store.persistAttendance();
      return clone(store.attendance);
    },
  };
}
