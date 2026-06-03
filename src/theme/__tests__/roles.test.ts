import { ROLES, ROLE_KEYS, type Role } from '@/theme/roles';

describe('ROLES', () => {
  it('defines all 7 roles', () => {
    expect(ROLE_KEYS).toEqual([
      'driver', 'cook', 'guard', 'gardener', 'sweeper', 'peon', 'clerk',
    ]);
  });
  it('each role has accent, icon, dutyPost label key, and a card kind', () => {
    (ROLE_KEYS as readonly Role[]).forEach((k) => {
      const r = ROLES[k];
      expect(r.key).toBe(k);
      expect(r.accent).toMatch(/^#/);
      expect(r.accentSoft).toMatch(/^#/);
      expect(typeof r.icon).toBe('string');
      expect(typeof r.labelKey).toBe('string');
      expect(typeof r.dutyPostLabelKey).toBe('string');
      expect(r.roleCardKind).toBe(k);
    });
  });
  it('driver uses the handoff accent', () => {
    expect(ROLES.driver.accent).toBe('#E08A3C');
  });
});
