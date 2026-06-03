import * as SecureStore from 'expo-secure-store';

const ACCESS = 'sms_staff_access_token';
const REFRESH = 'sms_staff_refresh_token';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStore = {
  async save(tokens: Tokens): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS, tokens.accessToken);
      await SecureStore.setItemAsync(REFRESH, tokens.refreshToken);
    } catch (err) {
      // Avoid leaving a half-written token pair behind.
      await SecureStore.deleteItemAsync(ACCESS);
      await SecureStore.deleteItemAsync(REFRESH);
      throw err;
    }
  },
  async read(): Promise<Tokens | null> {
    const accessToken = await SecureStore.getItemAsync(ACCESS);
    const refreshToken = await SecureStore.getItemAsync(REFRESH);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};
