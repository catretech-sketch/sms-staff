# SchoolMate Staff — Six Roles + Bus Live Trip

**Date:** 2026-06-12
**Status:** Approved design, ready for implementation planning
**Scope:** SP-1 of the "live bus tracking" program — the **Staff app** only. Refocus to 6 roles,
finish the remaining staff screens for a genuinely complete app, and build the flagship
**Bus Driver / Conductor "Live Trip"** broadcasting feature against a defined real-time
location contract (mock now, real backend later).

## Background

`sms-staff` (SchoolMate Staff) is the non-teaching-staff app in the SMS suite. Spec #1
(2026-06-03) shipped the foundation + a complete vertical slice (Splash → Login → Home →
Attendance) on a swappable mock→HTTP data layer with SecureStore auth, 7 roles, and 4-language
i18n. Roster, Leave, Tasks, Driver, and Profile were stubbed for later specs.

This spec does two things at once: **completes** the app (turns the stubs into real screens for
every role) and **adds** the headline feature — live GPS broadcasting from the bus, the data
source for a later cross-app bus-tracking program.

### The wider program (context, not scope)

"Show the live bus to parent + teacher + principal + CRM" spans the whole suite and a backend
that does not exist yet. It is decomposed into sub-projects, each with its own spec → plan →
build cycle:

- **SP-1 (this spec)** — Staff app: 6 roles complete + bus driver/conductor broadcast live,
  demoable via a simulated bus, against a frozen real-time location contract.
- **SP-2** — Real-time location contract + .NET backend (trip lifecycle, location ingest,
  fan-out via SignalR/WebSocket, who-may-see-which-bus authorization).
- **SP-3** — Consumer "live bus map" in Parent (`sms-student`), Teacher (`sms-teacher-app`),
  Principal (`sms-admin`), scoped per app.
- **SP-4** — Admin CRM fleet view (`sms-admin`): all buses on one map, trip history, alerts.

Every app in the suite is frontend + mock today, all built to drop in a **.NET Core 10 + SQL
Server REST API** behind a single data seam. SP-1 keeps that contract-first, one-flag-swap
discipline so SP-2's backend lights up these same screens with no rewrite.

## Goals

- Refocus the role set to the **6 roles** the business actually runs, in one contained edit to
  the role config, without disturbing the frozen `src/data` foundation contract.
- **Complete the app**: turn the Roster, Leave, Tasks, and Profile stubs into real,
  role-aware, data-backed screens for all 6 roles.
- Add the **Live Trip** feature for bus driver + conductor: start trip → stream live location
  in the background → manage student boarding (conductor) → end trip.
- Define a **real-time location contract** (domain types + `TripRepository`) with both a mock
  adapter (simulated moving bus, fully demoable) and an http adapter (the contract SP-2 must
  satisfy). The mock→live swap stays a single env flag.
- Hold the project's quality bar: TDD, green suite, typecheck + lint clean, web export builds.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| First sub-project to design | **SP-1, the Staff app only.** Other apps follow in later cycles. |
| Role set | **6 roles**: bus driver, conductor (new), cleaner, gardener, security guard, peon. **Drop cook + clerk.** |
| Role mapping | KEEP keys `driver`/`guard`/`sweeper`; relabel via i18n (`driver`→"Bus Driver", `guard`→"Security Guard", `sweeper`→"Cleaner"). Add `conductor` key. Remove `cook`+`clerk`. |
| Driver vs conductor | **Driver = primary GPS broadcaster** (one source of truth). **Conductor = student manager** (board/drop/absent + headcount) **and fallback broadcaster** if the driver's phone is absent. Exactly one active broadcaster per trip, driver preferred. |
| Broadcasting model | **Background location task + persistent foreground-service notification.** Battery-friendly cadence (~10 s / ~50 m). Offline points queue + flush. Foreground-only (screen-on) is explicitly rejected as not production-grade. |
| "Complete" depth | Bus roles get the special **Trip** feature; the other 4 roles get the **standard** flow (Home + role card + Attendance + Roster/Leave/Tasks/Profile). No bespoke per-role overlays this round. |
| Backend | **Out of scope** (SP-2). SP-1 defines the location contract and demos it with a simulated bus. |

## Stack additions

On top of the existing stack (Expo, React 19, RN, TanStack Query, Reanimated, react-native-svg,
expo-location, SecureStore, react-i18next, zod):

- **Background location**: `expo-location` background updates + `expo-task-manager` (foreground
  service + notification on Android). **Verify against the installed Expo SDK** before coding —
  `AGENTS.md` flags that Expo has changed; read the exact versioned docs
  (https://docs.expo.dev/versions/v56.0.0/) and confirm the background-location + task-manager
  APIs for the SDK actually in `package.json`.
- **Map preview**: a lightweight map for the driver/conductor Live screen (route polyline + a
  moving bus marker + stop pins). Pick the map library during planning per the installed SDK
  (e.g. `react-native-maps`); the broadcasting side needs only a small preview, not a full map
  experience, so this stays minimal.

No change to the auth, theme, i18n, or existing repository infrastructure.

## Role refactor

`theme/roles.ts` is the single source of truth for everything that varies per role, so this is
a contained change; screens already read from it.

- Keep the `Role` union keys `driver`/`guard`/`sweeper`/`gardener`/`peon`; add `conductor`; remove `cook`+`clerk`. Display names change only in i18n (`role.driver`="Bus Driver", `role.guard`="Security Guard", `role.sweeper`="Cleaner").
- Each role keeps its `accent / accentSoft / icon / labelKey / dutyPostLabelKey / roleCardKind`.
  **conductor** gets a new accent + icon; **busDriver** inherits the driver accent/icon;
  **cleaner**/**securityGuard** reuse the old sweeper/guard visuals with new labels.
- Remove `cook` + `clerk` configs and delete `CookCard.tsx` + `ClerkCard.tsx` (and their tests).
- Add a **ConductorCard** role card (today's route + headcount peek); **busDriver** keeps the
  existing DriverCard (bus/route + license & fitness).
- Update i18n role labels + duty-post labels in **all 4 languages** (en/hi/mr/ta). Marathi +
  Tamil remain flagged for native-speaker proofread.
- `RoleCard` discriminated union: drop `cook` + `clerk` variants, add a `conductor` variant
  (`{ kind:'conductor'; routeName; onBoard; capacity; nextStop }`).

The Login role grid and every accent-driven surface update automatically from the config.

## Real-time location contract (new data layer)

Added alongside the existing repos, same five-layer architecture (domain → repository port →
mock/http adapters → factory by env flag → feature hooks). The existing `src/data` foundation
contract is **not** modified — this is additive.

### Domain types

```ts
type TripDirection = 'pickup' | 'drop';
type TripStatus    = 'idle' | 'live' | 'ended';
type BoardingState = 'boarded' | 'dropped' | 'absent';

Stop      = { id; name; lat; lng; seq; etaMin? };
Route     = { id; name; assignedBusNo; stops: Stop[] };
Trip      = { id; routeId; busNo; driverId; conductorId?; direction: TripDirection;
              status: TripStatus; startedAt?; endedAt? };
TripPing  = { tripId; lat; lng; speedKmh; heading; at };          // one GPS sample
StudentLite = { id; name; stopId; photoUrl? };
Boarding  = { tripId; studentId; stopId; state: BoardingState; at };
TripSummary = { tripId; durationMin; distanceKm; stopsCovered; boardedCount };
```

(Presentation/color never live in domain types; accents derive from `roleKey` on the client.)

### Repository port

```ts
interface TripRepository {
  myAssignment(): Promise<{ route: Route; busNo: string; conductor?: StudentLite | null }>;
  startTrip(routeId: string, direction: TripDirection): Promise<Trip>;
  publishPing(ping: TripPing): Promise<void>;     // called on the GPS cadence; fire-and-forget
  endTrip(tripId: string): Promise<TripSummary>;
  // conductor:
  roster(tripId: string): Promise<StudentLite[]>;
  setBoarding(b: Boarding): Promise<void>;
  boardingState(tripId: string): Promise<Boarding[]>;
}
```

`Repositories` gains a `trip` member.

### Adapters

- **Mock** — persists trip state + boarding to AsyncStorage; **simulates a moving bus** by
  interpolating position along the assigned route's stops over time, so the Live screen shows
  real motion with no backend. `publishPing` is accepted and stored (the mock is both producer
  and store in SP-1). Seeds one route with ~6 stops and a student roster.
- **Http** — the contract SP-2 must satisfy: `GET /staff/trip/assignment`, `POST /staff/trips`,
  `POST /staff/trips/{id}/pings`, `POST /staff/trips/{id}/end`, `GET /staff/trips/{id}/roster`,
  `POST /staff/trips/{id}/boarding`. DTO↔domain mappers, same as existing repos.

## Feature hooks

```
features/trip/hooks.ts
  useTripAssignment()        # the route + bus assigned to this staff member
  useStartTrip()/useEndTrip()# mutations; manage trip lifecycle + invalidate
  useLiveTrip()              # current trip + derived live state (current/next stop, elapsed)
  useRoster(tripId)          # conductor: students for the trip
  useBoarding(tripId)        # conductor: headcount + per-student state, optimistic toggle
features/trip/broadcaster.ts # starts/stops the background location task; buffers + publishes
                             # pings on cadence; offline queue + flush
```

The broadcaster is the only piece that touches `expo-location` + `expo-task-manager`; it is
isolated behind a small module so the screens stay presentational and testable.

## Screens

### Bus Driver — Live Trip (overlay/tab, bus roles only)

- **Pre-trip** — assigned route name + bus no, **Pickup / Drop** direction segmented toggle,
  conductor (if assigned), big **Start Trip** button. First start shows a plain-language
  background-location rationale → system permission → graceful denial state if refused.
- **Live** — small **map preview** (route polyline, stop pins, the moving bus marker), a
  **"Broadcasting live"** banner, current stop + next stop, elapsed timer, speed; **End Trip**.
  The background task keeps publishing pings while the screen is closed / phone is locked,
  with the persistent notification visible.
- **Ended** — `TripSummary` card (duration, distance, stops covered) + Done.

### Conductor — Trip (overlay/tab, bus roles only)

- Same trip lifecycle as the driver, **plus the student roster**: rows grouped by stop, each a
  large tap target cycling **boarded → dropped → absent**, a prominent **live headcount**
  ("18 / 24 on board"), and the live map. If the conductor is the active broadcaster (no driver
  on the trip), the conductor screen broadcasts too (same broadcaster module).

### Roster (tab, all roles)

Week strip + the staff member's shift/duty schedule. Bus roles also see their route assignment.
Backed by a `RosterRepository` (mock + http), wired like the existing repos.

### Leave (overlay, all roles)

Leave balances + request form (zod-validated) + approval-status timeline. `LeaveRepository`.

### Tasks (tab, all roles)

The handoff's signature **swipe-to-complete** task list; content is role-aware via the role
config. `TasksRepository`; optimistic complete + Toast on failure.

### Profile / Me (tab, all roles)

Identity, employee ID, documents (license + fitness pills for bus roles), settings, **theme
toggle**, and the **language sheet** (en/hi/mr/ta, applies app-wide). `ProfileRepository` for
the identity/documents read.

### Navigation

The generic "Driver" stub is replaced by a **Trip** destination shown **only** for bus driver +
conductor (driver sees the Live Trip screen; conductor sees the Trip + roster screen). The
other 4 roles never see Trip. Roster, Tasks, Me remain tabs for everyone; Leave + Trip are
overlays/role-gated. Center check-in FAB and Attendance overlay are unchanged.

## Cross-cutting concerns

- **Permissions UX** — background-location requested at first Start Trip with a rationale
  screen; explicit denied state explains the trip can't broadcast and offers Settings deep link.
- **Resilience** — ping publish is fire-and-forget; failures queue (AsyncStorage) and flush on
  reconnect; never blocks the driver. The persistent notification reflects live/paused state.
- **Single active broadcaster** — a trip records its broadcaster; the driver's phone wins, the
  conductor's is fallback. The mock enforces one active broadcaster per trip.
- **UI states** — reuse `Skeleton / ErrorState / EmptyState / Toast` on every data screen.
- **i18n** — all new strings localized in 4 languages; proper nouns (names, bus reg, route,
  school, dates) stay untranslated.
- **Theme** — new screens read role accent + tokens; light mode default; dark toggle works.

## Testing

Jest + React Native Testing Library, holding the green-suite + TDD discipline:

- **Contract tests** for `TripRepository`, `RosterRepository`, `LeaveRepository`,
  `TasksRepository`, `ProfileRepository` — run against both mock and a fixture-backed http
  adapter (mock/live reconcilability).
- **Simulated-bus** test — interpolation produces monotonic, on-route positions over time.
- **Trip state machine** — idle → live → ended transitions; permission-denied path.
- **Broadcaster** — cadence buffering, offline queue + flush, single-active-broadcaster rule
  (with `expo-location` / `expo-task-manager` mocked).
- **Conductor boarding** — headcount derivation, optimistic toggle + rollback.
- **Integration** — bus-driver login → Start Trip → ping published → End Trip → summary.
- **Role refactor** — role config has exactly the 6 roles; removed roles/cards are gone;
  i18n has labels for all 6 in all 4 languages.

## Gotchas (carried + new)

- Carried from the handoff: never rest a flex child at `opacity:0` gated on a frame; clipping
  containers (cards, map preview) need `flexShrink:0`; dropdowns/sheets render at screen root
  with a scrim; each component owns its `StyleSheet.create`.
- **Background location is platform-sensitive** — confirm the exact `expo-location` +
  `expo-task-manager` API for the installed SDK (read the versioned docs); Android needs a
  foreground service + notification config in `app.json`; iOS needs background-mode plist keys.
- Keep the broadcaster the **only** module importing the native location/task APIs, so screens
  stay testable with it mocked.
- Do **not** modify the frozen `src/data` foundation contract — the trip/roster/leave/tasks/
  profile repos are additive.

## Out of scope (SP-1)

- The real backend + real-time fan-out (SP-2).
- The consumer live-bus map in parent/teacher/principal (SP-3) and the CRM fleet view (SP-4).
- Real OTP verification, push notifications, RTL languages.
- Bespoke per-role deep-dive overlays for cleaner/gardener/security guard/peon.

## Follow-on (after SP-1)

SP-2 (contract + .NET backend) → SP-3 (consumer map in parent/teacher/principal) → SP-4 (CRM
fleet view). Each is its own spec → plan → build cycle.
