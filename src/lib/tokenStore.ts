import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS = 'sms_staff_access_token';
const REFRESH = 'sms_staff_refresh_token';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// expo-secure-store ships no web implementation — its native module resolves to an
// empty object, so every SecureStore.*Async call throws on web. Fall back to
// AsyncStorage (localStorage) there so web builds can still authenticate. Native
// platforms keep using the encrypted SecureStore. Checked at call time so it stays
// trivially testable by overriding Platform.OS.
const onWeb = () => Platform.OS === 'web';
const getItem = (k: string) => (onWeb() ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k));
const setItem = (k: string, v: string) => (onWeb() ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v));
const deleteItem = (k: string) => (onWeb() ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k));

export const tokenStore = {
  async save(tokens: Tokens): Promise<void> {
    try {
      await setItem(ACCESS, tokens.accessToken);
      await setItem(REFRESH, tokens.refreshToken);
    } catch (err) {
      // Avoid leaving a half-written token pair behind.
      await deleteItem(ACCESS);
      await deleteItem(REFRESH);
      throw err;
    }
  },
  async read(): Promise<Tokens | null> {
    const accessToken = await getItem(ACCESS);
    const refreshToken = await getItem(REFRESH);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },
  async clear(): Promise<void> {
    await deleteItem(ACCESS);
    await deleteItem(REFRESH);
  },
};
