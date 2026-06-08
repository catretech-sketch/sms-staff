import { Platform } from 'react-native';
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
    __reset: () => {
      mem = {};
    },
  };
});

beforeEach(() => {
  const SecureStore = require('expo-secure-store');
  // Clear in-memory store between tests so they are isolated.
  SecureStore.__reset();
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
  it('rolls back when the second write fails', async () => {
    const SecureStore = require('expo-secure-store');
    (SecureStore.setItemAsync as jest.Mock)
      .mockImplementationOnce((_k: string, _v: string) => Promise.resolve()) // access ok
      .mockImplementationOnce(() => Promise.reject(new Error('keychain locked'))); // refresh fails
    await expect(tokenStore.save({ accessToken: 'a', refreshToken: 'r' })).rejects.toThrow('keychain locked');
    expect(await tokenStore.read()).toBeNull();
  });

  it('falls back to AsyncStorage on web (SecureStore has no web impl)', async () => {
    const SecureStore = require('expo-secure-store');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.clear();
    (SecureStore.getItemAsync as jest.Mock).mockClear();
    (SecureStore.setItemAsync as jest.Mock).mockClear();
    const orig = Platform.OS;
    (Platform as unknown as { OS: string }).OS = 'web';
    try {
      await tokenStore.save({ accessToken: 'wa', refreshToken: 'wr' });
      expect(await tokenStore.read()).toEqual({ accessToken: 'wa', refreshToken: 'wr' });
      await tokenStore.clear();
      expect(await tokenStore.read()).toBeNull();
      // Web must NOT touch SecureStore (it throws there).
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    } finally {
      (Platform as unknown as { OS: string }).OS = orig;
    }
  });
});
