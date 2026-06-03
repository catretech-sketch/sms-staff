import { tokenStore } from '@/lib/tokenStore';

jest.mock('expo-secure-store', () => {
  let mem: Record<string, string> = {};
  return {
    setItemAsync: jest.fn((k: string, v: string) => {
      mem[k] = v;
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    deleteItemAsync: jest.fn((k: string) => {
      delete mem[k];
      return Promise.resolve();
    }),
  };
});

describe('tokenStore', () => {
  it('saves and reads tokens', async () => {
    await tokenStore.save({ accessToken: 'a', refreshToken: 'r' });
    expect(await tokenStore.read()).toEqual({ accessToken: 'a', refreshToken: 'r' });
  });
  it('clear() wipes tokens', async () => {
    await tokenStore.save({ accessToken: 'a', refreshToken: 'r' });
    await tokenStore.clear();
    expect(await tokenStore.read()).toBeNull();
  });
});
