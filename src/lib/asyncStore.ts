import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStore = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Corrupt/non-JSON value: treat as absent so callers fall back to defaults.
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
