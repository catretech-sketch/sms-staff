import { authSnapshot } from '@/lib/authSnapshot';

describe('authSnapshot', () => {
  afterEach(() => authSnapshot.clear());

  it('defaults to nulls', () => {
    expect(authSnapshot.get()).toEqual({ accessToken: null, tenantId: null });
  });
  it('set then get returns the snapshot', () => {
    authSnapshot.set({ accessToken: 'tok', tenantId: 'school1' });
    expect(authSnapshot.get()).toEqual({ accessToken: 'tok', tenantId: 'school1' });
  });
  it('clear resets to nulls', () => {
    authSnapshot.set({ accessToken: 'tok', tenantId: 'school1' });
    authSnapshot.clear();
    expect(authSnapshot.get()).toEqual({ accessToken: null, tenantId: null });
  });
});
