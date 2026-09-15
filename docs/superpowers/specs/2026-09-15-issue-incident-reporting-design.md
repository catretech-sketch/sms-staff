# Issue/Incident Reporting — Design (Project 1 of the SCC Driver Portal expansion)

**Date:** 2026-09-15
**Status:** Approved design, ready for implementation planning
**Scope:** **sms-backend + sms-staff only.** CRM/manager UI (sms-admin) is explicitly out of
scope for this project — the user is driving that work separately with their own prompt to the
sms-admin agent. This spec's backend API is shaped so a manager UI can be built against it later,
but no CRM screens are designed or built here.

## Background

This is Project 1 of a 4-project rollout extending the sms-staff app to match a reference mockup
(`SCC_Driver_Portal.html`). A full cross-repo audit (sms-staff, sms-backend, sms-admin,
sms-student) found:

- No issue/incident reporting exists anywhere in sms-staff today. The `Repositories` interface
  (`src/data/repositories/types.ts`) has no `issues` member.
- sms-backend already has a generic `Complaints` table/endpoint (`ComplaintController.cs`,
  `ComplaintService.cs`, table `dbo.Complaints` from migration `M0031_Tails_Tables.cs`) — but it's
  a thin catch-all: `Status` is a free string with no workflow, no vehicle/route/trip linkage, no
  attachments, and it already serves a different audience (general/parent-facing complaints via
  sms-admin's Operations → Communication tab). We are **not** reusing or extending it — this
  spec creates a new, separate `Issues` concept for staff-reported operational issues.
- sms-backend's `NotificationService` (in-app + SignalR via `LiveHub`) is fully reusable as-is for
  alerting managers on a new issue — no new notification infra needed.
- sms-staff already has a working **mobile-side** attachment pattern: `useAttachTaskPhoto` /
  `ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true })`, building
  `data:image/jpeg;base64,...` inline (`src/screens/HomeScreen.tsx:46-51`'s `handleAttachPhoto`).
  This spec reuses that mobile-side pattern for photo capture. **Note:** the backend half of that
  specific pattern (`POST /staff/tasks/{id}/photo`) does not actually exist — there is no
  `TasksController` in sms-backend at all. This is a separate pre-existing gap, out of scope for
  this project. For server-side validation of the Issue photo field, this spec instead uses the
  backend's real established convention: the shared `ImageUrlValidation` helper already applied to
  other stored photo/logo fields (see Data model below).

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Reuse `Complaints` or new table? | **New `Issues` table.** Complaints is a separate, already-used concept; retrofitting a status workflow onto it risks conflating audiences. |
| Attachment approach | **Reuse the existing base64-inline pattern** (matches Task-photo attach) — one optional photo per issue, no new upload service. |
| Who can create an issue? | **All 6 staff roles** — driver, conductor, sweeper, gardener, guard, peon. Vehicle/Route/Trip context is optional and only relevant to driver/conductor. |
| Who can view/manage on the manager side? | **SchoolAdmin, Principal, SchoolOwner** — same tenant-wide visibility pattern as the existing Complaints staff-view. Platform Owner gets cross-tenant visibility automatically via the existing RLS `IsPlatform` predicate — no extra code. |
| CRM UI | **Out of scope.** User is handling sms-admin separately. Backend API must still support a future manager UI (list/filter by status, notes, status transitions) even though no screen is built here. |
| Status workflow | Open → In Progress → Resolved → Closed, as real constrained values (not a free string like Complaints). |
| Business-logic ownership | A single shared `IIssueService`/`IssueService` (in `src/Sms.Application/Services/Issues/`) implements create/list/get/update. The staff `IssueController` calls it now; a future CRM manager endpoint calls the **same** service and the **same** `dbo.Issues`/`dbo.IssueNotes` tables — no `CrmIssueService`, no `CrmIssues` table, ever. If a separate manager-facing route is later needed for contract/auth reasons, it still delegates to this one service. |
| Trip/vehicle/route context trust | The mobile client auto-fills Vehicle/Route/Trip from the reporter's current trip assignment for UX convenience only. **The server never trusts these IDs.** See "Server-side context validation" below. |

## Data model (sms-backend)

New module `Sms.Modules.Issues`, following the existing module-folder convention
(`{Name}Module.cs` + `Contracts/` + `Data/{Name}Repository.cs`; service in
`src/Sms.Application/Services/Issues/`; controller in `src/Sms.Api/Controllers/IssueController.cs`).

Migrations: `M0200_Issue_Tables.cs` + `M0201_Procs_Issues.cs` (confirmed next-available numbers —
highest existing at time of writing is `M0199_FeeStructure_Upsert_Retire_SameIdentity.cs`;
re-verify at implementation time in case other migrations land first).

### `dbo.Issues`

| Column | Type | Notes |
| --- | --- | --- |
| `Id` | uniqueidentifier | PK |
| `TenantId` | uniqueidentifier | RLS-scoped, per existing convention |
| `ReporterUserId` | uniqueidentifier | FK to Users, from `tenant.UserId` at create time |
| `Category` | nvarchar(20) | enum: `vehicle` \| `student` \| `route` \| `safety` \| `other` (matches mockup's category options) |
| `Title` | nvarchar(200) | required |
| `Description` | nvarchar(2000) | required |
| `Priority` | nvarchar(20) | enum: `normal` \| `high` \| `emergency` (matches mockup) |
| `Status` | nvarchar(20) | enum: `open` \| `in_progress` \| `resolved` \| `closed`, default `open` — enforced in the service layer (CHECK constraint optional, but the app-level enum is the source of truth) |
| `VehicleId` | uniqueidentifier, nullable | FK to `Buses`, only when relevant (driver/conductor context) |
| `RouteId` | uniqueidentifier, nullable | FK to `Routes`-equivalent table, only when relevant |
| `TripId` | uniqueidentifier, nullable | FK to `Trips`, only when relevant |
| `PhotoBase64` | nvarchar(max), nullable | inline `data:image/jpeg;base64,...`; validated server-side by the existing shared `ImageUrlValidation.Validate()`/`.Normalize()` helper (`src/Sms.Application/Common/ImageUrlValidation.cs`) — the same one already used for `Users.PhotoUrl`/`Students.PhotoUrl`/`Tenants.LogoUrl` (max ~300KB, must start with `data:image/` or `http(s)://`) |
| `CreatedAt` | datetime2 | |
| `UpdatedAt` | datetime2 | |

Apply the standard `rls.IssuesTenantPolicy` (filter + block predicate, `AFTER INSERT WITH
(STATE=ON)`) exactly as done for `Complaints`/`Notifications` in `M0031_Tails_Tables.cs:47-52`.

**Indexes:** `TenantId` (RLS predicate lookups), `ReporterUserId` (staff "my issues" list),
`Status` (manager filtering), `CreatedAt` (default sort, newest-first). `VehicleId`/`RouteId`/
`TripId` are left unindexed for MVP — nullable, low-cardinality-per-tenant, and no current query
filters by them alone; add later only if a real CRM query pattern justifies it.

### `dbo.IssueNotes`

Append-only manager notes / audit trail.

| Column | Type | Notes |
| --- | --- | --- |
| `Id` | uniqueidentifier | PK |
| `TenantId` | uniqueidentifier | RLS-scoped |
| `IssueId` | uniqueidentifier | FK to `Issues` |
| `AuthorUserId` | uniqueidentifier | manager who wrote the note |
| `Note` | nvarchar(1000) | |
| `CreatedAt` | datetime2 | |

Same RLS treatment as `Issues`.

## API (sms-backend)

Following the existing Dapper/`BaseRepository` convention (`QueryProcAsync`/`ExecuteProcAsync`
for writes and complex reads, `QueryInlineAsync` for simple parameterised single-table reads).

- **`POST /v1/staff/issues`** — any authenticated staff user (all 6 roles). `ReporterUserId` and
  `TenantId` resolved server-side from `ITenantContext`, never trusted from the client. Body:
  `CreateIssueRequest(Category, Title, Description, Priority, VehicleId?, RouteId?, TripId?,
  PhotoBase64?)`. On success, calls the existing `NotificationService.CreateAsync` to alert
  SchoolAdmin(s) for the tenant (reuses `CreateNotificationRequest` exactly as
  `NotificationService.CreateAsync` already does for other events — no new notification code
  path).
- **`GET /v1/staff/issues`** — role-gated response shape, same pattern as `ComplaintService.List`
  (`ComplaintService.cs:23`): reporter sees only their own (`WHERE ReporterUserId = @uid`);
  SchoolAdmin/Principal/SchoolOwner see all issues in tenant. Supports optional `?status=`
  query param (mirrors Complaints' existing filter) so a future CRM UI has something to filter on
  immediately.
- **`GET /v1/staff/issues/{id}`** — detail view including its `IssueNotes`, same visibility rule
  as list.
- **`PATCH /v1/issues/{id}`** — SchoolAdmin/Principal/SchoolOwner only (`RoleChecks` gate, same
  imperative-claim-check pattern as `ComplaintController.cs:24-25`). Body:
  `UpdateIssueRequest(Status?, Note?)` — updates `Status` on `Issues` and/or inserts a row into
  `IssueNotes` when `Note` is provided. Reject invalid status transitions is out of scope for MVP
  (any status can move to any other) — flag as a possible P2 refinement, not required now.

### Server-side context validation (VehicleId/RouteId/TripId)

The client pre-fills these for UX only; the server is authoritative. On `POST
/v1/staff/issues`, if `TripId` is provided, `IssueService` must verify the trip belongs to the
reporter (`Trips.DriverId = uid OR` — for conductor — the trip's `BusAssignments` row has
`TeacherUserId = uid`, same lookup `TripAssignment`/roster endpoints already use) and, if it does,
derive `VehicleId`/`RouteId` from that trip server-side rather than accepting client-supplied
values for them at all. If `TripId` doesn't belong to the reporter (or doesn't exist in-tenant —
RLS already prevents cross-tenant rows), reject the request with 400 rather than silently
dropping the field. If no `TripId` is provided, `VehicleId`/`RouteId` are simply left null — there
is no scenario where a client supplies `VehicleId`/`RouteId` directly without a validated `TripId`
backing them.

## Mobile (sms-staff)

### Domain

`src/data/domain/issue.ts`:

```ts
export type IssueCategory = 'vehicle' | 'student' | 'route' | 'safety' | 'other';
export type IssuePriority = 'normal' | 'high' | 'emergency';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Issue {
  id: string;
  category: IssueCategory;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  vehicleId?: string;
  routeId?: string;
  tripId?: string;
  photoUrl?: string; // base64 data URL, same shape as Task.photoUrl
  createdAt: string;
}

export interface NewIssue {
  category: IssueCategory;
  title: string;
  description: string;
  priority: IssuePriority;
  vehicleId?: string;
  routeId?: string;
  tripId?: string;
  photoUri?: string;
}
```

### Repository contract

Add to `src/data/repositories/types.ts`:

```ts
export interface IssuesRepository {
  list(): Promise<Issue[]>;
  create(req: NewIssue): Promise<Issue>;
}
```

Add `issues: IssuesRepository` to the `Repositories` interface. Implement both
`src/data/mock/issues.repo.ts` (in-memory, seeded empty) and `src/data/http/issues.repo.ts`
(`POST/GET /v1/staff/issues`, mapper `toIssue`/`fromNewIssue` in `src/data/http/mappers.ts`
following the existing `toTask`/`fromNewLeave`-style pattern), matching every other repository
pair in this codebase.

### Hooks

`src/features/issues/hooks.ts`: `useIssues()` (query), `useReportIssue()` (mutation, invalidates
the issues query on settle — same shape as `useAttachTaskPhoto`).

### Screens

- **Report Issue**: a new modal/screen reached from a Home quick-action button (next to the
  existing role-specific actions). Fields: category picker, title, description, priority picker,
  optional photo (reusing `HomeScreen.handleAttachPhoto`'s `ImagePicker` flow), and — only when
  the reporter is driver/conductor with a live trip (`useCurrentTrip()`) — auto-filled, read-only
  vehicle/route/trip context pulled from the existing trip assignment, not user-entered.
- **My Issues**: a simple list (status pill per row) showing the reporter's own submissions,
  reachable from the same entry point as Report Issue.

### States

Standard existing patterns, no new UI primitives: `Skeleton` while loading, `ErrorState` with
`onRetry` on failure, an empty-state message ("No issues reported yet") when the list is empty,
toast on submit success/failure (existing `useToast()`).

## Testing

**Backend:** unit tests for `IssueService` (all 6 roles can create; reporter is always taken from
the authenticated context, never the request body; tenant isolation — a reporter from tenant A
cannot see or PATCH tenant B's issues; role gating — a non-manager role gets 403 on `PATCH`;
status enum validation rejects an invalid value; `TripId` ownership validation rejects a trip that
doesn't belong to the reporter; issue-detail authorization matches list rules); integration test
for create → SQL persistence and create → `NotificationService` call (and that a failed/rolled-
back create does **not** trigger a notification). Duplicate rapid submissions are expected to
create two distinct issues for MVP (no idempotency key) — add a test asserting this is the actual
behavior, not an accidental gap. Follow the existing test patterns used for
`ComplaintService`/`NotificationService` if present, or the general xUnit + Dapper-mock convention
used elsewhere in `sms-backend`.

**Mobile:** screen test for the Report Issue form (renders, validates required fields, submits,
attaches a photo — following `AttendanceScreen.test.tsx`'s structure), a hook test for
`useReportIssue`/`useIssues` (mirroring `useAttachTaskPhoto`'s existing test), and a role-visibility
check confirming all 6 roles can reach the Report Issue entry point from Home.

## Out of scope (confirmed)

- Any sms-admin/CRM screen, component, or test — the user is handling this separately.
- Push notifications (FCM/APNs) — in-app/SignalR notification only, per existing infra.
- Status-transition validation rules (e.g. disallowing Closed → Open) — any transition is allowed
  for this MVP.
- Multiple attachments or non-photo file types — one optional photo only, matching the existing
  Task-photo pattern.
- Any change to the existing `Complaints` table, controller, or sms-admin Communication tab.
