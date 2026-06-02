# SchoolMate Staff — Plan 1: Scaffold & Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the SchoolMate Staff Expo app with all infrastructure — config, lib utilities, light/dark + role-aware theme, fonts, i18n, navigation skeleton with stub screens, and providers — so the app boots and is ready for the data layer (Plan 2) and screens (Plans 3–4).

**Architecture:** Mirror `sms-teacher-app` conventions (Expo SDK 54, React 19, RN 0.81, TS, `@/` path aliases, feature-folder layout). Unlike the teacher app's static light-only `Colors`, the staff app needs **light + dark + 7 role accents**, so theme is delivered through a `ThemeProvider` exposing `makeTheme(dark)` tokens + the role config. Auth/data are stubbed this plan (Plan 2 replaces the stub gate with the real `AuthProvider`).

**Tech Stack:** Expo ~54, React 19, React Native 0.81, TypeScript ~5.9, `@react-navigation` (native-stack + bottom-tabs), `@tanstack/react-query`, `react-i18next`/`i18next`, `expo-font` + `@expo-google-fonts/sora` + `@expo-google-fonts/manrope`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `react-native-svg`, `expo-linear-gradient`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-location`, `zod`. Dev: `jest`, `jest-expo`, `@testing-library/react-native`.

**Design reference (in-repo source of truth):** `docs/design-handoff/` — exact tokens in `app/theme.jsx`, the full 4-language dictionary in `app/i18n.jsx`, icon path data in `app/icons.jsx`.

---

## File Structure (this plan)

```
sms-staff/
  App.tsx                          # fonts + providers + navigation root
  index.ts                         # registerRootComponent
  app.json                         # Expo config (name, slug, plugins)
  package.json tsconfig.json babel.config.js
  eslint.config.js .prettierrc jest.config.js jest.setup.js
  src/
    config/env.ts                  # DATA_SOURCE flag, API_BASE_URL
    lib/
      errors.ts                    # AppError, isAppError, toAppError
      latency.ts                   # simulateLatency, maybeFail
      asyncStore.ts                # AsyncStorage JSON get/set/remove
      tokenStore.ts                # SecureStore access/refresh tokens
      httpClient.ts                # fetch wrapper (base URL, auth+tenant headers, error normalize)
      queryClient.ts               # TanStack Query client + key helpers
    theme/
      colors.ts                    # makeTheme(dark) -> ThemeColors (light+dark tables)
      roles.ts                     # Role type, ROLES config (accent/icon/dutyPost/roleCardKind)
      typography.ts                # Sora + Manrope font families + text style factory
      ThemeProvider.tsx            # ThemeContext, ThemeProvider, useTheme()
      index.ts                     # re-exports
    i18n/
      index.ts                     # i18next init + helpers
      resources/en.json            # English (starter keys; full port from handoff)
      resources/hi.json mr.json ta.json
    navigation/
      types.ts                     # RootStackParamList, MainTabParamList
      MainTabNavigator.tsx         # Home/Roster/Tasks/Me tab stubs + center FAB placeholder
      RootNavigator.tsx            # temporary local auth gate (replaced in Plan 2)
    screens/
      stubs/StubScreen.tsx         # reusable "Coming soon" placeholder
      LoginScreen.tsx              # stub this plan (real login in Plan 3)
      HomeScreen.tsx RosterScreen.tsx TasksScreen.tsx
      ProfileScreen.tsx AttendanceScreen.tsx   # stubs this plan
    providers/AppProviders.tsx     # QueryClient + I18n + Theme (Auth/Repo added in Plan 2)
```

---

## Task 1: Initialize the Expo project

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `index.ts`, `App.tsx`

- [ ] **Step 1: Scaffold a blank TypeScript Expo app into the current (empty) repo**

The repo at `D:\SMS\sms-project\sms-staff` already has `.git` and `.gitignore`. Create the Expo app in a temp dir and copy generated files in (avoids the "directory not empty" prompt), then install.

Run (PowerShell, from the project root):
```powershell
npx create-expo-app@latest .temp-init --template blank-typescript --no-install
Copy-Item -Path .temp-init\* -Destination . -Recurse -Force
Copy-Item -Path .temp-init\.gitignore -Destination .gitignore-expo -Force
Remove-Item -Recurse -Force .temp-init
```
Expected: `App.tsx`, `app.json`, `package.json`, `tsconfig.json`, `index.ts`/`index.js` now exist in the project root. (Keep our existing `.gitignore`; discard `.gitignore-expo`.)

- [ ] **Step 2: Pin dependencies to the teacher app's versions**

Replace `package.json` `dependencies`/`devDependencies`/`scripts` with the block below (matches `sms-teacher-app` so all three apps share versions), keeping `"name": "schoolmate-staff-app"`, `"main": "index.ts"`, `"private": true`:

```json
{
  "name": "schoolmate-staff-app",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint .",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@expo-google-fonts/manrope": "^0.4.2",
    "@expo-google-fonts/sora": "^0.4.2",
    "@expo/metro-runtime": "~6.1.2",
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-navigation/bottom-tabs": "^7.15.10",
    "@react-navigation/native": "^7.2.2",
    "@react-navigation/native-stack": "^7.14.12",
    "@tanstack/react-query": "^5.100.14",
    "babel-preset-expo": "~54.0.10",
    "expo": "~54.0.33",
    "expo-font": "~14.0.11",
    "expo-linear-gradient": "~15.0.8",
    "expo-location": "~19.0.8",
    "expo-secure-store": "~15.0.8",
    "expo-status-bar": "~3.0.9",
    "i18next": "^23.16.8",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-i18next": "^15.7.4",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "15.12.1",
    "react-native-web": "^0.21.0",
    "react-native-worklets": "0.5.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@testing-library/react-native": "^13.3.3",
    "@types/jest": "^30.0.0",
    "@types/react": "~19.1.0",
    "@typescript-eslint/eslint-plugin": "^8.59.0",
    "@typescript-eslint/parser": "^8.59.0",
    "eslint": "^9.39.4",
    "eslint-config-expo": "^55.0.0",
    "eslint-plugin-prettier": "^5.5.5",
    "jest": "^29.7.0",
    "jest-expo": "^54.0.13",
    "prettier": "^3.8.3",
    "typescript": "~5.9.2"
  },
  "private": true
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: completes with no peer-dependency errors that block install; `node_modules/` populated.

- [ ] **Step 4: Configure `tsconfig.json` with `@/` path alias**

Overwrite `tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 5: Configure `babel.config.js` (reanimated + module resolver for `@/`)**

Overwrite `babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
```

Run: `npm install --save-dev babel-plugin-module-resolver`
Expected: installs the resolver plugin used above.

- [ ] **Step 6: Set app identity in `app.json`**

In `app.json`, set `expo.name` to `"SchoolMate Staff"`, `expo.slug` to `"schoolmate-staff"`, `expo.scheme` to `"schoolmatestaff"`, and ensure `expo.plugins` includes `["expo-location"]` and `"expo-secure-store"`. Leave other generated defaults.

- [ ] **Step 7: Ensure `index.ts` registers the root component**

Create/overwrite `index.ts`:
```ts
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
```
Delete `index.js` if `create-expo-app` produced one (we use `index.ts`).

- [ ] **Step 8: Verify the project typechecks (empty App is fine for now)**

Run: `npm run typecheck`
Expected: PASS (no errors). The default `App.tsx` from the template compiles.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo TS app with teacher-app deps and @/ alias"
```

---

## Task 2: Test tooling (Jest + RNTL)

**Files:**
- Create: `jest.config.js`, `jest.setup.js`

- [ ] **Step 1: Create `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|@tanstack/.*|i18next|react-i18next))',
  ],
};
```

- [ ] **Step 2: Create `jest.setup.js`**

```js
import '@testing-library/react-native/extend-expect';

// Silence reanimated in tests
global.__reanimatedWorkletInit = () => {};
```

- [ ] **Step 3: Add a smoke test to prove the runner works**

Create `src/__tests__/smoke.test.ts`:
```ts
describe('test runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the smoke test**

Run: `npm test -- src/__tests__/smoke.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add jest.config.js jest.setup.js src/__tests__/smoke.test.ts
git commit -m "chore: add jest + react-native-testing-library setup"
```

---

## Task 3: `config/env.ts`

**Files:**
- Create: `src/config/env.ts`
- Test: `src/config/__tests__/env.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { env } from '@/config/env';

describe('env', () => {
  it('defaults DATA_SOURCE to mock', () => {
    expect(env.DATA_SOURCE).toBe('mock');
  });
  it('exposes an API base URL string', () => {
    expect(typeof env.API_BASE_URL).toBe('string');
    expect(env.API_BASE_URL.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/config/__tests__/env.test.ts`
Expected: FAIL — cannot resolve `@/config/env`.

- [ ] **Step 3: Implement `src/config/env.ts`**

```ts
export type DataSource = 'mock' | 'live';

const raw = process.env.EXPO_PUBLIC_DATA_SOURCE;
const DATA_SOURCE: DataSource = raw === 'live' ? 'live' : 'mock';

export const env = {
  DATA_SOURCE,
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.schoolmate.local',
} as const;
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/config/__tests__/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config
git commit -m "feat: add config/env with DATA_SOURCE flag"
```

---

## Task 4: `lib/errors.ts`

**Files:**
- Create: `src/lib/errors.ts`
- Test: `src/lib/__tests__/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { AppError, isAppError, toAppError } from '@/lib/errors';

describe('AppError', () => {
  it('constructs with code, status, message', () => {
    const e = new AppError('not_found', 404, 'Missing');
    expect(e.code).toBe('not_found');
    expect(e.status).toBe(404);
    expect(e.message).toBe('Missing');
    expect(e).toBeInstanceOf(Error);
  });

  it('isAppError narrows AppError instances', () => {
    expect(isAppError(new AppError('x', 0, 'y'))).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('toAppError passes through AppError and wraps unknowns', () => {
    const original = new AppError('a', 1, 'b');
    expect(toAppError(original)).toBe(original);
    const wrapped = toAppError(new Error('boom'));
    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.code).toBe('unknown');
    expect(wrapped.message).toBe('boom');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/__tests__/errors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/errors.ts`**

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value;
  if (value instanceof Error) return new AppError('unknown', 0, value.message);
  return new AppError('unknown', 0, String(value));
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/__tests__/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors.ts src/lib/__tests__/errors.test.ts
git commit -m "feat: add lib/errors AppError type"
```

---

## Task 5: `lib/latency.ts`

**Files:**
- Create: `src/lib/latency.ts`
- Test: `src/lib/__tests__/latency.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { simulateLatency, maybeFail } from '@/lib/latency';
import { AppError } from '@/lib/errors';

describe('latency', () => {
  it('simulateLatency resolves after a delay', async () => {
    const start = Date.now();
    await simulateLatency(20, 20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('maybeFail with rate 0 never throws', () => {
    expect(() => maybeFail(0)).not.toThrow();
  });

  it('maybeFail with rate 1 throws an AppError', () => {
    expect(() => maybeFail(1)).toThrow(AppError);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/__tests__/latency.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/latency.ts`**

```ts
import { AppError } from './errors';

export function simulateLatency(min = 150, max = 500): Promise<void> {
  const ms = min + Math.random() * Math.max(0, max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function maybeFail(rate = 0): void {
  if (rate > 0 && Math.random() < rate) {
    throw new AppError('mock_failure', 500, 'Simulated mock failure');
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/__tests__/latency.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/latency.ts src/lib/__tests__/latency.test.ts
git commit -m "feat: add lib/latency mock helpers"
```

---

## Task 6: `lib/asyncStore.ts`

**Files:**
- Create: `src/lib/asyncStore.ts`
- Test: `src/lib/__tests__/asyncStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { asyncStore } from '@/lib/asyncStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => {
        mem[k] = v;
        return Promise.resolve();
      }),
      removeItem: jest.fn((k: string) => {
        delete mem[k];
        return Promise.resolve();
      }),
    },
  };
});

describe('asyncStore', () => {
  it('returns null for a missing key', async () => {
    expect(await asyncStore.get('missing')).toBeNull();
  });
  it('round-trips a JSON value', async () => {
    await asyncStore.set('k', { a: 1 });
    expect(await asyncStore.get<{ a: number }>('k')).toEqual({ a: 1 });
  });
  it('removes a value', async () => {
    await asyncStore.set('k2', 5);
    await asyncStore.remove('k2');
    expect(await asyncStore.get('k2')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/__tests__/asyncStore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/asyncStore.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStore = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
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
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/__tests__/asyncStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/asyncStore.ts src/lib/__tests__/asyncStore.test.ts
git commit -m "feat: add lib/asyncStore JSON helpers"
```

---

## Task 7: `lib/tokenStore.ts`

**Files:**
- Create: `src/lib/tokenStore.ts`
- Test: `src/lib/__tests__/tokenStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/__tests__/tokenStore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/tokenStore.ts`**

```ts
import * as SecureStore from 'expo-secure-store';

const ACCESS = 'sms_staff_access_token';
const REFRESH = 'sms_staff_refresh_token';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStore = {
  async save(tokens: Tokens): Promise<void> {
    await SecureStore.setItemAsync(ACCESS, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH, tokens.refreshToken);
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
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/__tests__/tokenStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokenStore.ts src/lib/__tests__/tokenStore.test.ts
git commit -m "feat: add lib/tokenStore SecureStore wrapper"
```

---

## Task 8: `lib/httpClient.ts`

**Files:**
- Create: `src/lib/httpClient.ts`
- Test: `src/lib/__tests__/httpClient.test.ts`

The HTTP client prepends the base URL, attaches `Authorization` + `X-Tenant-Id` from an injected `getAuth()`, parses JSON, and normalizes non-2xx into `AppError`.

- [ ] **Step 1: Write the failing test**

```ts
import { createHttpClient } from '@/lib/httpClient';
import { AppError } from '@/lib/errors';

describe('httpClient', () => {
  const getAuth = () => ({ accessToken: 'tok', tenantId: 'school1' });

  it('GET prepends base URL and attaches auth + tenant headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hello: 'world' }),
    });
    const http = createHttpClient({ baseUrl: 'https://api.test', getAuth, fetchImpl: fetchMock });
    const data = await http.get<{ hello: string }>('/ping');
    expect(data).toEqual({ hello: 'world' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/ping');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['X-Tenant-Id']).toBe('school1');
  });

  it('normalizes non-2xx into AppError', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ code: 'not_found', message: 'Missing' }),
    });
    const http = createHttpClient({ baseUrl: 'https://api.test', getAuth, fetchImpl: fetchMock });
    await expect(http.get('/missing')).rejects.toMatchObject({
      name: 'AppError',
      status: 404,
      code: 'not_found',
    });
    await expect(http.get('/missing')).rejects.toBeInstanceOf(AppError);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/__tests__/httpClient.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/httpClient.ts`**

```ts
import { AppError } from './errors';

export interface AuthSnapshot {
  accessToken: string | null;
  tenantId: string | null;
}

export interface HttpClientOptions {
  baseUrl: string;
  getAuth: () => AuthSnapshot;
  fetchImpl?: typeof fetch;
}

export interface HttpClient {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

export function createHttpClient(opts: HttpClientOptions): HttpClient {
  const fetchImpl = opts.fetchImpl ?? fetch;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { accessToken, tenantId } = opts.getAuth();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (tenantId) headers['X-Tenant-Id'] = tenantId;

    const res = await fetchImpl(`${opts.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const p = (payload ?? {}) as { code?: string; message?: string };
      throw new AppError(p.code ?? 'http_error', res.status, p.message ?? `HTTP ${res.status}`);
    }
    return payload as T;
  }

  return {
    get: (path, params) => request('GET', `${path}${buildQuery(params)}`),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  };
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/__tests__/httpClient.test.ts`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/httpClient.ts src/lib/__tests__/httpClient.test.ts
git commit -m "feat: add lib/httpClient with auth+tenant headers and error normalize"
```

---

## Task 9: `lib/queryClient.ts`

**Files:**
- Create: `src/lib/queryClient.ts`
- Test: `src/lib/__tests__/queryClient.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { queryClient, queryKeys } from '@/lib/queryClient';

describe('queryClient', () => {
  it('exposes a configured QueryClient', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
  });
  it('queryKeys build stable arrays', () => {
    expect(queryKeys.dashboard('school1')).toEqual(['dashboard', 'school1']);
    expect(queryKeys.attendance('school1')).toEqual(['attendance', 'school1']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/__tests__/queryClient.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/queryClient.ts`**

```ts
import { QueryClient } from '@tanstack/react-query';
import { isAppError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isAppError(error) && error.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

export const queryKeys = {
  dashboard: (tenantId: string) => ['dashboard', tenantId] as const,
  attendance: (tenantId: string) => ['attendance', tenantId] as const,
  session: () => ['session'] as const,
};
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/lib/__tests__/queryClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queryClient.ts src/lib/__tests__/queryClient.test.ts
git commit -m "feat: add lib/queryClient with key helpers"
```

---

## Task 10: `theme/colors.ts` — `makeTheme(dark)`

**Files:**
- Create: `src/theme/colors.ts`
- Test: `src/theme/__tests__/colors.test.ts`

Port the exact tokens from `docs/design-handoff/app/theme.jsx` (`makeTheme`). Note: in RN, shadows are objects, not CSS strings — store the raw shadow values as numbers/objects (used later by components). For this plan, expose the color tokens + a `shadow`/`shadowLg` RN shadow object.

- [ ] **Step 1: Write the failing test**

```ts
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
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/theme/__tests__/colors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/theme/colors.ts`**

```ts
import type { ViewStyle } from 'react-native';

export interface ThemeColors {
  dark: boolean;
  bg: string;
  bgInk: string;
  surface: string;
  surface2: string;
  sunken: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  lineStrong: string;
  primary: string;
  primaryDim: string;
  onPrimary: string;
  gold: string;
  goldSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;
  onBrandSoft: string;
  shadow: ViewStyle;
  shadowLg: ViewStyle;
}

const lightShadow: ViewStyle = {
  shadowColor: '#15231E',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 16,
  elevation: 4,
};
const lightShadowLg: ViewStyle = {
  shadowColor: '#15231E',
  shadowOffset: { width: 0, height: 22 },
  shadowOpacity: 0.28,
  shadowRadius: 34,
  elevation: 10,
};
const darkShadow: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.6,
  shadowRadius: 20,
  elevation: 6,
};
const darkShadowLg: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 24 },
  shadowOpacity: 0.7,
  shadowRadius: 40,
  elevation: 12,
};

export function makeTheme(dark: boolean): ThemeColors {
  if (!dark) {
    return {
      dark: false,
      bg: '#F2EEE4',
      bgInk: '#0E5C4A',
      surface: '#FFFFFF',
      surface2: '#FBF9F3',
      sunken: '#EBE6D9',
      ink: '#15231E',
      inkSoft: '#5E6E66',
      inkFaint: '#94A199',
      line: 'rgba(21,35,30,0.08)',
      lineStrong: 'rgba(21,35,30,0.14)',
      primary: '#0E5C4A',
      primaryDim: '#15735C',
      onPrimary: '#FFFFFF',
      gold: '#E7A92F',
      goldSoft: '#FBEAC2',
      success: '#2E9E6B',
      successSoft: '#D4EFE0',
      danger: '#DA5347',
      dangerSoft: '#F8DAD5',
      warn: '#E0922F',
      warnSoft: '#FBE6C6',
      onBrandSoft: 'rgba(255,255,255,0.14)',
      shadow: lightShadow,
      shadowLg: lightShadowLg,
    };
  }
  return {
    dark: true,
    bg: '#0B1512',
    bgInk: '#0B1512',
    surface: '#14241E',
    surface2: '#1A2C25',
    sunken: '#0E1B16',
    ink: '#ECF3EF',
    inkSoft: '#9CB0A7',
    inkFaint: '#647A71',
    line: 'rgba(255,255,255,0.07)',
    lineStrong: 'rgba(255,255,255,0.13)',
    primary: '#33BF9F',
    primaryDim: '#2AA489',
    onPrimary: '#04241C',
    gold: '#F2C766',
    goldSoft: 'rgba(242,199,102,0.16)',
    success: '#45C589',
    successSoft: 'rgba(69,197,137,0.16)',
    danger: '#F0786C',
    dangerSoft: 'rgba(240,120,108,0.16)',
    warn: '#F0B560',
    warnSoft: 'rgba(240,181,96,0.16)',
    onBrandSoft: 'rgba(255,255,255,0.10)',
    shadow: darkShadow,
    shadowLg: darkShadowLg,
  };
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/theme/__tests__/colors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme/colors.ts src/theme/__tests__/colors.test.ts
git commit -m "feat: add theme/colors makeTheme (light+dark tokens)"
```

---

## Task 11: `theme/roles.ts` — role config

**Files:**
- Create: `src/theme/roles.ts`
- Test: `src/theme/__tests__/roles.test.ts`

Implements the spec's role-driven config (accent, icon, duty-post label key, specialized-card kind) for all 7 roles. Accents/icons come from `docs/design-handoff/app/theme.jsx` (`ROLES`).

- [ ] **Step 1: Write the failing test**

```ts
import { ROLES, ROLE_KEYS, type Role } from '@/theme/roles';

describe('ROLES', () => {
  it('defines all 7 roles', () => {
    expect(ROLE_KEYS).toEqual([
      'driver', 'cook', 'guard', 'gardener', 'sweeper', 'peon', 'clerk',
    ]);
  });
  it('each role has accent, icon, dutyPost label key, and a card kind', () => {
    (ROLE_KEYS as Role[]).forEach((k) => {
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/theme/__tests__/roles.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/theme/roles.ts`**

```ts
export const ROLE_KEYS = [
  'driver', 'cook', 'guard', 'gardener', 'sweeper', 'peon', 'clerk',
] as const;

export type Role = (typeof ROLE_KEYS)[number];

export interface RoleConfig {
  key: Role;
  labelKey: string;        // i18n key for the role name
  icon: string;            // icon name (Plan 3 icon set): bus|pot|shield|leaf|broom|bell|doc
  accent: string;
  accentSoft: string;
  dutyPostLabelKey: string; // i18n key for the duty-post label
  roleCardKind: Role;       // which specialized Home card layout to render
}

export const ROLES: Record<Role, RoleConfig> = {
  driver: {
    key: 'driver', labelKey: 'role.driver', icon: 'bus',
    accent: '#E08A3C', accentSoft: '#FBE7CC', dutyPostLabelKey: 'dutyPost.driver', roleCardKind: 'driver',
  },
  cook: {
    key: 'cook', labelKey: 'role.cook', icon: 'pot',
    accent: '#DD5A4B', accentSoft: '#FAD8D2', dutyPostLabelKey: 'dutyPost.cook', roleCardKind: 'cook',
  },
  guard: {
    key: 'guard', labelKey: 'role.guard', icon: 'shield',
    accent: '#3B7FD4', accentSoft: '#D2E2F7', dutyPostLabelKey: 'dutyPost.guard', roleCardKind: 'guard',
  },
  gardener: {
    key: 'gardener', labelKey: 'role.gardener', icon: 'leaf',
    accent: '#4C9E55', accentSoft: '#D6ECD6', dutyPostLabelKey: 'dutyPost.gardener', roleCardKind: 'gardener',
  },
  sweeper: {
    key: 'sweeper', labelKey: 'role.sweeper', icon: 'broom',
    accent: '#23A79C', accentSoft: '#CCECE8', dutyPostLabelKey: 'dutyPost.sweeper', roleCardKind: 'sweeper',
  },
  peon: {
    key: 'peon', labelKey: 'role.peon', icon: 'bell',
    accent: '#8A6ED4', accentSoft: '#E2D9F6', dutyPostLabelKey: 'dutyPost.peon', roleCardKind: 'peon',
  },
  clerk: {
    key: 'clerk', labelKey: 'role.clerk', icon: 'doc',
    accent: '#5566CE', accentSoft: '#D7DBF6', dutyPostLabelKey: 'dutyPost.clerk', roleCardKind: 'clerk',
  },
};
```

- [ ] **Step 4: Run the test**

Run: `npm test -- src/theme/__tests__/roles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/theme/roles.ts src/theme/__tests__/roles.test.ts
git commit -m "feat: add theme/roles config for 7 staff roles"
```

---

## Task 12: `theme/typography.ts`

**Files:**
- Create: `src/theme/typography.ts`

No behavior to unit-test (font-family string constants); verified by typecheck and downstream component tests.

- [ ] **Step 1: Implement `src/theme/typography.ts`**

```ts
// Font families — loaded in App.tsx via @expo-google-fonts/{sora,manrope}
export const FontFamily = {
  // Sora — display / headings / numbers
  displayRegular: 'Sora_400Regular',
  displayMedium: 'Sora_500Medium',
  displaySemiBold: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  displayExtraBold: 'Sora_800ExtraBold',
  // Manrope — body / UI
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
} as const;

// Type scale (from the handoff). Components apply color from the active theme.
export const TextScale = {
  hero: { fontFamily: FontFamily.displayBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  screenTitle: { fontFamily: FontFamily.displayBold, fontSize: 21, lineHeight: 27, letterSpacing: -0.3 },
  cardTitle: { fontFamily: FontFamily.displayBold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: FontFamily.bodySemiBold, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: FontFamily.bodyExtraBold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: FontFamily.bodySemiBold, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },
  button: { fontFamily: FontFamily.bodyExtraBold, fontSize: 16, lineHeight: 20 },
} as const;
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/theme/typography.ts
git commit -m "feat: add theme/typography Sora+Manrope scale"
```

---

## Task 13: `theme/ThemeProvider.tsx` + `theme/index.ts`

**Files:**
- Create: `src/theme/ThemeProvider.tsx`, `src/theme/index.ts`
- Test: `src/theme/__tests__/ThemeProvider.test.tsx`

`ThemeProvider` holds dark/light + the active `roleKey`, persists both to AsyncStorage, and exposes `useTheme()` returning `{ colors, role, dark, toggleDark, setRole, setDark }`. `colors` is `makeTheme(dark)`; `role` is `ROLES[roleKey]`.

- [ ] **Step 1: Write the failing test**

```ts
import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    },
  };
});

function Probe() {
  const { colors, role, dark, toggleDark, setRole } = useTheme();
  return (
    <>
      <Text testID="bg">{colors.bg}</Text>
      <Text testID="role">{role.key}</Text>
      <Text testID="dark">{String(dark)}</Text>
      <Pressable testID="toggle" onPress={toggleDark}><Text>t</Text></Pressable>
      <Pressable testID="cook" onPress={() => setRole('cook')}><Text>c</Text></Pressable>
    </>
  );
}

describe('ThemeProvider', () => {
  it('defaults to light theme and driver role', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('bg')).toHaveTextContent('#F2EEE4');
    expect(screen.getByTestId('role')).toHaveTextContent('driver');
    expect(screen.getByTestId('dark')).toHaveTextContent('false');
  });

  it('toggleDark flips to dark tokens', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.press(screen.getByTestId('toggle'));
    await waitFor(() => expect(screen.getByTestId('bg')).toHaveTextContent('#0B1512'));
  });

  it('setRole switches the active role', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.press(screen.getByTestId('cook'));
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('cook'));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/theme/__tests__/ThemeProvider.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/theme/ThemeProvider.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { makeTheme, type ThemeColors } from './colors';
import { ROLES, type Role, type RoleConfig } from './roles';
import { asyncStore } from '@/lib/asyncStore';

interface ThemeContextValue {
  colors: ThemeColors;
  dark: boolean;
  role: RoleConfig;
  roleKey: Role;
  setDark: (v: boolean) => void;
  toggleDark: () => void;
  setRole: (r: Role) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_KEY = 'sms_staff_dark';
const ROLE_KEY = 'sms_staff_role';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dark, setDarkState] = useState(false);
  const [roleKey, setRoleState] = useState<Role>('driver');

  useEffect(() => {
    (async () => {
      const savedDark = await asyncStore.get<boolean>(DARK_KEY);
      const savedRole = await asyncStore.get<Role>(ROLE_KEY);
      if (savedDark != null) setDarkState(savedDark);
      if (savedRole && ROLES[savedRole]) setRoleState(savedRole);
    })();
  }, []);

  const setDark = (v: boolean) => {
    setDarkState(v);
    void asyncStore.set(DARK_KEY, v);
  };
  const toggleDark = () => setDark(!dark);
  const setRole = (r: Role) => {
    setRoleState(r);
    void asyncStore.set(ROLE_KEY, r);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: makeTheme(dark),
      dark,
      role: ROLES[roleKey],
      roleKey,
      setDark,
      toggleDark,
      setRole,
    }),
    [dark, roleKey],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
```

- [ ] **Step 4: Implement `src/theme/index.ts`**

```ts
export * from './colors';
export * from './roles';
export * from './typography';
export { ThemeProvider, useTheme } from './ThemeProvider';
```

- [ ] **Step 5: Run the test**

Run: `npm test -- src/theme/__tests__/ThemeProvider.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/theme/ThemeProvider.tsx src/theme/index.ts src/theme/__tests__/ThemeProvider.test.tsx
git commit -m "feat: add ThemeProvider (dark + role context, persisted)"
```

---

## Task 14: i18n setup

**Files:**
- Create: `src/i18n/index.ts`, `src/i18n/resources/en.json`, `hi.json`, `mr.json`, `ta.json`
- Test: `src/i18n/__tests__/i18n.test.ts`

This task wires i18next with a **starter** key set (enough to test init, interpolation, fallback, and language switch). The **full dictionary port** from `docs/design-handoff/app/i18n.jsx` happens as screens are built in Plans 3–4 (each screen adds its keys to all four JSON files). Keep proper nouns untranslated.

- [ ] **Step 1: Create the starter resource files**

`src/i18n/resources/en.json`:
```json
{
  "app.name": "SchoolMate Staff",
  "login.greeting": "Welcome back 👋",
  "home.goodMorning": "Good morning, {{name}}",
  "role.driver": "Bus Driver",
  "role.cook": "Cook",
  "role.guard": "Watchman",
  "role.gardener": "Gardener",
  "role.sweeper": "Sweeper",
  "role.peon": "Peon",
  "role.clerk": "Clerk",
  "dutyPost.driver": "Bus / Route",
  "dutyPost.cook": "Kitchen / Mess",
  "dutyPost.guard": "Gate / Post",
  "dutyPost.gardener": "Grounds / Zone",
  "dutyPost.sweeper": "Block / Area",
  "dutyPost.peon": "Office / Desk",
  "dutyPost.clerk": "Office / Desk"
}
```

`src/i18n/resources/hi.json`:
```json
{
  "app.name": "स्कूलमेट स्टाफ",
  "login.greeting": "वापसी पर स्वागत है 👋",
  "home.goodMorning": "सुप्रभात, {{name}}",
  "role.driver": "बस चालक",
  "role.cook": "रसोइया",
  "role.guard": "चौकीदार",
  "role.gardener": "माली",
  "role.sweeper": "सफाईकर्मी",
  "role.peon": "चपरासी",
  "role.clerk": "लिपिक",
  "dutyPost.driver": "बस / मार्ग",
  "dutyPost.cook": "रसोई / मेस",
  "dutyPost.guard": "गेट / चौकी",
  "dutyPost.gardener": "मैदान / क्षेत्र",
  "dutyPost.sweeper": "ब्लॉक / क्षेत्र",
  "dutyPost.peon": "कार्यालय / डेस्क",
  "dutyPost.clerk": "कार्यालय / डेस्क"
}
```

`src/i18n/resources/mr.json` (Marathi — flagged for native-speaker proofread):
```json
{
  "app.name": "स्कूलमेट स्टाफ",
  "login.greeting": "पुन्हा स्वागत आहे 👋",
  "home.goodMorning": "सुप्रभात, {{name}}",
  "role.driver": "बस चालक",
  "role.cook": "स्वयंपाकी",
  "role.guard": "पहारेकरी",
  "role.gardener": "माळी",
  "role.sweeper": "सफाई कामगार",
  "role.peon": "शिपाई",
  "role.clerk": "लिपिक",
  "dutyPost.driver": "बस / मार्ग",
  "dutyPost.cook": "स्वयंपाकघर / मेस",
  "dutyPost.guard": "गेट / चौकी",
  "dutyPost.gardener": "मैदान / क्षेत्र",
  "dutyPost.sweeper": "ब्लॉक / क्षेत्र",
  "dutyPost.peon": "कार्यालय / डेस्क",
  "dutyPost.clerk": "कार्यालय / डेस्क"
}
```

`src/i18n/resources/ta.json` (Tamil — flagged for native-speaker proofread):
```json
{
  "app.name": "ஸ்கூல்மேட் ஸ்டாஃப்",
  "login.greeting": "மீண்டும் வரவேற்கிறோம் 👋",
  "home.goodMorning": "காலை வணக்கம், {{name}}",
  "role.driver": "பேருந்து ஓட்டுநர்",
  "role.cook": "சமையல்காரர்",
  "role.guard": "காவலர்",
  "role.gardener": "தோட்டக்காரர்",
  "role.sweeper": "துப்புரவாளர்",
  "role.peon": "அலுவலக உதவியாளர்",
  "role.clerk": "எழுத்தர்",
  "dutyPost.driver": "பேருந்து / வழி",
  "dutyPost.cook": "சமையலறை / உணவகம்",
  "dutyPost.guard": "வாயில் / நிலை",
  "dutyPost.gardener": "மைதானம் / பகுதி",
  "dutyPost.sweeper": "தொகுதி / பகுதி",
  "dutyPost.peon": "அலுவலகம் / மேசை",
  "dutyPost.clerk": "அலுவலகம் / மேசை"
}
```

- [ ] **Step 2: Write the failing test**

`src/i18n/__tests__/i18n.test.ts`:
```ts
import { i18n, initI18n, SUPPORTED_LANGUAGES } from '@/i18n';

describe('i18n', () => {
  beforeAll(async () => {
    await initI18n();
  });

  it('supports the four design languages', () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(['en', 'hi', 'mr', 'ta']);
  });

  it('translates a key in English', () => {
    expect(i18n.t('role.driver')).toBe('Bus Driver');
  });

  it('interpolates variables', () => {
    expect(i18n.t('home.goodMorning', { name: 'Ramesh' })).toBe('Good morning, Ramesh');
  });

  it('switches language and falls back to English for missing keys', async () => {
    await i18n.changeLanguage('hi');
    expect(i18n.t('role.driver')).toBe('बस चालक');
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
    await i18n.changeLanguage('en');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/i18n/__tests__/i18n.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/i18n/index.ts`**

```ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { asyncStore } from '@/lib/asyncStore';
import en from './resources/en.json';
import hi from './resources/hi.json';
import mr from './resources/mr.json';
import ta from './resources/ta.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'hi', native: 'हिंदी' },
  { code: 'mr', native: 'मराठी' },
  { code: 'ta', native: 'தமிழ்' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const LANG_KEY = 'sms_staff_lang';

export const i18n = i18next;

export async function initI18n(): Promise<void> {
  if (i18next.isInitialized) return;
  const saved = await asyncStore.get<LanguageCode>(LANG_KEY);
  await i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      ta: { translation: ta },
    },
    lng: saved ?? 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    // Return the raw key (not undefined) when a translation is missing.
    parseMissingKeyHandler: (key) => key,
  });
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  await i18next.changeLanguage(code);
  await asyncStore.set(LANG_KEY, code);
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- src/i18n/__tests__/i18n.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Add `resolveJsonModule` if typecheck complains about JSON imports**

If `npm run typecheck` errors on the `.json` imports, add `"resolveJsonModule": true` under `compilerOptions` in `tsconfig.json`. Then re-run `npm run typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/i18n tsconfig.json
git commit -m "feat: add i18next setup with en/hi/mr/ta starter resources"
```

---

## Task 15: Navigation types + stub screens

**Files:**
- Create: `src/navigation/types.ts`, `src/screens/stubs/StubScreen.tsx`, `src/screens/HomeScreen.tsx`, `src/screens/RosterScreen.tsx`, `src/screens/TasksScreen.tsx`, `src/screens/ProfileScreen.tsx`, `src/screens/AttendanceScreen.tsx`, `src/screens/LoginScreen.tsx`
- Test: `src/screens/stubs/__tests__/StubScreen.test.tsx`

- [ ] **Step 1: Create `src/navigation/types.ts`**

```ts
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
  Attendance: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Roster: undefined;
  Tasks: undefined;
  Me: undefined;
};
```

- [ ] **Step 2: Write the failing test for the reusable stub**

`src/screens/stubs/__tests__/StubScreen.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { StubScreen } from '@/screens/stubs/StubScreen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

describe('StubScreen', () => {
  it('renders its title', () => {
    render(
      <ThemeProvider>
        <StubScreen title="Roster" />
      </ThemeProvider>,
    );
    expect(screen.getByText('Roster')).toBeOnTheScreen();
    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/screens/stubs/__tests__/StubScreen.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/screens/stubs/StubScreen.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export const StubScreen: React.FC<{ title: string }> = ({ title }) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Text style={[TextScale.screenTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[TextScale.body, { color: colors.inkSoft, marginTop: 8 }]}>
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 5: Implement the screen stubs (each delegates to StubScreen)**

`src/screens/HomeScreen.tsx`:
```tsx
import React from 'react';
import { StubScreen } from './stubs/StubScreen';
export const HomeScreen = () => <StubScreen title="Home" />;
```
`src/screens/RosterScreen.tsx`:
```tsx
import React from 'react';
import { StubScreen } from './stubs/StubScreen';
export const RosterScreen = () => <StubScreen title="Roster" />;
```
`src/screens/TasksScreen.tsx`:
```tsx
import React from 'react';
import { StubScreen } from './stubs/StubScreen';
export const TasksScreen = () => <StubScreen title="Tasks" />;
```
`src/screens/ProfileScreen.tsx`:
```tsx
import React from 'react';
import { StubScreen } from './stubs/StubScreen';
export const ProfileScreen = () => <StubScreen title="Me" />;
```
`src/screens/AttendanceScreen.tsx`:
```tsx
import React from 'react';
import { StubScreen } from './stubs/StubScreen';
export const AttendanceScreen = () => <StubScreen title="Attendance" />;
```
`src/screens/LoginScreen.tsx` (temporary — Plan 3 builds the real one; this lets us sign in for nav testing):
```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';

export const LoginScreen: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
  const { colors, role } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.center}>
        <Text style={[TextScale.hero, { color: colors.ink }]}>SchoolMate Staff</Text>
        <Pressable
          onPress={onSignIn}
          style={[styles.btn, { backgroundColor: role.accent }]}
          testID="signin"
        >
          <Text style={[TextScale.button, { color: '#FFFFFF' }]}>Enter app</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  btn: { height: 54, paddingHorizontal: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 6: Run the stub test**

Run: `npm test -- src/screens/stubs/__tests__/StubScreen.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/navigation/types.ts src/screens
git commit -m "feat: add navigation types and stub screens"
```

---

## Task 16: `MainTabNavigator`

**Files:**
- Create: `src/navigation/MainTabNavigator.tsx`

The bottom tabs (Home, Roster, Tasks, Me). The center check-in FAB is added with the real design in Plan 4; for now use simple text tab labels (icons arrive with the icon set in Plan 3). No unit test (navigation wiring) — verified by app boot in Task 19.

- [ ] **Step 1: Implement `src/navigation/MainTabNavigator.tsx`**

```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/screens/HomeScreen';
import { RosterScreen } from '@/screens/RosterScreen';
import { TasksScreen } from '@/screens/TasksScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { useTheme } from '@/theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const { colors, role } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: role.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Roster" component={RosterScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Me" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/MainTabNavigator.tsx
git commit -m "feat: add MainTabNavigator with Home/Roster/Tasks/Me tabs"
```

---

## Task 17: `RootNavigator` (temporary local auth gate)

**Files:**
- Create: `src/navigation/RootNavigator.tsx`

A native-stack with a local `signedIn` state. Plan 2 replaces this with the real `useAuth()` gate and the `Attendance` overlay route. This keeps Plan 1 runnable end-to-end.

- [ ] **Step 1: Implement `src/navigation/RootNavigator.tsx`**

```tsx
import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  // Temporary local gate for Plan 1. Replaced by useAuth() in Plan 2.
  const [signedIn, setSignedIn] = useState(false);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {signedIn ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Login">
          {() => <LoginScreen onSignIn={() => setSignedIn(true)} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
};
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/RootNavigator.tsx
git commit -m "feat: add RootNavigator with temporary local auth gate"
```

---

## Task 18: `AppProviders`

**Files:**
- Create: `src/providers/AppProviders.tsx`

Wraps `QueryClientProvider` → `ThemeProvider`. (i18n is initialized in `App.tsx` before render; `react-i18next` reads the global `i18n` instance, so no provider element is strictly required, but we keep the order documented for Plan 2 where `AuthProvider`/`RepositoryProvider` slot in.)

- [ ] **Step 1: Implement `src/providers/AppProviders.tsx`**

```tsx
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/theme';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/providers/AppProviders.tsx
git commit -m "feat: add AppProviders (QueryClient + Theme)"
```

---

## Task 19: `App.tsx` — fonts + i18n init + providers + navigation

**Files:**
- Modify: `App.tsx` (replace the template content)

- [ ] **Step 1: Implement `App.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useFonts as useSora, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { RootNavigator } from '@/navigation/RootNavigator';
import { AppProviders } from '@/providers/AppProviders';
import { initI18n } from '@/i18n';

export default function App() {
  const [fontsLoaded] = useSora({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  if (!fontsLoaded || !i18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0E5C4A" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AppProviders>
          <NavigationContainer>
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EEE4' },
});
```

- [ ] **Step 2: Typecheck the whole project**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (fix any reported issues; the eslint config came from `create-expo-app`).

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites (env, errors, latency, asyncStore, tokenStore, httpClient, queryClient, colors, roles, ThemeProvider, i18n, StubScreen, smoke).

- [ ] **Step 5: Boot the app on web (fastest smoke check)**

Run: `npm run web`
Expected: Metro bundles with no errors; the temporary Login screen renders "SchoolMate Staff" + an "Enter app" button; pressing it shows the bottom tabs (Home/Roster/Tasks/Me), each rendering its "Coming soon" stub. Stop the dev server after verifying.

> If a worklets/reanimated babel error appears, confirm `react-native-worklets/plugin` is the **last** plugin in `babel.config.js` and restart Metro with `npm run web -- --clear`.

- [ ] **Step 6: Commit**

```bash
git add App.tsx
git commit -m "feat: wire App.tsx with fonts, i18n init, providers, navigation"
```

---

## Task 20: README + push

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# SchoolMate Staff

Mobile app for non-teaching school staff (drivers, cooks, guards, gardeners, sweepers,
peons, clerks). Part of the SMS suite alongside `sms-student` and `sms-teacher-app`.

## Stack
Expo SDK 54 · React Native 0.81 · TypeScript · React Navigation · TanStack Query ·
react-i18next (en/hi/mr/ta) · Sora + Manrope fonts. Swappable mock→HTTP data layer
(`EXPO_PUBLIC_DATA_SOURCE=mock|live`).

## Run
- `npm install`
- `npm run web` / `npm run android` / `npm run ios`
- `npm test` · `npm run lint` · `npm run typecheck`

## Docs
- Specs: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`
- Design reference (source of truth for tokens, icons, i18n dictionary): `docs/design-handoff/`

## Status
Plan 1 (scaffold & infrastructure) complete. Next: Plan 2 (data layer & auth),
Plan 3 (icons, UI primitives, Splash & Login), Plan 4 (Home & Attendance).
```

- [ ] **Step 2: Commit and push the branch**

```bash
git add README.md
git commit -m "docs: add staff app README"
git push -u origin main
```
Expected: pushes to `https://github.com/catretech-sketch/sms-staff.git`. If auth is required, the user runs `! gh auth login` first.

---

## Self-Review

**1. Spec coverage (Plan 1 portion):**
- Stack/deps → Task 1 ✓; test tooling → Task 2 ✓
- `config/env` → Task 3 ✓; `lib/*` (errors, latency, asyncStore, tokenStore, httpClient, queryClient) → Tasks 4–9 ✓
- Theme: light+dark tokens → Task 10 ✓; role config (role-driven fields) → Task 11 ✓; typography (Sora+Manrope) → Task 12 ✓; ThemeProvider (dark + role, persisted) → Task 13 ✓
- i18n (en/hi/mr/ta, interpolation, fallback) → Task 14 ✓ (full dictionary port deferred to Plans 3–4, noted)
- Navigation skeleton (auth-gated root + tabs) + stub screens → Tasks 15–17 ✓
- Providers + App entry (fonts, init) → Tasks 18–19 ✓
- Branding header, real auth, repositories, screens → **out of this plan's scope** (Plans 2–4), as designed.

**2. Placeholder scan:** No "TBD"/"add error handling" placeholders; every code step has complete code. The one deliberate deferral (full i18n dictionary) is explicitly scoped with its source file path.

**3. Type consistency:** `AppError(code, status, message)` used consistently (errors, latency, httpClient). `makeTheme(dark) → ThemeColors` consumed by ThemeProvider/StubScreen. `Role`/`ROLES`/`RoleConfig` consistent across roles, ThemeProvider, MainTabNavigator. `asyncStore.get/set/remove` signatures consistent across tokenStore-adjacent usage, ThemeProvider, i18n. `queryKeys` names match the spec. The Task 13 test note corrects `getByTestId` casing.

**Known intentional deferrals to Plan 2+:** real `AuthProvider`/`useAuth` gate (Task 17 stub), `RepositoryProvider` in `AppProviders` (Task 18), `Attendance` overlay route, icon set in tabs/FAB.
