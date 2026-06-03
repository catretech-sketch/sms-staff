import { seed, dutyPostByRole } from '@/data/mock/seed';
import { ROLE_KEYS } from '@/theme/roles';

describe('seed', () => {
  it('seeds Ramesh Kumar at Greenfield Public School', () => {
    expect(seed.staff.name).toBe('Ramesh Kumar');
    expect(seed.staff.firstName).toBe('Ramesh');
    expect(seed.tenant.name).toBe('Greenfield Public School');
  });
  it('has a role card for every role, with matching kind', () => {
    ROLE_KEYS.forEach((k) => {
      expect(seed.roleCards[k].kind).toBe(k);
    });
  });
  it('has a duty-post label for every role', () => {
    ROLE_KEYS.forEach((k) => {
      expect(typeof dutyPostByRole[k]).toBe('string');
      expect(dutyPostByRole[k].length).toBeGreaterThan(0);
    });
  });
  it('starts not checked in', () => {
    expect(seed.attendance.checkedIn).toBe(false);
    expect(seed.attendance.lastLog).toEqual([]);
  });
});
