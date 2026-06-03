import { makeTheme } from '@/theme/colors';

describe('makeTheme', () => {
  it('light theme has the brand tokens from the handoff', () => {
    const t = makeTheme(false);
    expect(t.dark).toBe(false);
    expect(t.bg).toBe('#F2EEE4');
    expect(t.primary).toBe('#0E5C4A');
    expect(t.gold).toBe('#E7A92F');
    expect(t.ink).toBe('#15231E');
  });
  it('dark theme overrides bg and brightens primary', () => {
    const t = makeTheme(true);
    expect(t.dark).toBe(true);
    expect(t.bg).toBe('#0B1512');
    expect(t.primary).toBe('#33BF9F');
  });
  it('exposes RN shadow objects', () => {
    const t = makeTheme(false);
    expect(t.shadow.shadowOpacity).toBeGreaterThan(0);
    expect(typeof t.shadow.elevation).toBe('number');
  });
  it('light and dark themes expose identical keys', () => {
    expect(Object.keys(makeTheme(false)).sort()).toEqual(
      Object.keys(makeTheme(true)).sort(),
    );
  });
});
