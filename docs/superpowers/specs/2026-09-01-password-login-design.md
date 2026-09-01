# Password login + first-time password setup

Status: approved for planning
Date: 2026-09-01

## Problem

Today `LoginScreen` only supports OTP login: enter identifier (mobile or
email) → request OTP → verify OTP → session established. There is no
password. The backend (`sms-backend`) already supports password login and
first-time/forgot-password setup; the staff app needs to adopt it.

Target flow: identifier + password is the default way to log in. A staff
member who hasn't set a password yet (or forgot it) verifies an OTP sent to
their mobile or email, then sets a password, and is signed in.

## Backend contract (already exists, `sms-backend`, `src/Sms.Api/Controllers/LoginController.cs`)

All routes under `v1/auth`, all bodies/responses **snake_case** JSON
(`Sms.Application/DTOs/Auth/LoginModels.cs`):

| Route | Auth | Request | Response | Notes |
|---|---|---|---|---|
| `POST /login` | anon | `{ email?, password?, student_id?, phone?, role?, tenant_id? }` | `TokenResponse` (`{access_token, refresh_token}`) | Exactly one of `email`/`phone`/`student_id` + `password` |
| `POST /otp/request` | anon | `{ identifier }` | `object` (ack) | unchanged, already wired |
| `POST /otp/verify` | anon | `{ identifier, code }` | `TokenResponse` | unchanged, already wired — **issues tokens immediately**, no password required |
| `POST /set-password` | **Authorize** | `{ password }` | ack | uses the caller's bearer token, no identifier needed |
| `GET /me` | Authorize | — | includes `must_set_password: bool` | already fetched by `verifyOtp` today |
| `POST /password/forgot` / `POST /password/reset` | anon | — | — | **not used** by this design (see Approach below) |

Error codes surfaced as `AppError.code` (via existing `authErrorMessage`):

- `password_not_set` (409) — login attempted, no password on file yet
- `invalid_credentials` (401/422) — bad password, or missing identifier/password
- `wrong_role` (403) — password matched a different role than selected
- `access_removed` / `access_inactive` (403) — same as today's OTP path
- `weak_password` (422) — `set-password`/`reset-password`, password too short (backend requires ≥8 chars)
- `invalid_code` (401) — OTP invalid/expired (already handled)

## Approach

Reuse the existing OTP request/verify screens unchanged as the single
"create or reset password" flow — it already authenticates via
`verifyOtp`. Add one new screen after OTP verify that calls the
authenticated `set-password` endpoint. This flow serves **both** first-time
setup and forgot-password; the backend doesn't need to distinguish them and
neither does the client.

Rejected alternative: wire `/password/forgot` + `/password/reset` instead.
Those are unauthenticated and don't issue tokens, so the user would need a
*separate* login step afterward — more screens, no reuse of the existing OTP
UI, no benefit over the approach above.

## Flow

1. **Login (default mode)**: identifier (mobile/email toggle, unchanged) +
   password field + role grid (unchanged) → `POST /auth/login`. Success →
   same session-establish path used today (`establishSession`).
2. **Errors**: `password_not_set` auto-navigates into the OTP flow (step 4)
   instead of showing an error — a first-time user who tries their password
   anyway gets guided, not stuck. `invalid_credentials`, `wrong_role`,
   `access_removed`, `access_inactive` render inline via `authErrorMessage`.
3. **Entry point**: a "First time? / Forgot password?" link on the login
   screen also enters the OTP flow directly (step 4).
4. **OTP flow (unchanged UI)**: request → verify. On verify success, the
   user is now authenticated (tokens issued, `establishSession` not yet
   called at this point — see State below).
5. **Set Password screen (new)**: two fields, new password + confirm.
   Client-side: both non-empty, match, ≥8 chars (mirrors backend's
   `weak_password`). Submit → `POST /auth/set-password` using the token from
   step 4. Success → proceed into the app. `weak_password` from the backend
   renders inline (defense in depth if client validation is bypassed).

## State handling

`verifyOtp` today calls `establishSession` immediately inside
`signInWithOtp` (`AuthProvider.tsx`), which flips `status` to
`'authenticated'` — the navigator would immediately show the app before the
user sets a password. This needs to change: OTP verify from the "set
password" entry point must hold the session in memory (tokens + user held,
but `status` not yet `'authenticated'`) until `set-password` succeeds.

Concretely: `AuthProvider` gains a `pendingPasswordSetup: Session | null`
value. `signInWithOtp` stores the verified session there instead of calling
`establishSession` directly; a new `completePasswordSetup(password)` calls
`repos.auth.setPassword(password)` then `establishSession(pending)`.
`LoginScreen`/navigator render the Set Password screen when
`pendingPasswordSetup` is non-null, same pattern as the existing
`status === 'loading'` splash gate.

## Data layer changes

- `src/data/repositories/types.ts` — `AuthRepository` gains:
  `login(identifier, password, roleKey): Promise<Session>` and
  `setPassword(password: string): Promise<void>`.
- `src/data/http/auth.schema.ts` — add a `loginRequest` shape (client
  builds `{ email }` or `{ phone }` based on `identifier.includes('@')`,
  plus `password`, `role`), reuse `tokenSchema`. Do **not** add
  `must_set_password` to `meSchema` — this design's OTP-verify flow always
  leads to Set Password regardless of that flag, so reading it would be
  dead code.
- `src/data/http/auth.repo.ts` — add `login` (POST `/auth/login`, parse
  `tokenSchema`, then same `/auth/me` fetch + `authSnapshot` sequence
  `verifyOtp` already does) and `setPassword` (POST `/auth/set-password`,
  no response body needed).
- `src/data/mock/auth.repo.ts` — `login`: accept any password ≥8 chars for
  the seeded identifier (mock has no real password store), else
  `invalid_credentials`; if store has no mock "password set" flag yet,
  treat all seeded users as already having a password (`password_not_set`
  only reachable via a not-yet-provisioned mock identifier, mirroring
  `not_registered` handling in `requestOtp`). `setPassword`: validate
  length ≥8, else `weak_password`, otherwise no-op success.

## UI changes

- `src/screens/LoginScreen.tsx`: add a `Mode = 'password' | 'otp-setup'`
  (or fold into existing `Step` union — exact refactor left to
  implementation) plus a password `TextField`, a "First time / forgot
  password?" link, and the new Set Password screen content once OTP verify
  completes in setup mode.
- `src/components/ui/TextField.tsx`: add `secureTextEntry?: boolean` and a
  show/hide toggle (tap the existing icon slot, or a second icon on the
  right — implementation's call) so password fields aren't permanently
  masked with no way to check what was typed.
- `src/features/auth/AuthProvider.tsx` / `hooks.ts`: add
  `signInWithPassword`, `completePasswordSetup`, `pendingPasswordSetup` as
  described above; add `useLogin`, `useSetPassword` hooks mirroring
  `useRequestOtp`/`useVerifyOtp`.
- `src/features/auth/authErrors.ts`: add messages for `password_not_set`
  (only relevant if it somehow surfaces to the UI instead of
  auto-redirecting — keep a fallback message), `invalid_credentials`,
  `wrong_role`, `access_removed`, `access_inactive`, `weak_password`.
- i18n (`en.json`/`hi.json`/`mr.json`/`ta.json`): new keys for password
  field placeholder, "First time / Forgot password?" link, Set Password
  screen title/subtitle/fields/CTA, and the new error fallback strings.

## Testing

- `src/data/http/__tests__/repos.test.ts` / `auth.schema.test.ts`: request
  shape for `login` (email vs phone branch), response parsing, `setPassword`
  request shape, error mapping for each new code.
- `src/data/mock/__tests__/repos.test.ts`: mock `login`/`setPassword`
  behavior (success, `invalid_credentials`, `weak_password`).
- `src/features/auth/__tests__/AuthProvider.test.tsx`: `signInWithPassword`
  establishes session; `signInWithOtp` (setup mode) does NOT flip `status`
  to authenticated but sets `pendingPasswordSetup`; `completePasswordSetup`
  then establishes session.
- `src/screens/__tests__/LoginScreen.test.tsx`: password field renders and
  submits; `password_not_set` error auto-navigates to OTP step; Set Password
  step renders after OTP verify in setup mode and submits.

## Out of scope

- `/password/forgot` + `/password/reset` endpoints (rejected approach).
- Any change to OTP delivery, rate limiting, or the OTP UI itself beyond
  what's needed to enter it from a "first time / forgot password" link.
- Password strength meter / complexity rules beyond the backend's own
  `weak_password` (≥8 chars).
