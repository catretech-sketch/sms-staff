# Password Login + First-Time Password Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OTP-only login with identifier + password login; OTP request/verify becomes the entry point for first-time password setup and forgot-password, ending in a new Set Password screen.

**Architecture:** The `sms-backend` already exposes `POST /v1/auth/login` (password), `POST /v1/auth/set-password` (authenticated), and the existing `POST /v1/auth/otp/request` / `POST /v1/auth/otp/verify`. `LoginScreen` becomes password-first; a "First time / forgot password?" link (and a `password_not_set` login error) route into the existing OTP request/verify UI. OTP verify still authenticates immediately (issues tokens) but `AuthProvider` now holds that session as `pendingPasswordSetup` instead of establishing it, until a new Set Password screen (rendered inline by `LoginScreen`) calls `set-password` and only then calls `establishSession`.

**Tech Stack:** React Native + Expo, TypeScript, `zod` for wire validation, `@tanstack/react-query` mutations, Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-09-01-password-login-design.md`

## Global Constraints

- All `/auth/*` JSON bodies are **snake_case** (backend-enforced globally) — every new request/response field must be snake_case on the wire, camelCase in TS.
- Password minimum length: **8 characters**, enforced client-side to mirror the backend's `weak_password` (422) rule — this is not configurable, use the literal `8`.
- `POST /auth/login` sends exactly one of `email` / `phone` (never both), plus `password` and `role`. Never send `student_id` (staff app has no student login).
- Error codes to map through `authErrorMessage` (`src/features/auth/authErrors.ts`): `password_not_set`, `invalid_credentials`, `wrong_role`, `access_removed`, `access_inactive`, `weak_password` (existing `invalid_code`, `not_registered` stay as-is).
- Never establish an authenticated session (`AuthProvider.status === 'authenticated'`) from OTP verify directly — it must pass through Set Password first, every time, regardless of any `must_set_password` flag (per spec: that flag is deliberately unused).
- All 4 locales (`en`, `hi`, `mr`, `ta` under `src/i18n/resources/`) must get every new key in the same task that introduces it — never leave a locale file behind.

---

### Task 1: `eye` / `eyeOff` icons

**Files:**
- Modify: `src/components/icons/paths.ts`

**Interfaces:**
- Produces: two new keys in `ICONS` (and therefore `IconName`): `'eye'`, `'eyeOff'`. Consumed by Task 2's `TextField` password-visibility toggle.

- [ ] **Step 1: Add the icons**

Add these two entries to the `_ICONS` object in `src/components/icons/paths.ts`, right after the existing `keypad` entry (before the closing `} satisfies Record<string, IconDef>;`):

```ts
  eye: { viewBox: '0 0 24 24', paths: [
    { d: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z' },
    { d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z' },
  ] },
  eyeOff: { viewBox: '0 0 24 24', paths: [
    { d: 'M9.9 4.24A9.4 9.4 0 0 1 12 4c7 0 11 7 11 7a13.2 13.2 0 0 1-3.2 3.9M6.6 6.6C3.5 8.5 1 12 1 12s4 7 11 7a9.4 9.4 0 0 0 4.4-1.1' },
    { d: 'M14.12 14.12a3 3 0 1 1-4.24-4.24' },
    { d: 'M1 1l22 22' },
  ] },
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors (this is a pure data addition, nothing consumes the new keys yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/icons/paths.ts
git commit -m "feat(icons): add eye/eyeOff icons for password visibility toggle"
```

---

### Task 2: `TextField` password visibility toggle

**Files:**
- Modify: `src/components/ui/TextField.tsx`
- Test: `src/components/ui/__tests__/TextField.test.tsx` (new)

**Interfaces:**
- Consumes: `Icon` (`@/components/icons`), `eye`/`eyeOff` from Task 1.
- Produces: `TextFieldProps` gains `secureTextEntry?: boolean`. When `true`, the field renders masked by default with a tappable toggle (`testID="{testID}-toggle"` when `testID` is provided, else `"textfield-toggle"`) that flips visibility. No other prop changes.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/TextField.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { TextField } from '@/components/ui/TextField';

function renderField(secureTextEntry: boolean) {
  const onChangeText = jest.fn();
  const utils = render(
    <AppProviders>
      <TextField
        testID="pw"
        value="hunter2222"
        onChangeText={onChangeText}
        accent="#000"
        icon="lock"
        placeholder="Password"
        secureTextEntry={secureTextEntry}
      />
    </AppProviders>,
  );
  return utils;
}

it('masks the value by default when secureTextEntry is set', () => {
  const { getByTestId } = renderField(true);
  expect(getByTestId('pw').props.secureTextEntry).toBe(true);
});

it('does not render a toggle when secureTextEntry is not set', () => {
  const { queryByTestId } = renderField(false);
  expect(queryByTestId('pw-toggle')).toBeNull();
});

it('tapping the toggle reveals then re-masks the value', () => {
  const { getByTestId } = renderField(true);
  expect(getByTestId('pw').props.secureTextEntry).toBe(true);
  fireEvent.press(getByTestId('pw-toggle'));
  expect(getByTestId('pw').props.secureTextEntry).toBe(false);
  fireEvent.press(getByTestId('pw-toggle'));
  expect(getByTestId('pw').props.secureTextEntry).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/ui/__tests__/TextField.test.tsx`
Expected: FAIL — `secureTextEntry` prop doesn't exist / toggle testID never renders.

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/ui/TextField.tsx` with:

```tsx
// src/components/ui/TextField.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { useTheme } from '@/theme';
import { TextScale } from '@/theme/typography';
import { Icon, type IconName } from '@/components/icons';

export interface TextFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  accent: string;
  icon: IconName;
  placeholder: string;
  testID?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  value,
  onChangeText,
  accent,
  icon,
  placeholder,
  testID,
  error,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'none',
  secureTextEntry = false,
}) => {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const masked = secureTextEntry && !revealed;

  return (
    <View>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.sunken,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: accent + '22' }]}>
          <Icon name={icon} size={20} color={accent} strokeWidth={2} />
        </View>

        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          style={[TextScale.body, styles.input, { color: colors.ink }]}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          secureTextEntry={masked}
          accessibilityLabel={placeholder}
        />

        {secureTextEntry ? (
          <Pressable
            testID={testID ? `${testID}-toggle` : 'textfield-toggle'}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Icon name={revealed ? 'eyeOff' : 'eye'} size={20} color={colors.inkFaint} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[TextScale.caption, styles.error, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 100,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    gap: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  error: {
    marginTop: 6,
    marginLeft: 16,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/ui/__tests__/TextField.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TextField.tsx src/components/ui/__tests__/TextField.test.tsx
git commit -m "feat(ui): add password visibility toggle to TextField"
```

---

### Task 3: Repository interface + wire schema for login/setPassword

**Files:**
- Modify: `src/data/repositories/types.ts`
- Modify: `src/data/http/auth.schema.ts`
- Test: `src/data/http/__tests__/auth.schema.test.ts`

**Interfaces:**
- Produces: `AuthRepository.login(identifier: string, password: string, roleKey: Role): Promise<Session>` and `AuthRepository.setPassword(password: string): Promise<void>` (both consumed by Tasks 4/5/7). `buildLoginRequest(identifier: string, password: string, roleKey: Role): { email?: string; phone?: string; password: string; role: string }` (consumed by Task 4).

- [ ] **Step 1: Write the failing test**

Add to `src/data/http/__tests__/auth.schema.test.ts` (append a new `describe` block at the end of the file):

```ts
import { buildLoginRequest } from '@/data/http/auth.schema';

describe('buildLoginRequest', () => {
  it('sends email for an @ identifier', () => {
    expect(buildLoginRequest('ramesh@example.com', 'hunter2222', 'driver')).toEqual({
      email: 'ramesh@example.com',
      password: 'hunter2222',
      role: 'driver',
    });
  });

  it('sends phone for a non-@ identifier', () => {
    expect(buildLoginRequest('9876543210', 'hunter2222', 'guard')).toEqual({
      phone: '9876543210',
      password: 'hunter2222',
      role: 'guard',
    });
  });
});
```

(Add the `import` line to the top of the file alongside the existing `auth.schema` import instead of inline, if the file already imports from that module — merge into the existing `import { ... } from '@/data/http/auth.schema';` line.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/http/__tests__/auth.schema.test.ts`
Expected: FAIL — `buildLoginRequest` is not exported.

- [ ] **Step 3: Implement**

In `src/data/repositories/types.ts`, change the `AuthRepository` interface:

```ts
export interface AuthRepository {
  requestOtp(identifier: string): Promise<OtpChallenge>;
  verifyOtp(identifier: string, code: string, roleKey: Role): Promise<Session>;
  login(identifier: string, password: string, roleKey: Role): Promise<Session>;
  setPassword(password: string): Promise<void>;
  refresh(refreshToken: string): Promise<Session>;
  me(previous?: Staff): Promise<Staff>;
  logout(): Promise<void>;
}
```

In `src/data/http/auth.schema.ts`, add this function (near `maskIdentifier`, anywhere after the imports):

```ts
/** Builds the snake_case /auth/login body: email XOR phone, never both. */
export function buildLoginRequest(
  identifier: string,
  password: string,
  roleKey: Role,
): { email?: string; phone?: string; password: string; role: string } {
  const base = { password, role: roleKey };
  return identifier.includes('@') ? { ...base, email: identifier } : { ...base, phone: identifier };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/data/http/__tests__/auth.schema.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: errors in `src/data/http/auth.repo.ts` and `src/data/mock/auth.repo.ts` (they no longer satisfy `AuthRepository` — expected, fixed in Tasks 4/5). No errors elsewhere.

- [ ] **Step 6: Commit**

```bash
git add src/data/repositories/types.ts src/data/http/auth.schema.ts src/data/http/__tests__/auth.schema.test.ts
git commit -m "feat(auth): add login/setPassword to AuthRepository interface"
```

---

### Task 4: HTTP `login` + `setPassword`

**Files:**
- Modify: `src/data/http/auth.repo.ts`
- Test: `src/data/http/__tests__/repos.test.ts`

**Interfaces:**
- Consumes: `buildLoginRequest`, `tokenSchema`, `meSchema`, `toStaffFromMe`, `toTenantFromMe` (Task 3 / existing), `authSnapshot` (existing `@/lib/authSnapshot`).
- Produces: `httpAuth(http).login` and `httpAuth(http).setPassword`, satisfying `AuthRepository`.

- [ ] **Step 1: Write the failing tests**

Add to `src/data/http/__tests__/repos.test.ts`, inside the `describe('http repositories', ...)` block, after the existing `auth.verifyOtp` tests:

```ts
  it('auth.login posts email + password + role, fetches /auth/me, and applies the client-chosen role', async () => {
    const { http, calls } = fakeHttp({
      'POST /auth/login': { access_token: 'a', refresh_token: 'r' },
      'GET /auth/me': meDTO,
    });
    const session = await httpAuth(http).login('r@x.com', 'hunter2222', 'guard');
    expect(session.accessToken).toBe('a');
    expect(session.user.roleKey).toBe('guard');
    expect(calls[0]).toEqual({
      method: 'POST', path: '/auth/login',
      body: { email: 'r@x.com', password: 'hunter2222', role: 'guard' },
    });
  });

  it('auth.login posts phone for a non-email identifier', async () => {
    const { http, calls } = fakeHttp({
      'POST /auth/login': { access_token: 'a', refresh_token: 'r' },
      'GET /auth/me': meDTO,
    });
    await httpAuth(http).login('9876543210', 'hunter2222', 'driver');
    expect(calls[0]).toEqual({
      method: 'POST', path: '/auth/login',
      body: { phone: '9876543210', password: 'hunter2222', role: 'driver' },
    });
  });

  it('auth.setPassword posts the password to /auth/set-password', async () => {
    const { http, calls } = fakeHttp({ 'POST /auth/set-password': {} });
    await httpAuth(http).setPassword('hunter2222');
    expect(calls[0]).toEqual({ method: 'POST', path: '/auth/set-password', body: { password: 'hunter2222' } });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/http/__tests__/repos.test.ts`
Expected: FAIL — `httpAuth(http).login` / `.setPassword` are not functions.

- [ ] **Step 3: Implement**

In `src/data/http/auth.repo.ts`, update the import line and add the two methods:

```ts
import type { AuthRepository } from '@/data/repositories/types';
import type { Session } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import { authSnapshot } from '@/lib/authSnapshot';
import { toSession, type SessionDTO } from './mappers';
import {
  tokenSchema, meSchema, toStaffFromMe, toTenantFromMe, maskIdentifier, buildLoginRequest,
} from './auth.schema';

export function httpAuth(http: HttpClient): AuthRepository {
  return {
    requestOtp: async (identifier) => {
      await http.post('/auth/otp/request', { identifier });
      return {
        channel: identifier.includes('@') ? 'email' : 'sms',
        destination: maskIdentifier(identifier),
      };
    },
    verifyOtp: async (identifier, code, roleKey): Promise<Session> => {
      const t = tokenSchema.parse(await http.post('/auth/otp/verify', { identifier, code }));
      authSnapshot.set({ accessToken: t.access_token, tenantId: null });
      const me = meSchema.parse(await http.get('/auth/me'));
      authSnapshot.set({ accessToken: t.access_token, tenantId: me.tenant_id });
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        user: toStaffFromMe(me, roleKey),
        tenant: toTenantFromMe(me),
      };
    },
    login: async (identifier, password, roleKey): Promise<Session> => {
      const t = tokenSchema.parse(await http.post('/auth/login', buildLoginRequest(identifier, password, roleKey)));
      // Same ordering requirement as verifyOtp: /auth/me is [Authorize].
      authSnapshot.set({ accessToken: t.access_token, tenantId: null });
      const me = meSchema.parse(await http.get('/auth/me'));
      authSnapshot.set({ accessToken: t.access_token, tenantId: me.tenant_id });
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token,
        user: toStaffFromMe(me, roleKey),
        tenant: toTenantFromMe(me),
      };
    },
    setPassword: async (password) => {
      await http.post('/auth/set-password', { password });
    },
    refresh: (refreshToken) =>
      http.post<SessionDTO>('/auth/refresh', { refresh_token: refreshToken }).then(toSession),
    me: async (previous) => {
      const me = meSchema.parse(await http.get('/auth/me'));
      return toStaffFromMe(me, previous?.roleKey ?? 'driver', previous);
    },
    logout: () => http.post<void>('/auth/logout'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/data/http/__tests__/repos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/http/auth.repo.ts src/data/http/__tests__/repos.test.ts
git commit -m "feat(auth): implement http login + setPassword"
```

---

### Task 5: Mock `login` + `setPassword`

**Files:**
- Modify: `src/data/mock/auth.repo.ts`
- Test: `src/data/mock/__tests__/repos.test.ts`

**Interfaces:**
- Produces: `mockAuth(store).login` and `mockAuth(store).setPassword`, satisfying `AuthRepository`. Mock has a single seeded user with no real password store, so: any non-empty identifier + password of length ≥ 8 succeeds (same session shape as `verifyOtp`); password shorter than 8 (or either field empty) throws `AppError('invalid_credentials', 401, ...)`. `setPassword` throws `AppError('weak_password', 422, ...)` for password shorter than 8, otherwise resolves.

- [ ] **Step 1: Write the failing tests**

Add to `src/data/mock/__tests__/repos.test.ts`, inside `describe('mock repositories', ...)`, after the existing `verifyOtp rejects a malformed code` test:

```ts
  it('login sets the chosen role and returns a session for a valid password', async () => {
    const store = await createStore();
    const session = await mockAuth(store).login('98765 43210', 'hunter2222', 'peon');
    expect(session.user.roleKey).toBe('peon');
    expect(session.tenant.name).toBe('Greenfield Public School');
  });

  it('login rejects a too-short password with invalid_credentials', async () => {
    const store = await createStore();
    await expect(mockAuth(store).login('98765 43210', 'short', 'peon')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
  });

  it('setPassword resolves for a valid password', async () => {
    const store = await createStore();
    await expect(mockAuth(store).setPassword('hunter2222')).resolves.toBeUndefined();
  });

  it('setPassword rejects a too-short password with weak_password', async () => {
    const store = await createStore();
    await expect(mockAuth(store).setPassword('short')).rejects.toMatchObject({ code: 'weak_password' });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/mock/__tests__/repos.test.ts`
Expected: FAIL — `mockAuth(store).login` / `.setPassword` are not functions.

- [ ] **Step 3: Implement**

Replace the full contents of `src/data/mock/auth.repo.ts` with:

```ts
import type { AuthRepository } from '@/data/repositories/types';
import type { Session } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';
import { dutyPostByRole } from './seed';

const cloneSession = (s: Store['session']): Session => JSON.parse(JSON.stringify(s)) as Session;
const MIN_PASSWORD_LEN = 8;

export function mockAuth(store: Store): AuthRepository {
  return {
    async requestOtp(identifier) {
      await simulateLatency();
      if (!identifier) throw new AppError('invalid', 400, 'Mobile number or email required');
      return {
        channel: identifier.includes('@') ? 'email' : 'sms',
        destination: identifier,
      };
    },
    async verifyOtp(identifier, code, roleKey) {
      await simulateLatency();
      if (!identifier) throw new AppError('invalid', 400, 'Mobile number or email required');
      if (!/^\d{6}$/.test(code)) throw new AppError('invalid_code', 400, 'Enter the 6-digit code');
      store.session.user.roleKey = roleKey;
      store.session.user.dutyPost = dutyPostByRole[roleKey];
      await store.persistRole();
      return cloneSession(store.session);
    },
    async login(identifier, password, roleKey) {
      await simulateLatency();
      if (!identifier || !password || password.length < MIN_PASSWORD_LEN) {
        throw new AppError('invalid_credentials', 401, 'bad email or password');
      }
      store.session.user.roleKey = roleKey;
      store.session.user.dutyPost = dutyPostByRole[roleKey];
      await store.persistRole();
      return cloneSession(store.session);
    },
    async setPassword(password) {
      await simulateLatency();
      if (password.length < MIN_PASSWORD_LEN) {
        throw new AppError('weak_password', 422, 'password must be at least 8 characters');
      }
    },
    async refresh() {
      await simulateLatency();
      return cloneSession(store.session);
    },
    async me() {
      await simulateLatency();
      return { ...store.session.user };
    },
    async logout() {
      await simulateLatency();
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/data/mock/__tests__/repos.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors — both adapters now satisfy `AuthRepository`.

- [ ] **Step 6: Commit**

```bash
git add src/data/mock/auth.repo.ts src/data/mock/__tests__/repos.test.ts
git commit -m "feat(auth): implement mock login + setPassword"
```

---

### Task 6: New auth error codes

**Files:**
- Modify: `src/features/auth/authErrors.ts`
- Test: create `src/features/auth/__tests__/authErrors.test.ts` (new — none exists today)

**Interfaces:**
- Consumes: `AppError` (`@/lib/errors`, existing).
- Produces: no signature change to `authErrorMessage`; `MESSAGES` gains entries for `password_not_set`, `invalid_credentials`, `wrong_role`, `access_removed`, `access_inactive`, `weak_password`.

- [ ] **Step 1: Write the failing test**

Create `src/features/auth/__tests__/authErrors.test.ts`:

```ts
import { authErrorMessage } from '@/features/auth/authErrors';
import { AppError } from '@/lib/errors';

describe('authErrorMessage — new password-flow codes', () => {
  it.each([
    ['password_not_set', "You haven't set a password yet."],
    ['invalid_credentials', 'Incorrect email/phone or password.'],
    ['wrong_role', 'This account is not registered for that role.'],
    ['access_removed', 'Your access to this school has been removed by the admin.'],
    ['access_inactive', 'Your access to this school has been deactivated by the admin.'],
    ['weak_password', 'Password must be at least 8 characters.'],
  ])('maps %s', (code, expected) => {
    expect(authErrorMessage(new AppError(code, 401, 'server message'))).toBe(expected);
  });

  it('falls back to the server message for wrong_role/access_* when the backend supplies custom copy', () => {
    // Backend sends role/admin-specific wording for these three; prefer it over the static map.
    const err = new AppError('wrong_role', 403, 'Use the Guard tab to sign in.');
    expect(authErrorMessage(err)).toBe('Use the Guard tab to sign in.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/auth/__tests__/authErrors.test.ts`
Expected: FAIL — new codes fall through to the default fallback text instead of the expected copy.

- [ ] **Step 3: Implement**

Replace `src/features/auth/authErrors.ts` with:

```ts
import { AppError } from '@/lib/errors';

const MESSAGES: Record<string, string> = {
  not_registered: "This mobile or email isn't registered.",
  invalid_code: 'Code is invalid or expired.',
  password_not_set: "You haven't set a password yet.",
  invalid_credentials: 'Incorrect email/phone or password.',
  weak_password: 'Password must be at least 8 characters.',
};

// wrong_role / access_removed / access_inactive: the backend supplies specific,
// role- or admin-authored wording (e.g. "Use the Guard tab to sign in.") — prefer
// err.message for these codes rather than a generic static string, falling back
// to a generic line only if the server ever omits it.
const PREFER_SERVER_MESSAGE: Record<string, string> = {
  wrong_role: 'This account is not registered for that role.',
  access_removed: 'Your access to this school has been removed by the admin.',
  access_inactive: 'Your access to this school has been deactivated by the admin.',
};

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

/** Maps an unknown error (usually an AppError from httpClient) to user-facing copy. */
export function authErrorMessage(err: unknown, fallback: string = DEFAULT_FALLBACK): string {
  if (err instanceof AppError) {
    if (err.status === 0) {
      return 'Cannot reach the server. Please check your connection and try again.';
    }
    if (err.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    if (err.code in PREFER_SERVER_MESSAGE) return err.message || PREFER_SERVER_MESSAGE[err.code];
    return MESSAGES[err.code] ?? err.message ?? fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/auth/__tests__/authErrors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/authErrors.ts src/features/auth/__tests__/authErrors.test.ts
git commit -m "feat(auth): map password-login error codes to user-facing copy"
```

---

### Task 7: `AuthProvider` — `pendingPasswordSetup`, `signInWithPassword`, `completePasswordSetup`

**Files:**
- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/hooks.ts`
- Modify: `src/features/auth/__tests__/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: `repos.auth.login`, `repos.auth.setPassword` (Tasks 4/5), existing `establishSession`.
- Produces: `AuthValue` gains `pendingPasswordSetup: Session | null`, `signInWithPassword(identifier: string, password: string, roleKey: Role): Promise<void>`, `completePasswordSetup(password: string): Promise<void>`, `cancelPasswordSetup(): void`. `signInWithOtp` no longer calls `establishSession` — it sets `pendingPasswordSetup` instead. Consumed by Task 9 (`LoginScreen`) via new hooks `useLogin`, `useSetPassword` in `hooks.ts`.

- [ ] **Step 1: Write the failing tests**

Replace `src/features/auth/__tests__/AuthProvider.test.tsx` in full with:

```tsx
import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
jest.mock('expo-secure-store', () => {
  let mem: Record<string, string> = {};
  return {
    setItemAsync: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    deleteItemAsync: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
  };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

function Harness() {
  const {
    status, session, pendingPasswordSetup,
    signInWithOtp, signInWithPassword, completePasswordSetup, cancelPasswordSetup, signOut,
  } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="pending">{pendingPasswordSetup ? 'yes' : 'no'}</Text>
      <Text testID="school">{session?.tenant.name ?? ''}</Text>
      <Text testID="role">{session?.user.roleKey ?? ''}</Text>
      <Pressable testID="otp-in" onPress={() => signInWithOtp('98765 43210', '123456', 'conductor')}><Text>otp-in</Text></Pressable>
      <Pressable testID="pw-in" onPress={() => signInWithPassword('98765 43210', 'hunter2222', 'peon')}><Text>pw-in</Text></Pressable>
      <Pressable testID="complete" onPress={() => completePasswordSetup('hunter2222')}><Text>complete</Text></Pressable>
      <Pressable testID="cancel" onPress={() => cancelPasswordSetup()}><Text>cancel</Text></Pressable>
      <Pressable testID="out" onPress={() => signOut()}><Text>out</Text></Pressable>
    </>
  );
}

async function renderWithProviders() {
  const repos = createMockRepositories(await createStore());
  return render(
    <RepositoryProvider repositories={repos}>
      <AuthProvider><Harness /></AuthProvider>
    </RepositoryProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('starts unauthenticated with no stored session', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('signInWithPassword authenticates directly and exposes school + role', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    fireEvent.press(screen.getByTestId('pw-in'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('school')).toHaveTextContent('Greenfield Public School');
    expect(screen.getByTestId('role')).toHaveTextContent('peon');
  });

  it('signInWithOtp verifies but stays unauthenticated, marking pendingPasswordSetup', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    fireEvent.press(screen.getByTestId('otp-in'));
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('yes'));
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('completePasswordSetup sets the password then authenticates', async () => {
    await renderWithProviders();
    fireEvent.press(screen.getByTestId('otp-in'));
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('yes'));
    fireEvent.press(screen.getByTestId('complete'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('pending')).toHaveTextContent('no');
    expect(screen.getByTestId('role')).toHaveTextContent('conductor');
  });

  it('cancelPasswordSetup clears the pending session without authenticating', async () => {
    await renderWithProviders();
    fireEvent.press(screen.getByTestId('otp-in'));
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('yes'));
    fireEvent.press(screen.getByTestId('cancel'));
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('no'));
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('fails safe to unauthenticated when token storage throws during bootstrap', async () => {
    const SecureStore = require('expo-secure-store');
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('SecureStore.getValueWithKeyAsync is not a function'),
    );
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('signOut returns to unauthenticated', async () => {
    await renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    fireEvent.press(screen.getByTestId('pw-in'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    fireEvent.press(screen.getByTestId('out'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/auth/__tests__/AuthProvider.test.tsx`
Expected: FAIL — `signInWithPassword`, `completePasswordSetup`, `cancelPasswordSetup`, `pendingPasswordSetup` don't exist on `AuthValue`; `signInWithOtp` still authenticates directly.

- [ ] **Step 3: Implement**

Replace `src/features/auth/AuthProvider.tsx` in full with:

```tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@/data/domain';
import type { Role } from '@/theme/roles';
import type { OtpChallenge } from '@/data/repositories/types';
import { tokenStore } from '@/lib/tokenStore';
import { asyncStore } from '@/lib/asyncStore';
import { authSnapshot } from '@/lib/authSnapshot';
import { queryClient } from '@/lib/queryClient';
import { useRepositories } from '@/data/repositories/RepositoryContext';

const SESSION_KEY = 'sms.session';

type Status = 'loading' | 'authenticated' | 'unauthenticated';
interface AuthValue {
  status: Status;
  session: Session | null;
  /** Set once OTP verify succeeds; the caller must set a password before this
   *  becomes the real session (see completePasswordSetup). Non-null means the
   *  Set Password screen should be showing. */
  pendingPasswordSetup: Session | null;
  requestOtp: (identifier: string) => Promise<OtpChallenge>;
  signInWithOtp: (identifier: string, code: string, roleKey: Role) => Promise<void>;
  signInWithPassword: (identifier: string, password: string, roleKey: Role) => Promise<void>;
  completePasswordSetup: (password: string) => Promise<void>;
  cancelPasswordSetup: () => void;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repos = useRepositories();
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [pendingPasswordSetup, setPendingPasswordSetup] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const tokens = await tokenStore.read();
        const stored = await asyncStore.get<Session>(SESSION_KEY);
        if (!tokens || !stored) {
          if (tokens) await tokenStore.clear();
          setStatus('unauthenticated');
          return;
        }
        try {
          authSnapshot.set({ accessToken: tokens.accessToken, tenantId: stored.tenant.id });
          const user = await repos.auth.me(stored.user);
          const rehydrated: Session = { ...stored, ...tokens, user };
          authSnapshot.set({ accessToken: rehydrated.accessToken, tenantId: rehydrated.tenant.id });
          setSession(rehydrated);
          setStatus('authenticated');
        } catch {
          await tokenStore.clear();
          await asyncStore.remove(SESSION_KEY);
          setStatus('unauthenticated');
        }
      } catch {
        setStatus('unauthenticated');
      }
    })();
  }, [repos]);

  const establishSession = useCallback(async (s: Session) => {
    await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
    await asyncStore.set(SESSION_KEY, s);
    authSnapshot.set({ accessToken: s.accessToken, tenantId: s.tenant.id });
    setSession(s);
    setStatus('authenticated');
  }, []);

  const requestOtp = useCallback(
    (identifier: string) => repos.auth.requestOtp(identifier),
    [repos],
  );

  // OTP verify only ever feeds the password-setup flow now: it authenticates
  // with the backend (tokens are live) but must not flip app status to
  // 'authenticated' until a password is set, so the pending session is held
  // here instead of passed to establishSession.
  const signInWithOtp = useCallback(
    async (identifier: string, code: string, roleKey: Role) => {
      const s = await repos.auth.verifyOtp(identifier, code, roleKey);
      authSnapshot.set({ accessToken: s.accessToken, tenantId: s.tenant.id });
      setPendingPasswordSetup(s);
    },
    [repos],
  );

  const signInWithPassword = useCallback(
    async (identifier: string, password: string, roleKey: Role) => {
      const s = await repos.auth.login(identifier, password, roleKey);
      await establishSession(s);
    },
    [repos, establishSession],
  );

  const completePasswordSetup = useCallback(
    async (password: string) => {
      if (!pendingPasswordSetup) throw new Error('completePasswordSetup called with no pending session');
      await repos.auth.setPassword(password);
      const s = pendingPasswordSetup;
      setPendingPasswordSetup(null);
      await establishSession(s);
    },
    [repos, pendingPasswordSetup, establishSession],
  );

  const cancelPasswordSetup = useCallback(() => {
    authSnapshot.clear();
    setPendingPasswordSetup(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await repos.auth.logout();
    } finally {
      await tokenStore.clear();
      await asyncStore.remove(SESSION_KEY);
      authSnapshot.clear();
      queryClient.clear();
      setSession(null);
      setPendingPasswordSetup(null);
      setStatus('unauthenticated');
    }
  }, [repos]);

  const value = useMemo<AuthValue>(
    () => ({
      status, session, pendingPasswordSetup,
      requestOtp, signInWithOtp, signInWithPassword, completePasswordSetup, cancelPasswordSetup, signOut,
    }),
    [status, session, pendingPasswordSetup, requestOtp, signInWithOtp, signInWithPassword, completePasswordSetup, cancelPasswordSetup, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Context-safe: returns 'anon' when there is no AuthProvider (used by query keys).
export function useTenantId(): string {
  const ctx = useContext(AuthContext);
  return ctx?.session?.tenant.id ?? 'anon';
}
```

Replace `src/features/auth/hooks.ts` in full with:

```ts
import { useMutation } from '@tanstack/react-query';
import type { Role } from '@/theme/roles';
import { useAuth } from './AuthProvider';

export function useRequestOtp() {
  const { requestOtp } = useAuth();
  return useMutation({ mutationFn: (identifier: string) => requestOtp(identifier) });
}

export function useVerifyOtp() {
  const { signInWithOtp } = useAuth();
  return useMutation({
    mutationFn: ({ identifier, code, roleKey }: { identifier: string; code: string; roleKey: Role }) =>
      signInWithOtp(identifier, code, roleKey),
  });
}

export function useLogin() {
  const { signInWithPassword } = useAuth();
  return useMutation({
    mutationFn: ({ identifier, password, roleKey }: { identifier: string; password: string; roleKey: Role }) =>
      signInWithPassword(identifier, password, roleKey),
  });
}

export function useSetPassword() {
  const { completePasswordSetup } = useAuth();
  return useMutation({ mutationFn: (password: string) => completePasswordSetup(password) });
}

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: () => signOut() });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/auth/__tests__/AuthProvider.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/AuthProvider.tsx src/features/auth/hooks.ts src/features/auth/__tests__/AuthProvider.test.tsx
git commit -m "feat(auth): add password sign-in and pending password-setup state"
```

---

### Task 8: i18n keys

**Files:**
- Modify: `src/i18n/resources/en.json`, `src/i18n/resources/hi.json`, `src/i18n/resources/mr.json`, `src/i18n/resources/ta.json`

**Interfaces:**
- Produces: the i18n keys consumed by Task 9 (`LoginScreen`) and Task 10 (`SetPasswordScreen` content, rendered inside `LoginScreen`).

- [ ] **Step 1: Add keys to `en.json`**

In `src/i18n/resources/en.json`, insert these keys right after `"login.invalidEmail": "Enter a valid email address",` (still inside the same object, comma-separated, keep valid JSON):

```json
  "login.password": "Password",
  "login.login": "Log in",
  "login.invalidPassword": "Enter your password",
  "login.firstTimeOrForgot": "First time here? Forgot password?",
  "login.otpSetupSubtitle": "We'll send you a one-time code to set your password",
  "login.backToPasswordLogin": "Back to password login",
  "setPassword.title": "Set your password",
  "setPassword.subtitle": "Choose a password for future logins",
  "setPassword.newPassword": "New password",
  "setPassword.confirmPassword": "Confirm password",
  "setPassword.mismatch": "Passwords don't match",
  "setPassword.tooShort": "Password must be at least 8 characters",
  "setPassword.cta": "Set password & continue",
```

- [ ] **Step 2: Add the same keys (translated) to `hi.json`, `mr.json`, `ta.json`**

Insert the equivalent block at the same relative position (after the `login.invalidEmail` key) in each file:

`src/i18n/resources/hi.json`:
```json
  "login.password": "पासवर्ड",
  "login.login": "लॉग इन करें",
  "login.invalidPassword": "अपना पासवर्ड दर्ज करें",
  "login.firstTimeOrForgot": "पहली बार आए हैं? पासवर्ड भूल गए?",
  "login.otpSetupSubtitle": "पासवर्ड सेट करने के लिए हम आपको एक बार का कोड भेजेंगे",
  "login.backToPasswordLogin": "पासवर्ड लॉगिन पर वापस जाएं",
  "setPassword.title": "अपना पासवर्ड सेट करें",
  "setPassword.subtitle": "आगे के लॉगिन के लिए एक पासवर्ड चुनें",
  "setPassword.newPassword": "नया पासवर्ड",
  "setPassword.confirmPassword": "पासवर्ड की पुष्टि करें",
  "setPassword.mismatch": "पासवर्ड मेल नहीं खाते",
  "setPassword.tooShort": "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए",
  "setPassword.cta": "पासवर्ड सेट करें और जारी रखें",
```

`src/i18n/resources/mr.json`:
```json
  "login.password": "पासवर्ड",
  "login.login": "लॉग इन करा",
  "login.invalidPassword": "तुमचा पासवर्ड टाका",
  "login.firstTimeOrForgot": "प्रथमच आलात? पासवर्ड विसरलात?",
  "login.otpSetupSubtitle": "पासवर्ड सेट करण्यासाठी आम्ही तुम्हाला वन-टाइम कोड पाठवू",
  "login.backToPasswordLogin": "पासवर्ड लॉगिनकडे परत जा",
  "setPassword.title": "तुमचा पासवर्ड सेट करा",
  "setPassword.subtitle": "पुढील लॉगिनसाठी पासवर्ड निवडा",
  "setPassword.newPassword": "नवीन पासवर्ड",
  "setPassword.confirmPassword": "पासवर्डची पुष्टी करा",
  "setPassword.mismatch": "पासवर्ड जुळत नाहीत",
  "setPassword.tooShort": "पासवर्ड किमान 8 अक्षरांचा असावा",
  "setPassword.cta": "पासवर्ड सेट करा आणि पुढे जा",
```

`src/i18n/resources/ta.json`:
```json
  "login.password": "கடவுச்சொல்",
  "login.login": "உள்நுழைக",
  "login.invalidPassword": "உங்கள் கடவுச்சொல்லை உள்ளிடவும்",
  "login.firstTimeOrForgot": "முதல் முறையா? கடவுச்சொல் மறந்துவிட்டதா?",
  "login.otpSetupSubtitle": "கடவுச்சொல்லை அமைக்க ஒரு முறை குறியீட்டை அனுப்புவோம்",
  "login.backToPasswordLogin": "கடவுச்சொல் உள்நுழைவுக்குத் திரும்பு",
  "setPassword.title": "உங்கள் கடவுச்சொல்லை அமைக்கவும்",
  "setPassword.subtitle": "அடுத்த உள்நுழைவுகளுக்கான கடவுச்சொல்லைத் தேர்ந்தெடுக்கவும்",
  "setPassword.newPassword": "புதிய கடவுச்சொல்",
  "setPassword.confirmPassword": "கடவுச்சொல்லை உறுதிப்படுத்தவும்",
  "setPassword.mismatch": "கடவுச்சொற்கள் பொருந்தவில்லை",
  "setPassword.tooShort": "கடவுச்சொல் குறைந்தது 8 எழுத்துகள் இருக்க வேண்டும்",
  "setPassword.cta": "கடவுச்சொல்லை அமைத்து தொடரவும்",
```

- [ ] **Step 3: Validate all four files are still valid JSON**

Run: `node -e "['en','hi','mr','ta'].forEach(l => JSON.parse(require('fs').readFileSync('src/i18n/resources/'+l+'.json','utf8')))"`
Expected: no output, exit code 0 (throws on any parse error).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/resources/en.json src/i18n/resources/hi.json src/i18n/resources/mr.json src/i18n/resources/ta.json
git commit -m "feat(i18n): add password login + set-password copy for all locales"
```

---

### Task 9: `LoginScreen` — password-first login + OTP-setup entry point

**Files:**
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/screens/__tests__/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `useLogin`, `useVerifyOtp`, `useRequestOtp` (Task 7 `hooks.ts`), `useAuth().pendingPasswordSetup` (Task 7), `authErrorMessage` (Task 6), `TextField` with `secureTextEntry` (Task 2), new i18n keys (Task 8).
- Produces: when `pendingPasswordSetup` is set, renders the Set Password UI in place of the login form (Task 10's content lives in this same file — see Task 10 for the split-out decision).

`Mode` replaces the old `Step` union: `'password' | 'otp-request' | 'otp-verify'`. Default `'password'`.

- [ ] **Step 1: Write the failing tests**

Replace `src/screens/__tests__/LoginScreen.test.tsx` in full with:

```tsx
import React from 'react';
import { fireEvent, waitFor, render } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { LoginScreen } from '@/screens/LoginScreen';

function renderLogin() { return render(<AppProviders><LoginScreen /></AppProviders>); }

it('password login is the default mode: phone + password fields, CTA disabled until both are valid', async () => {
  const { getByTestId } = renderLogin();
  await waitFor(() => getByTestId('phone-input'));
  expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(true);
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  fireEvent.changeText(getByTestId('password-input'), 'hunter2222');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
});

it('switching to the Email tab swaps in an email field with its own validation', async () => {
  const { getByTestId } = renderLogin();
  await waitFor(() => getByTestId('channel-email'));
  fireEvent.press(getByTestId('channel-email'));
  await waitFor(() => getByTestId('email-input'));
  fireEvent.changeText(getByTestId('email-input'), 'not-an-email');
  fireEvent.changeText(getByTestId('password-input'), 'hunter2222');
  expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(true);
  fireEvent.changeText(getByTestId('email-input'), 'ramesh@example.com');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
});

it('tapping "first time / forgot password" enters the OTP flow', async () => {
  const { getByTestId, queryByTestId } = renderLogin();
  await waitFor(() => getByTestId('first-time-link'));
  fireEvent.press(getByTestId('first-time-link'));
  await waitFor(() => getByTestId('send-otp-cta'));
  expect(queryByTestId('password-input')).toBeNull();
});

it('sending an OTP from the setup flow advances to the verification step', async () => {
  const { getByTestId, queryByTestId } = renderLogin();
  await waitFor(() => getByTestId('first-time-link'));
  fireEvent.press(getByTestId('first-time-link'));
  await waitFor(() => getByTestId('phone-input'));
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  await waitFor(() => expect(getByTestId('send-otp-cta').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('send-otp-cta'));
  await waitFor(() => getByTestId('otp-input'));
  expect(queryByTestId('verify-cta')).toBeTruthy();
});

it('verifying the OTP in the setup flow shows the Set Password screen instead of logging in', async () => {
  const { getByTestId } = renderLogin();
  await waitFor(() => getByTestId('first-time-link'));
  fireEvent.press(getByTestId('first-time-link'));
  await waitFor(() => getByTestId('phone-input'));
  fireEvent.changeText(getByTestId('phone-input'), '98765 43210');
  await waitFor(() => expect(getByTestId('send-otp-cta').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('send-otp-cta'));
  await waitFor(() => getByTestId('otp-input'));
  fireEvent.changeText(getByTestId('otp-input'), '123456');
  fireEvent.press(getByTestId('verify-cta'));
  await waitFor(() => getByTestId('set-password-new-input'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/LoginScreen.test.tsx`
Expected: FAIL — no `password-input`, `first-time-link`, `send-otp-cta`, or `set-password-new-input` testIDs exist yet.

- [ ] **Step 3: Implement**

Replace `src/screens/LoginScreen.tsx` in full with:

```tsx
// src/screens/LoginScreen.tsx — production Login screen
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useTheme } from '@/theme';
import { ROLES, type Role } from '@/theme/roles';
import { TextScale } from '@/theme/typography';
import { SUPPORTED_LANGUAGES, setLanguage, i18n, type LanguageCode } from '@/i18n';
import { useRequestOtp, useVerifyOtp, useLogin, useSetPassword } from '@/features/auth/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/authErrors';
import { isAppError } from '@/lib/errors';
import {
  Btn,
  SectionLabel,
  BrandCap,
  LanguagePicker,
  RoleGrid,
  PhoneField,
  TextField,
} from '@/components/ui';
import { Icon } from '@/components/icons';

type Channel = 'mobile' | 'email';
type Mode = 'password' | 'otp-request' | 'otp-verify';
const MIN_PASSWORD_LEN = 8;

const phoneSchema = z.string().regex(/^[6-9]\d{9}$/);
const emailSchema = z.string().email();

function stripPhone(raw: string): string {
  return raw.replace(/\s/g, '');
}

function isValidPhone(raw: string): boolean {
  return phoneSchema.safeParse(stripPhone(raw)).success;
}

function isValidEmail(raw: string): boolean {
  return emailSchema.safeParse(raw.trim()).success;
}

export const LoginScreen = () => {
  const { t } = useTranslation();
  const { colors, roleKey, setRole } = useTheme();
  const { pendingPasswordSetup, cancelPasswordSetup } = useAuth();
  const login = useLogin();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const setPassword = useSetPassword();

  const [selected, setSelected] = useState<Role>(roleKey);
  const [channel, setChannel] = useState<Channel>('mobile');
  const [mode, setMode] = useState<Mode>('password');
  const [phone, setPhone] = useState('98765 43210');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [destination, setDestination] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupTouched, setSetupTouched] = useState(false);

  const identifier = channel === 'mobile' ? stripPhone(phone) : email.trim();
  const identifierValid = channel === 'mobile' ? isValidPhone(phone) : isValidEmail(email);
  const showIdentifierError = touched && !identifierValid && identifier.length > 0;
  const passwordValid = password.length >= MIN_PASSWORD_LEN;

  const loginErr = login.error ? authErrorMessage(login.error) : null;
  const requestErr = requestOtp.error ? authErrorMessage(requestOtp.error) : null;
  const verifyErr = verifyOtp.error ? authErrorMessage(verifyOtp.error) : null;
  const setPasswordErr = setPassword.error ? authErrorMessage(setPassword.error) : null;

  const currentLang = i18n.language as LanguageCode;
  const languageNative =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.native ?? 'English';

  function handleSelectRole(r: Role) {
    setSelected(r);
    setRole(r);
  }

  function handleSelectLanguage(code: LanguageCode) {
    void setLanguage(code);
    setLangOpen(false);
  }

  function resetOtpState() {
    setCode('');
    setDestination('');
    requestOtp.reset();
    verifyOtp.reset();
  }

  function handleChangeChannel(next: Channel) {
    setChannel(next);
    setTouched(false);
    resetOtpState();
    login.reset();
  }

  function enterOtpSetup() {
    setMode('otp-request');
    resetOtpState();
    login.reset();
  }

  function backToPasswordLogin() {
    setMode('password');
    resetOtpState();
  }

  function handleLogin() {
    login.mutate({ identifier, password, roleKey: selected }, {
      onError: (err) => {
        if (isAppError(err) && err.code === 'password_not_set') {
          enterOtpSetup();
        }
      },
    });
  }

  function handleSendOtp() {
    verifyOtp.reset();
    setCode('');
    requestOtp.mutate(identifier, {
      onSuccess: (challenge) => {
        setDestination(challenge.destination);
        setMode('otp-verify');
      },
    });
  }

  function handleVerifyOtp() {
    verifyOtp.mutate({ identifier, code, roleKey: selected });
  }

  function handleChangeIdentifierInSetup() {
    setMode('otp-request');
    setCode('');
    setDestination('');
    verifyOtp.reset();
    requestOtp.reset();
  }

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const newPasswordValid = newPassword.length >= MIN_PASSWORD_LEN;
  const showMismatch = setupTouched && confirmPassword.length > 0 && !passwordsMatch;
  const showTooShort = setupTouched && newPassword.length > 0 && !newPasswordValid;

  function handleSetPassword() {
    setSetupTouched(true);
    if (!newPasswordValid || !passwordsMatch) return;
    setPassword.mutate(newPassword);
  }

  const accent = ROLES[selected].accent;

  if (pendingPasswordSetup) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.bg }]}
        edges={['left', 'right', 'bottom']}
      >
        <BrandCap onPressLanguage={() => setLangOpen(true)} languageNative={languageNative} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetingBlock}>
            <Text style={[TextScale.hero, { color: colors.ink }]}>{t('setPassword.title')}</Text>
            <Text style={[TextScale.body, { color: colors.inkSoft }]}>{t('setPassword.subtitle')}</Text>
          </View>

          <TextField
            testID="set-password-new-input"
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); setSetupTouched(true); }}
            accent={accent}
            icon="lock"
            placeholder={t('setPassword.newPassword')}
            secureTextEntry
            error={showTooShort ? t('setPassword.tooShort') : undefined}
          />
          <TextField
            testID="set-password-confirm-input"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setSetupTouched(true); }}
            accent={accent}
            icon="lock"
            placeholder={t('setPassword.confirmPassword')}
            secureTextEntry
            error={showMismatch ? t('setPassword.mismatch') : undefined}
          />
          {setPasswordErr && (
            <Text style={[TextScale.caption, { color: colors.danger }]}>{setPasswordErr}</Text>
          )}

          <Btn
            testID="set-password-cta"
            label={t('setPassword.cta')}
            onPress={handleSetPassword}
            loading={setPassword.isPending}
            accent={accent}
          />

          <Pressable onPress={cancelPasswordSetup}>
            <Text style={[TextScale.button, { color: accent }]}>{t('common.back')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
      edges={['left', 'right', 'bottom']}
    >
      <LanguagePicker
        visible={langOpen}
        current={currentLang}
        onSelect={handleSelectLanguage}
        onClose={() => setLangOpen(false)}
      />

      <BrandCap
        onPressLanguage={() => setLangOpen(true)}
        languageNative={languageNative}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingBlock}>
          <Text style={[TextScale.hero, { color: colors.ink }]}>
            {t('login.greeting')}
          </Text>
          <Text style={[TextScale.body, { color: colors.inkSoft }]}>
            {mode === 'otp-verify'
              ? t('login.enterCode')
              : mode === 'otp-request'
                ? t('login.otpSetupSubtitle')
                : t('login.subtitle')}
          </Text>
        </View>

        <SectionLabel title={t('login.selectRole')} />
        <RoleGrid selected={selected} onSelect={handleSelectRole} />

        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.sunken }]}>
          <Pressable
            testID="channel-mobile"
            onPress={() => handleChangeChannel('mobile')}
            style={[styles.tab, channel === 'mobile' && { backgroundColor: accent }]}
          >
            <Text
              style={[
                TextScale.button,
                { color: channel === 'mobile' ? colors.onPrimary : colors.inkSoft },
              ]}
            >
              {t('login.mobileTab')}
            </Text>
          </Pressable>
          <Pressable
            testID="channel-email"
            onPress={() => handleChangeChannel('email')}
            style={[styles.tab, channel === 'email' && { backgroundColor: accent }]}
          >
            <Text
              style={[
                TextScale.button,
                { color: channel === 'email' ? colors.onPrimary : colors.inkSoft },
              ]}
            >
              {t('login.emailTab')}
            </Text>
          </Pressable>
        </View>

        {channel === 'mobile' ? (
          <PhoneField
            value={phone}
            onChangeText={(v) => { setPhone(v); setTouched(true); }}
            accent={accent}
            error={showIdentifierError ? t('login.invalidPhone') : undefined}
          />
        ) : (
          <TextField
            testID="email-input"
            value={email}
            onChangeText={(v) => { setEmail(v); setTouched(true); }}
            accent={accent}
            icon="mail"
            placeholder={t('login.email')}
            keyboardType="email-address"
            error={showIdentifierError ? t('login.invalidEmail') : undefined}
          />
        )}

        {mode === 'password' && (
          <>
            <TextField
              testID="password-input"
              value={password}
              onChangeText={setPassword}
              accent={accent}
              icon="lock"
              placeholder={t('login.password')}
              secureTextEntry
            />
            {loginErr && (
              <Text style={[TextScale.caption, { color: colors.danger }]}>{loginErr}</Text>
            )}

            <Btn
              testID="login-cta"
              label={t('login.login')}
              onPress={handleLogin}
              loading={login.isPending}
              disabled={!identifierValid || !passwordValid}
              accent={accent}
            />

            <Pressable testID="first-time-link" onPress={enterOtpSetup}>
              <Text style={[TextScale.button, { color: accent }]}>{t('login.firstTimeOrForgot')}</Text>
            </Pressable>
          </>
        )}

        {mode === 'otp-request' && (
          <>
            {requestErr && (
              <Text style={[TextScale.caption, { color: colors.danger }]}>{requestErr}</Text>
            )}
            <Btn
              testID="send-otp-cta"
              label={t('login.sendOtp')}
              onPress={handleSendOtp}
              loading={requestOtp.isPending}
              disabled={!identifierValid}
              accent={accent}
            />
            <Pressable testID="back-to-password-link" onPress={backToPasswordLogin}>
              <Text style={[TextScale.button, { color: accent }]}>{t('login.backToPasswordLogin')}</Text>
            </Pressable>
          </>
        )}

        {mode === 'otp-verify' && (
          <>
            <Text style={[TextScale.caption, styles.codeSentText, { color: colors.inkSoft }]}>
              {t('login.codeSentTo', { destination })}
            </Text>
            <TextField
              testID="otp-input"
              value={code}
              onChangeText={setCode}
              accent={accent}
              icon="keypad"
              placeholder={t('login.enterCode')}
              keyboardType="number-pad"
              maxLength={6}
              error={verifyErr ?? undefined}
            />

            <Btn
              testID="verify-cta"
              label={t('login.verifyOtp')}
              onPress={handleVerifyOtp}
              loading={verifyOtp.isPending}
              disabled={code.length !== 6}
              accent={accent}
            />

            <View style={styles.linksRow}>
              <Pressable onPress={handleSendOtp} disabled={requestOtp.isPending}>
                <Text style={[TextScale.button, { color: accent }]}>{t('login.resend')}</Text>
              </Pressable>
              <Pressable onPress={handleChangeIdentifierInSetup}>
                <Text style={[TextScale.button, { color: accent }]}>{t('login.change')}</Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Icon name="lock" size={14} color={colors.inkFaint} strokeWidth={2} />
          <Text style={[TextScale.caption, { color: colors.inkFaint }]}>
            {t('login.securedBy')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 20,
  },
  greetingBlock: {
    gap: 6,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 100,
    borderWidth: 1.5,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeSentText: {
    marginTop: -8,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/LoginScreen.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/LoginScreen.tsx src/screens/__tests__/LoginScreen.test.tsx
git commit -m "feat(login): password-first login with OTP-based first-time/forgot-password setup"
```

---

### Task 10: Integration test — full setup-to-login round trip

**Files:**
- Modify: `src/__tests__/integration.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–9 through the public `LoginScreen` + `RootNavigator` surface. No new production interfaces.

The existing test in this file presses `login-cta` immediately, relying on
the old behavior where the phone field alone (pre-filled, valid) enabled it.
Under the new default password-login mode, `login-cta` also requires a
password, so that test's step 5 no longer authenticates — it must be
rewritten, not just appended to.

- [ ] **Step 1: Write the failing test**

Replace `src/__tests__/integration.test.tsx` in full with:

```tsx
// src/__tests__/integration.test.tsx
// Integration smoke test: boot → Splash → Login → sign-in → Home with school identity.
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppProviders } from '@/providers/AppProviders';
import { RootNavigator } from '@/navigation/RootNavigator';

// Mirror the secure-store mock from AuthProvider.test.tsx
jest.mock('expo-secure-store', () => {
  let mem: Record<string, string> = {};
  return {
    setItemAsync: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    getItemAsync: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    deleteItemAsync: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
  };
});

// expo-location is imported transitively through AttendanceScreen; mock it so it
// never tries to access native modules in the test environment.
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
  requestBackgroundPermissionsAsync: async () => ({ status: 'granted' }),
  getCurrentPositionAsync: async () => ({
    coords: { latitude: 0, longitude: 0, accuracy: 8 },
  }),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(() => Promise.resolve(false)),
  Accuracy: { High: 6 },
}));

// expo-task-manager is imported transitively through TripScreen → broadcaster;
// defineTask runs at module load time so we mock the whole module.
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

// Reanimated mock — Splash uses reanimated; the mock keeps it inert in tests.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

function renderApp() {
  return render(
    <AppProviders>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>,
  );
}

async function pastSplash(getByTestId: ReturnType<typeof render>['getByTestId']) {
  await waitFor(() => getByTestId('splash'), { timeout: 5000 });
  await waitFor(() => getByTestId('splash'), { timeout: 3000 });
  fireEvent.press(getByTestId('splash'));
}

it('logs in with identifier + password and lands on Home with school identity', async () => {
  const { getByTestId, findByText } = renderApp();
  await pastSplash(getByTestId);

  // Login screen defaults to password mode; phone field is pre-filled valid.
  await waitFor(() => getByTestId('password-input'), { timeout: 5000 });
  fireEvent.changeText(getByTestId('password-input'), 'hunter2222');
  await waitFor(() => expect(getByTestId('login-cta').props.accessibilityState?.disabled).toBe(false));
  fireEvent.press(getByTestId('login-cta'));

  expect(await findByText('Greenfield Public School', {}, { timeout: 5000 })).toBeTruthy();
}, 20000);

it('first-time staff: OTP verify -> set password -> lands on the authenticated app', async () => {
  const { getByTestId, findByText } = renderApp();
  await pastSplash(getByTestId);

  await waitFor(() => getByTestId('first-time-link'), { timeout: 5000 });
  fireEvent.press(getByTestId('first-time-link'));

  // Phone field defaults to '98765 43210' (valid), so send-otp-cta is enabled.
  await waitFor(() => getByTestId('send-otp-cta'), { timeout: 3000 });
  fireEvent.press(getByTestId('send-otp-cta'));
  await waitFor(() => getByTestId('otp-input'), { timeout: 5000 });

  // Mock verifyOtp accepts any 6-digit code.
  fireEvent.changeText(getByTestId('otp-input'), '123456');
  fireEvent.press(getByTestId('verify-cta'));

  // Verify succeeds but must NOT authenticate directly — Set Password shows first.
  await waitFor(() => getByTestId('set-password-new-input'), { timeout: 5000 });

  fireEvent.changeText(getByTestId('set-password-new-input'), 'hunter2222');
  fireEvent.changeText(getByTestId('set-password-confirm-input'), 'hunter2222');
  fireEvent.press(getByTestId('set-password-cta'));

  expect(await findByText('Greenfield Public School', {}, { timeout: 5000 })).toBeTruthy();
}, 20000);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration.test.tsx`
Expected: FAIL if run before Tasks 1–9 are complete (missing testIDs). If run after Tasks 1–9, this should already pass without further production changes since it only exercises existing surfaces — if it fails at that point, the failure is a real gap in an earlier task and must be fixed there, not worked around here.

- [ ] **Step 3: Run test to verify it passes**

Run: `npx jest src/__tests__/integration.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/integration.test.tsx
git commit -m "test: cover password login and the first-time password setup round trip end-to-end"
```

---

### Task 11: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including every file touched in Tasks 1–10.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (fix any and re-run if needed; do not disable rules to silence them).

- [ ] **Step 4: Manual smoke test in the browser**

Start the app (`npm run web`), then in the running app:
1. Confirm the Login screen shows phone + password fields by default, with the "First time? / Forgot password?" link.
2. Tap the link, request an OTP (mock data source accepts any 10-digit number), enter any 6-digit code, verify.
3. Confirm the Set Password screen appears (not the app home).
4. Enter matching 8+ character passwords, submit, confirm the app now shows the authenticated Home screen.
5. Log out, then log back in on the password tab using the same identifier + password just set, confirm it authenticates directly (no OTP).

If any step fails, fix the underlying task before proceeding — do not report this plan complete with a failing manual check.
