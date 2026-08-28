export type DataSource = 'mock' | 'live';

/**
 * Mock DATA_SOURCE (AsyncStorage business SoT) is development-only.
 * Production / release builds always use live HTTP repositories so mock
 * persistAttendance / persistTrip / persistLeave cannot ship as SoT.
 */
function resolveDataSource(): DataSource {
  const isDev =
    (typeof __DEV__ !== 'undefined' && __DEV__) ||
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test';
  if (!isDev) return 'live';
  return process.env.EXPO_PUBLIC_DATA_SOURCE === 'live' ? 'live' : 'mock';
}

const DATA_SOURCE: DataSource = resolveDataSource();

export const env = {
  DATA_SOURCE,
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.schoolmate.local',
} as const;
