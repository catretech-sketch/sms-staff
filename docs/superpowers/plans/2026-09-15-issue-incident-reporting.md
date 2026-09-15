# Issue/Incident Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any authenticated staff-app user report an operational issue/incident (with optional photo and live-trip context), have it land in a new, tenant-isolated `dbo.Issues` table with a real status workflow, notify tenant managers via the existing notification system, and let the reporter see their own submissions — spanning sms-backend (.NET/Dapper/SQL Server) and sms-staff (Expo/React Native).

**Architecture:** A new, self-contained backend module (`Sms.Modules.Issues`) exposes a single shared `IIssueService`/`IssueController` — the only consumer today is the staff mobile app, but the service and `dbo.Issues`/`dbo.IssueNotes` tables are the one and only place this logic lives, ready for a future CRM controller to call without any duplication. The mobile app gets a new `issues` repository slice (mock + http, following every existing repository's exact shape) and one new screen reached from a Home quick-action.

**Tech Stack:** .NET 8 / ASP.NET Core / Dapper / SQL Server (FluentMigrator migrations, native RLS) for the backend; Expo / React Native / TanStack Query / react-i18next / Zod for the mobile app; xUnit + `WebApplicationFactory` + a real SQL Server test fixture for backend tests; Jest + `@testing-library/react-native` for mobile tests.

**Spec:** `docs/superpowers/specs/2026-09-15-issue-incident-reporting-design.md`

## Global Constraints

- CRM/sms-admin UI is explicitly OUT OF SCOPE — do not create any sms-admin files or touch that repo.
- Do not modify `dbo.Complaints`, `ComplaintController`, `ComplaintService`, or any other existing table/endpoint — this feature is fully additive.
- The server is authoritative for `TenantId`, `ReporterUserId`, and any `VehicleId`/`RouteId` derived from a trip — never trust these from the request body.
- Every new table gets the exact same `rls.{Table}TenantPolicy` treatment as every existing tenant-scoped table (see `M0031_Tails_Tables.cs`).
- Reuse, do not duplicate: `NotificationService`/`INotificationService` for alerts, `ImageUrlValidation` for the photo field, `TripRepository.GetParticipantRoleAsync`/`GetBusIdAsync`/`GetTripRouteIdAsync` for trip-context validation, `RoleChecks.IsStaff` for manager-vs-self visibility (exact same gate `ComplaintController` already uses).
- Status enum is exactly `open | in_progress | resolved | closed`, default `open`. Category is exactly `vehicle | student | route | safety | other`. Priority is exactly `normal | high | emergency`. No other values accepted; no transition restrictions for this MVP (any status may move to any other).
- Migration numbers are `M0200`/`M0201` (confirmed next-available after `M0199_FeeStructure_Upsert_Retire_SameIdentity.cs` at spec-writing time) — re-verify the highest existing migration number immediately before Task 1 in case something else has landed first.
- The mobile client only ever sends `TripId` for trip context (never `VehicleId`/`RouteId` directly) — the server derives and stores `VehicleId`/`RouteId` itself from the validated trip. This is a deliberate simplification over the spec's illustrative TypeScript (which listed `vehicleId`/`routeId` on `NewIssue`): since the server ignores client-supplied vehicle/route values anyway (per the spec's "Server-side context validation" section), the client has no reason to send them.
- Follow existing conventions exactly: Dapper `BaseRepository` (`QueryProcAsync`/`QuerySingleProcAsync`/`ExecuteProcAsync` for writes, `QueryInlineAsync` for simple reads), stored procedures as embedded `.sql` resources under `db/Sms.Migrations/procs/{module}/`, `ApiResult<T>`/`ApiControllerBase.FromResult` for controller responses, TanStack Query `useQuery`/`useMutation` with `queryKeys`, the mock/http repository pair pattern in `src/data/{mock,http}/`.

---

## Task 1: Database schema — Issues/IssueNotes tables, RLS, and stored procedures

**Files:**
- Create: `D:\SMS\sms-project\sms-backend\db\Sms.Migrations\M0200_Issue_Tables.cs`
- Create: `D:\SMS\sms-project\sms-backend\db\Sms.Migrations\M0201_Procs_Issues.cs`
- Create: `D:\SMS\sms-project\sms-backend\db\Sms.Migrations\procs\issues\Issue_Create.sql`
- Create: `D:\SMS\sms-project\sms-backend\db\Sms.Migrations\procs\issues\Issue_Update.sql`
- Create: `D:\SMS\sms-project\sms-backend\db\Sms.Migrations\procs\issues\IssueNote_Add.sql`

**Interfaces:**
- Produces: tables `dbo.Issues` (Id, TenantId, ReporterUserId, Category, Title, Description, Priority, Status, VehicleId, RouteId, TripId, PhotoUrl, CreatedAt, UpdatedAt) and `dbo.IssueNotes` (Id, TenantId, IssueId, AuthorUserId, Note, CreatedAt), both RLS-protected; stored procs `dbo.Issue_Create`, `dbo.Issue_Update`, `dbo.IssueNote_Add`. Task 3's `IssueRepository` consumes all of these by exact name.

- [ ] **Step 1: Confirm the actual next-available migration number**

Run: `find "/d/SMS/sms-project/sms-backend/db/Sms.Migrations" -maxdepth 1 -iname "M0*.cs" | sort | tail -5`

Expected: the highest file is `M0199_FeeStructure_Upsert_Retire_SameIdentity.cs` (or higher, if something else landed since this plan was written — if so, shift `M0200`/`M0201` below to the next two free numbers and update the `[Migration(N, ...)]` attribute numbers to match).

- [ ] **Step 2: Write the tables + RLS migration**

```csharp
using FluentMigrator;

namespace Sms.Migrations;

[Migration(200, "Issues: Issues + IssueNotes tables with tenant RLS")]
public sealed class M0200_Issue_Tables : Migration
{
    public override void Up()
    {
        Create.Table("Issues")
            .WithColumn("Id").AsGuid().PrimaryKey().WithDefault(SystemMethods.NewSequentialId)
            .WithColumn("TenantId").AsGuid().NotNullable()
            .WithColumn("ReporterUserId").AsGuid().NotNullable()
            .WithColumn("Category").AsString(20).NotNullable()
            .WithColumn("Title").AsString(200).NotNullable()
            .WithColumn("Description").AsString(2000).NotNullable()
            .WithColumn("Priority").AsString(20).NotNullable().WithDefaultValue("normal")
            .WithColumn("Status").AsString(20).NotNullable().WithDefaultValue("open")
            .WithColumn("VehicleId").AsGuid().Nullable()
            .WithColumn("RouteId").AsGuid().Nullable()
            .WithColumn("TripId").AsGuid().Nullable()
            .WithColumn("PhotoUrl").AsString(int.MaxValue).Nullable()
            .WithColumn("CreatedAt").AsDateTime2().NotNullable().WithDefault(SystemMethods.CurrentUTCDateTime)
            .WithColumn("UpdatedAt").AsDateTime2().NotNullable().WithDefault(SystemMethods.CurrentUTCDateTime);
        Create.Index("IX_Issues_Tenant").OnTable("Issues").OnColumn("TenantId").Ascending();
        Create.Index("IX_Issues_Reporter").OnTable("Issues").OnColumn("ReporterUserId").Ascending();
        Create.Index("IX_Issues_Status").OnTable("Issues").OnColumn("Status").Ascending();
        Create.Index("IX_Issues_CreatedAt").OnTable("Issues").OnColumn("CreatedAt").Descending();

        Create.Table("IssueNotes")
            .WithColumn("Id").AsGuid().PrimaryKey().WithDefault(SystemMethods.NewSequentialId)
            .WithColumn("TenantId").AsGuid().NotNullable()
            .WithColumn("IssueId").AsGuid().NotNullable()
            .WithColumn("AuthorUserId").AsGuid().NotNullable()
            .WithColumn("Note").AsString(1000).NotNullable()
            .WithColumn("CreatedAt").AsDateTime2().NotNullable().WithDefault(SystemMethods.CurrentUTCDateTime);
        Create.Index("IX_IssueNotes_Issue").OnTable("IssueNotes").OnColumn("IssueId").Ascending();

        foreach (var t in new[] { "Issues", "IssueNotes" })
            Execute.Sql($@"
CREATE SECURITY POLICY rls.{t}TenantPolicy
ADD FILTER PREDICATE rls.fn_tenant_predicate(TenantId) ON dbo.{t},
ADD BLOCK PREDICATE rls.fn_tenant_predicate(TenantId) ON dbo.{t} AFTER INSERT
WITH (STATE = ON);");
    }

    public override void Down()
    {
        foreach (var t in new[] { "IssueNotes", "Issues" })
            Execute.Sql($"DROP SECURITY POLICY IF EXISTS rls.{t}TenantPolicy;");
        Delete.Table("IssueNotes");
        Delete.Table("Issues");
    }
}
```

- [ ] **Step 3: Write the stored procedure SQL files**

`procs/issues/Issue_Create.sql`:

```sql
CREATE OR ALTER PROCEDURE dbo.Issue_Create
    @TenantId uniqueidentifier, @ReporterUserId uniqueidentifier, @Category nvarchar(20),
    @Title nvarchar(200), @Description nvarchar(2000), @Priority nvarchar(20),
    @VehicleId uniqueidentifier = NULL, @RouteId uniqueidentifier = NULL, @TripId uniqueidentifier = NULL,
    @PhotoUrl nvarchar(max) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id uniqueidentifier = NEWID();
    INSERT dbo.Issues
        (Id, TenantId, ReporterUserId, Category, Title, Description, Priority, VehicleId, RouteId, TripId, PhotoUrl)
    VALUES
        (@Id, @TenantId, @ReporterUserId, @Category, @Title, @Description, @Priority, @VehicleId, @RouteId, @TripId, @PhotoUrl);

    SELECT Id, TenantId, ReporterUserId, Category, Title, Description, Priority, Status,
           VehicleId, RouteId, TripId, PhotoUrl, CreatedAt, UpdatedAt
    FROM dbo.Issues WHERE Id = @Id;
END
```

`procs/issues/Issue_Update.sql`:

```sql
CREATE OR ALTER PROCEDURE dbo.Issue_Update
    @Id uniqueidentifier, @Status nvarchar(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Issues SET Status = @Status, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;

    SELECT Id, TenantId, ReporterUserId, Category, Title, Description, Priority, Status,
           VehicleId, RouteId, TripId, PhotoUrl, CreatedAt, UpdatedAt
    FROM dbo.Issues WHERE Id = @Id;
END
```

`procs/issues/IssueNote_Add.sql`:

```sql
CREATE OR ALTER PROCEDURE dbo.IssueNote_Add
    @TenantId uniqueidentifier, @IssueId uniqueidentifier, @AuthorUserId uniqueidentifier, @Note nvarchar(1000)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id uniqueidentifier = NEWID();
    INSERT dbo.IssueNotes (Id, TenantId, IssueId, AuthorUserId, Note)
    VALUES (@Id, @TenantId, @IssueId, @AuthorUserId, @Note);

    SELECT Id, IssueId, AuthorUserId, Note, CreatedAt FROM dbo.IssueNotes WHERE Id = @Id;
END
```

Note: no `.csproj` change is needed — `db/Sms.Migrations/Sms.Migrations.csproj` already globs `procs/**/*.sql` as embedded resources.

- [ ] **Step 4: Write the procs migration**

```csharp
using FluentMigrator;

namespace Sms.Migrations;

[Migration(201, "Issues procs: Issue_Create/Update, IssueNote_Add")]
public sealed class M0201_Procs_Issues : Migration
{
    public override void Up()
    {
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.issues."))
            Execute.Sql(sql);
    }

    public override void Down()
    {
        foreach (var name in new[] { "Issue_Create", "Issue_Update", "IssueNote_Add" })
            Execute.Sql($"DROP PROCEDURE IF EXISTS dbo.{name};");
    }
}
```

- [ ] **Step 5: Build the migrations project**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet build db/Sms.Migrations/Sms.Migrations.csproj`
Expected: build succeeds with no errors.

- [ ] **Step 6: Apply migrations against the local dev database and verify**

Run whatever this repo's existing migration-runner command is (check `README.md` or a `Makefile`/`scripts/` entry — the existing `M0031`/`M0044` migrations were applied the same way; do not invent a new mechanism). After running, verify with:

```sql
SELECT name FROM sys.tables WHERE name IN ('Issues', 'IssueNotes');
SELECT name FROM sys.procedures WHERE name IN ('Issue_Create', 'Issue_Update', 'IssueNote_Add');
SELECT name FROM sys.security_policies WHERE name IN ('IssuesTenantPolicy', 'IssueNotesTenantPolicy');
```

Expected: 2 tables, 3 procedures, 2 security policies.

- [ ] **Step 7: Commit**

```bash
cd D:\SMS\sms-project\sms-backend
git add db/Sms.Migrations/M0200_Issue_Tables.cs db/Sms.Migrations/M0201_Procs_Issues.cs db/Sms.Migrations/procs/issues/
git commit -m "feat(issues): add Issues/IssueNotes tables, RLS policies, and stored procedures

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Backend DTOs and IssueRepository

**Files:**
- Create: `D:\SMS\sms-project\sms-backend\src\Sms.Modules.Issues\IssueModule.cs`
- Test: `D:\SMS\sms-project\sms-backend\tests\Sms.Tests.Unit\Issues\IssueValidationTests.cs`

**Interfaces:**
- Consumes: `BaseRepository`/`IDbConnectionFactory` (`Sms.Shared.Kernel.Data`).
- Produces: `IssueResponse`, `CreateIssueRequest`, `UpdateIssueRequest`, `IssueNoteResponse` records and `IssueRepository` (with `ListAsync`, `GetAsync`, `GetNotesAsync`, `CreateAsync`, `UpdateStatusAsync`, `AddNoteAsync`, `GetManagerUserIdsAsync`) — Task 3's `IssueService` consumes all of these by exact name/signature. Also exposes `IssueModule.AddIssuesModule(IServiceCollection)`.

- [ ] **Step 1: Write a failing unit test for the category/priority/status validation the service will use**

This test targets a small static validator so it's cheap to unit-test without a database — `IssueService` (Task 3) will call these same constants/methods.

```csharp
using Sms.Modules.Issues;
using Xunit;

namespace Sms.Tests.Unit.Issues;

public class IssueValidationTests
{
    [Theory]
    [InlineData("vehicle", true)]
    [InlineData("student", true)]
    [InlineData("route", true)]
    [InlineData("safety", true)]
    [InlineData("other", true)]
    [InlineData("bogus", false)]
    public void Category_validation_accepts_only_the_five_approved_values(string category, bool expected) =>
        Assert.Equal(expected, IssueEnums.ValidCategories.Contains(category));

    [Theory]
    [InlineData("normal", true)]
    [InlineData("high", true)]
    [InlineData("emergency", true)]
    [InlineData("urgent", false)]
    public void Priority_validation_accepts_only_the_three_approved_values(string priority, bool expected) =>
        Assert.Equal(expected, IssueEnums.ValidPriorities.Contains(priority));

    [Theory]
    [InlineData("open", true)]
    [InlineData("in_progress", true)]
    [InlineData("resolved", true)]
    [InlineData("closed", true)]
    [InlineData("pending", false)]
    public void Status_validation_accepts_only_the_four_approved_values(string status, bool expected) =>
        Assert.Equal(expected, IssueEnums.ValidStatuses.Contains(status));
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet test tests/Sms.Tests.Unit --filter "FullyQualifiedName~IssueValidationTests"`
Expected: FAIL — `IssueModule`/`IssueEnums` does not exist yet.

- [ ] **Step 3: Write `IssueModule.cs`**

```csharp
using Microsoft.Extensions.DependencyInjection;
using Sms.Shared.Kernel.Data;

namespace Sms.Modules.Issues;

public static class IssueEnums
{
    public static readonly string[] ValidCategories = ["vehicle", "student", "route", "safety", "other"];
    public static readonly string[] ValidPriorities = ["normal", "high", "emergency"];
    public static readonly string[] ValidStatuses = ["open", "in_progress", "resolved", "closed"];
}

public sealed record IssueResponse(
    Guid Id, Guid TenantId, Guid ReporterUserId, string Category, string Title, string Description,
    string Priority, string Status, Guid? VehicleId, Guid? RouteId, Guid? TripId, string? PhotoUrl,
    DateTime CreatedAt, DateTime UpdatedAt);

public sealed record CreateIssueRequest(
    string Category, string Title, string Description, string Priority, Guid? TripId, string? PhotoUrl);

public sealed record UpdateIssueRequest(string? Status, string? Note);

public sealed record IssueNoteResponse(Guid Id, Guid IssueId, Guid AuthorUserId, string Note, DateTime CreatedAt);

public sealed class IssueRepository(IDbConnectionFactory factory) : BaseRepository(factory)
{
    private const string IssueCols =
        "Id, TenantId, ReporterUserId, Category, Title, Description, Priority, Status, " +
        "VehicleId, RouteId, TripId, PhotoUrl, CreatedAt, UpdatedAt";

    private sealed record UserIdRow(Guid Id);

    public Task<IReadOnlyList<IssueResponse>> ListAsync(
        string? status, Guid? reporterUserId, CancellationToken ct = default) =>
        QueryInlineAsync<IssueResponse>(
            $"SELECT {IssueCols} FROM dbo.Issues WHERE (@status IS NULL OR Status = @status) " +
            "AND (@reporterUserId IS NULL OR ReporterUserId = @reporterUserId) ORDER BY CreatedAt DESC",
            new { status, reporterUserId }, ct);

    public async Task<IssueResponse?> GetAsync(Guid id, CancellationToken ct = default) =>
        (await QueryInlineAsync<IssueResponse>($"SELECT {IssueCols} FROM dbo.Issues WHERE Id = @id", new { id }, ct))
        .FirstOrDefault();

    public Task<IReadOnlyList<IssueNoteResponse>> GetNotesAsync(Guid issueId, CancellationToken ct = default) =>
        QueryInlineAsync<IssueNoteResponse>(
            "SELECT Id, IssueId, AuthorUserId, Note, CreatedAt FROM dbo.IssueNotes WHERE IssueId = @issueId ORDER BY CreatedAt",
            new { issueId }, ct);

    public Task<IssueResponse?> CreateAsync(
        Guid tenantId, Guid reporterUserId, CreateIssueRequest r, Guid? vehicleId, Guid? routeId, string? photoUrl,
        CancellationToken ct = default) =>
        QuerySingleProcAsync<IssueResponse>("dbo.Issue_Create", new
        {
            TenantId = tenantId,
            ReporterUserId = reporterUserId,
            r.Category,
            r.Title,
            r.Description,
            r.Priority,
            VehicleId = vehicleId,
            RouteId = routeId,
            r.TripId,
            PhotoUrl = photoUrl,
        }, ct);

    public Task<IssueResponse?> UpdateStatusAsync(Guid id, string status, CancellationToken ct = default) =>
        QuerySingleProcAsync<IssueResponse>("dbo.Issue_Update", new { Id = id, Status = status }, ct);

    public Task<IssueNoteResponse?> AddNoteAsync(
        Guid tenantId, Guid issueId, Guid authorUserId, string note, CancellationToken ct = default) =>
        QuerySingleProcAsync<IssueNoteResponse>("dbo.IssueNote_Add",
            new { TenantId = tenantId, IssueId = issueId, AuthorUserId = authorUserId, Note = note }, ct);

    /// Tenant's SchoolAdmin/SchoolOwner users — targets for the "new issue" notification.
    /// UserRoles has no TenantId column, so this joins through Users (which does).
    public async Task<IReadOnlyList<Guid>> GetManagerUserIdsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var rows = await QueryInlineAsync<UserIdRow>(@"
SELECT DISTINCT u.Id
FROM dbo.Users u
INNER JOIN dbo.UserRoles ur ON ur.UserId = u.Id
WHERE u.TenantId = @tenantId AND ur.Role IN (@admin, @owner)",
            new { tenantId, admin = "school.admin", owner = "school.owner" }, ct);
        return rows.Select(r => r.Id).ToList();
    }
}

public static class IssueModule
{
    public static IServiceCollection AddIssuesModule(this IServiceCollection services)
    {
        services.AddScoped<IssueRepository>();
        return services;
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet test tests/Sms.Tests.Unit --filter "FullyQualifiedName~IssueValidationTests"`
Expected: PASS (12 test cases).

- [ ] **Step 5: Build the whole solution to catch any wiring errors**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd D:\SMS\sms-project\sms-backend
git add src/Sms.Modules.Issues/ tests/Sms.Tests.Unit/Issues/
git commit -m "feat(issues): add Issue DTOs and IssueRepository

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: IssueService — business logic, trip-context validation, notification

**Files:**
- Create: `D:\SMS\sms-project\sms-backend\src\Sms.Application\Services\Issues\IssueService.cs`
- Modify: `D:\SMS\sms-project\sms-backend\src\Sms.Application\DependencyInjection.cs:61` (add `services.AddScoped<IIssueService, IssueService>();` next to the existing `IComplaintService`/`INotificationService` registrations)
- Modify: `D:\SMS\sms-project\sms-backend\src\Sms.Api\Extensions\ServiceCollectionExtensions.cs:229` (add `builder.Services.AddIssuesModule();` next to `AddCommsModule()`)

**Interfaces:**
- Consumes: `IssueRepository` (Task 2), `TripRepository.GetParticipantRoleAsync/GetBusIdAsync/GetTripRouteIdAsync` (existing, `Sms.Modules.Transport`), `INotificationService.CreateAsync` (existing, `Sms.Application.Services.Comms`), `ITenantContext`, `RoleChecks.IsStaff`, `ImageUrlValidation.Validate/Normalize`, `ApiResult<T>`/`Error`.
- Produces: `IIssueService` with `CreateAsync`, `ListAsync`, `GetAsync`, `UpdateAsync` — Task 4's `IssueController` consumes these by exact signature. Also `IssueDetailResponse(IssueResponse Issue, IReadOnlyList<IssueNoteResponse> Notes)`.

This task's correctness is verified end-to-end in Task 5's integration tests (a real DB is required to exercise tenant isolation, RLS, and the trip lookup — mocking `BaseRepository`'s Dapper calls would not prove anything real, and no existing service in this codebase does that; every service test here is a `WebApplicationFactory` + `SqlServerFixture` integration test, e.g. `AnnouncementUserScopedNotificationTests.cs`). This task just writes the implementation; do not skip Task 5.

- [ ] **Step 1: Write `IssueService.cs`**

```csharp
using System.Security.Claims;
using Sms.Application.Common;
using Sms.Application.Services.Comms;
using Sms.Modules.Issues;
using Sms.Modules.Transport;
using Sms.Shared.Kernel.Authz;
using Sms.Shared.Kernel.Results;
using Sms.Shared.Kernel.Tenancy;

namespace Sms.Application.Services.Issues;

public sealed record IssueDetailResponse(IssueResponse Issue, IReadOnlyList<IssueNoteResponse> Notes);

public interface IIssueService
{
    Task<ApiResult<IssueResponse>> CreateAsync(CreateIssueRequest req, CancellationToken ct = default);
    Task<ApiResult<IReadOnlyList<IssueResponse>>> ListAsync(string? status, ClaimsPrincipal caller, CancellationToken ct = default);
    Task<ApiResult<IssueDetailResponse>> GetAsync(Guid id, ClaimsPrincipal caller, CancellationToken ct = default);
    Task<ApiResult<IssueResponse>> UpdateAsync(Guid id, UpdateIssueRequest req, ClaimsPrincipal caller, CancellationToken ct = default);
}

public sealed class IssueService(
    IssueRepository repo, TripRepository trips, INotificationService notifications, ITenantContext tenant)
    : IIssueService
{
    public async Task<ApiResult<IssueResponse>> CreateAsync(CreateIssueRequest req, CancellationToken ct = default)
    {
        if (tenant.TenantId is not { } tid || tenant.UserId is not { } uid)
            return ApiResult<IssueResponse>.Fail(new Error("forbidden", "no tenant/user context"), 403);
        if (!IssueEnums.ValidCategories.Contains(req.Category))
            return ApiResult<IssueResponse>.Fail(
                new Error("invalid_request", $"Category must be one of: {string.Join(", ", IssueEnums.ValidCategories)}"), 400);
        if (!IssueEnums.ValidPriorities.Contains(req.Priority))
            return ApiResult<IssueResponse>.Fail(
                new Error("invalid_request", $"Priority must be one of: {string.Join(", ", IssueEnums.ValidPriorities)}"), 400);
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Description))
            return ApiResult<IssueResponse>.Fail(new Error("invalid_request", "Title and description are required"), 400);
        if (ImageUrlValidation.Validate(req.PhotoUrl) is { } photoError)
            return ApiResult<IssueResponse>.Fail(photoError, 400);

        Guid? vehicleId = null, routeId = null;
        if (req.TripId is { } tripId)
        {
            if (await trips.GetParticipantRoleAsync(tripId, uid, ct) is null)
                return ApiResult<IssueResponse>.Fail(new Error("invalid_request", "trip does not belong to you"), 400);
            vehicleId = await trips.GetBusIdAsync(tripId, ct);
            routeId = await trips.GetTripRouteIdAsync(tripId, ct);
        }

        var created = await repo.CreateAsync(tid, uid, req, vehicleId, routeId, ImageUrlValidation.Normalize(req.PhotoUrl), ct);
        if (created is null)
            return ApiResult<IssueResponse>.Fail(new Error("server_error", "could not create issue"), 500);

        foreach (var managerId in await repo.GetManagerUserIdsAsync(tid, ct))
        {
            await notifications.CreateAsync(new CreateNotificationRequest(
                Icon: "alert",
                Tone: "warning",
                Title: $"New issue reported: {created.Title}",
                Body: created.Description,
                UserId: managerId), ct);
        }

        return ApiResult<IssueResponse>.Ok(created, 201);
    }

    public async Task<ApiResult<IReadOnlyList<IssueResponse>>> ListAsync(
        string? status, ClaimsPrincipal caller, CancellationToken ct = default)
    {
        if (tenant.UserId is not { } uid)
            return ApiResult<IReadOnlyList<IssueResponse>>.Fail(new Error("forbidden", "no user context"), 403);
        var reporterFilter = RoleChecks.IsStaff(caller) ? (Guid?)null : uid;
        return ApiResult<IReadOnlyList<IssueResponse>>.Ok(await repo.ListAsync(status, reporterFilter, ct));
    }

    public async Task<ApiResult<IssueDetailResponse>> GetAsync(Guid id, ClaimsPrincipal caller, CancellationToken ct = default)
    {
        if (tenant.UserId is not { } uid)
            return ApiResult<IssueDetailResponse>.Fail(new Error("forbidden", "no user context"), 403);
        if (await repo.GetAsync(id, ct) is not { } issue)
            return ApiResult<IssueDetailResponse>.Fail(new Error("not_found", "resource not found"), 404);
        if (!RoleChecks.IsStaff(caller) && issue.ReporterUserId != uid)
            return ApiResult<IssueDetailResponse>.Fail(new Error("forbidden", "not your issue"), 403);
        var notes = await repo.GetNotesAsync(id, ct);
        return ApiResult<IssueDetailResponse>.Ok(new IssueDetailResponse(issue, notes));
    }

    public async Task<ApiResult<IssueResponse>> UpdateAsync(
        Guid id, UpdateIssueRequest req, ClaimsPrincipal caller, CancellationToken ct = default)
    {
        if (!RoleChecks.IsStaff(caller))
            return ApiResult<IssueResponse>.Fail(new Error("forbidden", "manager only"), 403);
        if (tenant.TenantId is not { } tid || tenant.UserId is not { } uid)
            return ApiResult<IssueResponse>.Fail(new Error("forbidden", "no tenant/user context"), 403);
        if (req.Status is { } status && !IssueEnums.ValidStatuses.Contains(status))
            return ApiResult<IssueResponse>.Fail(
                new Error("invalid_request", $"Status must be one of: {string.Join(", ", IssueEnums.ValidStatuses)}"), 400);
        if (await repo.GetAsync(id, ct) is null)
            return ApiResult<IssueResponse>.Fail(new Error("not_found", "resource not found"), 404);

        if (!string.IsNullOrWhiteSpace(req.Note))
            await repo.AddNoteAsync(tid, id, uid, req.Note, ct);

        var updated = req.Status is { } s ? await repo.UpdateStatusAsync(id, s, ct) : await repo.GetAsync(id, ct);
        return ApiResult<IssueResponse>.Ok(updated!);
    }
}
```

- [ ] **Step 2: Register the service and module in DI**

In `src/Sms.Application/DependencyInjection.cs`, add this line immediately after the existing `services.AddScoped<INotificationService, NotificationService>();` (line 62):

```csharp
        services.AddScoped<IIssueService, IssueService>();
```

Add the `using Sms.Application.Services.Issues;` directive at the top of the file alongside the other `Sms.Application.Services.*` usings.

In `src/Sms.Api/Extensions/ServiceCollectionExtensions.cs`, add this line immediately after the existing `builder.Services.AddCommsModule();` (line 229):

```csharp
        builder.Services.AddIssuesModule();
```

Add `using Sms.Modules.Issues;` at the top of the file.

- [ ] **Step 3: Build to confirm DI wiring compiles**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet build`
Expected: build succeeds with no errors (a missing/misspelled registration would surface at runtime, not build time, but this at least catches typos in the `using`/method names).

- [ ] **Step 4: Commit**

```bash
cd D:\SMS\sms-project\sms-backend
git add src/Sms.Application/Services/Issues/ src/Sms.Application/DependencyInjection.cs src/Sms.Api/Extensions/ServiceCollectionExtensions.cs
git commit -m "feat(issues): add IssueService with trip-context validation and manager notification

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: IssueController

**Files:**
- Create: `D:\SMS\sms-project\sms-backend\src\Sms.Api\Controllers\IssueController.cs`

**Interfaces:**
- Consumes: `IIssueService` (Task 3).
- Produces: `POST /v1/staff/issues`, `GET /v1/staff/issues`, `GET /v1/staff/issues/{id}`, `PATCH /v1/issues/{id}` — Task 5's integration tests hit these routes directly.

- [ ] **Step 1: Write `IssueController.cs`**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.Services.Issues;
using Sms.Modules.Issues;

namespace Sms.Api.Controllers;

[Route("v1")]
[Authorize]
public sealed class IssueController(IIssueService issues) : ApiControllerBase
{
    [HttpPost("staff/issues")]
    public async Task<IActionResult> Create([FromBody] CreateIssueRequest req, CancellationToken ct) =>
        FromResult(await issues.CreateAsync(req, ct));

    [HttpGet("staff/issues")]
    public async Task<IActionResult> List([FromQuery] string? status, CancellationToken ct) =>
        FromResult(await issues.ListAsync(status, User, ct));

    [HttpGet("staff/issues/{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        FromResult(await issues.GetAsync(id, User, ct));

    [HttpPatch("issues/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateIssueRequest req, CancellationToken ct) =>
        FromResult(await issues.UpdateAsync(id, req, User, ct));
}
```

- [ ] **Step 2: Build**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd D:\SMS\sms-project\sms-backend
git add src/Sms.Api/Controllers/IssueController.cs
git commit -m "feat(issues): add IssueController exposing staff issue endpoints

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Backend integration tests

**Files:**
- Create: `D:\SMS\sms-project\sms-backend\tests\Sms.Tests.Integration\Issues\IssueEndpointTests.cs`

**Interfaces:**
- Consumes: `IssueController` (Task 4) via real HTTP calls, `SqlServerFixture` (existing test infra used by `AnnouncementUserScopedNotificationTests.cs`), `JwtTokenService` (existing, `Sms.Shared.Kernel.Auth`), `Policies` (existing, `Sms.Shared.Kernel.Authz`).

This mirrors `AnnouncementUserScopedNotificationTests.cs` exactly: a real `WebApplicationFactory<Program>` against a real (test) SQL Server, real JWTs per test user, real HTTP calls, real DB assertions.

- [ ] **Step 1: Write the failing integration test file**

```csharp
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Sms.Shared.Kernel.Auth;
using Sms.Shared.Kernel.Authz;
using Sms.Shared.Kernel.Time;
using Xunit;

namespace Sms.Tests.Integration.Issues;

[Collection("sql")]
public class IssueEndpointTests(SqlServerFixture fx)
{
    private const string Key = "integration-test-signing-key-32-bytes-min!!";

    private static WebApplicationFactory<Program> App(SqlServerFixture fx) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseSetting("environment", "Production");
            b.UseSetting("ConnectionStrings:Sql", fx.ConnectionString);
            b.UseSetting("Jwt:SigningKey", Key);
        });

    private static HttpClient ClientFor(WebApplicationFactory<Program> app, Guid tenantId, Guid userId, string role)
    {
        var jwt = new JwtTokenService(
            new JwtOptions { Issuer = "sms", Audience = "sms-apps", SigningKey = Key, AccessTokenMinutes = 15 },
            new SystemClock());
        var token = jwt.IssueAccess(userId, tenantId, new[] { role }, isPlatform: false);
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);
        return client;
    }

    private static async Task SeedUserAsync(SqlServerFixture fx, Guid tenantId, Guid userId, string name)
    {
        await using var conn = new Microsoft.Data.SqlClient.SqlConnection(fx.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("EXEC sp_set_session_context @key=N'TenantId', @value=@tenantId", new { tenantId });
        await conn.ExecuteAsync(
            "INSERT dbo.Users (Id, TenantId, Name) VALUES (@userId, @tenantId, @name)",
            new { userId, tenantId, name });
    }

    private static async Task SeedManagerRoleAsync(SqlServerFixture fx, Guid userId, string role)
    {
        await using var conn = new Microsoft.Data.SqlClient.SqlConnection(fx.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("INSERT dbo.UserRoles (UserId, Role) VALUES (@userId, @role)", new { userId, role });
    }

    [Fact]
    public async Task Driver_can_create_an_issue_and_it_is_visible_only_to_them_and_managers()
    {
        var tenantId = Guid.NewGuid();
        var driverId = Guid.NewGuid();
        var otherDriverId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        await SeedUserAsync(fx, tenantId, driverId, "Driver One");
        await SeedUserAsync(fx, tenantId, otherDriverId, "Driver Two");
        await SeedUserAsync(fx, tenantId, adminId, "School Admin");
        await SeedManagerRoleAsync(fx, adminId, Policies.SchoolAdmin);

        var app = App(fx);
        var driverClient = ClientFor(app, tenantId, driverId, "driver");
        var otherDriverClient = ClientFor(app, tenantId, otherDriverId, "driver");
        var adminClient = ClientFor(app, tenantId, adminId, Policies.SchoolAdmin);

        var create = await driverClient.PostAsJsonAsync("/v1/staff/issues", new
        {
            category = "safety",
            title = "Loose seatbelt on row 3",
            description = "Seatbelt buckle on the third row is broken.",
            priority = "high",
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        using var createdDoc = JsonDocument.Parse(await create.Content.ReadAsStringAsync());
        var reporterUserId = createdDoc.RootElement.GetProperty("data").GetProperty("reporter_user_id").GetString();
        reporterUserId.Should().Be(driverId.ToString());

        var ownList = await driverClient.GetAsync("/v1/staff/issues");
        ownList.StatusCode.Should().Be(HttpStatusCode.OK);
        using var ownDoc = JsonDocument.Parse(await ownList.Content.ReadAsStringAsync());
        ownDoc.RootElement.GetProperty("data").GetArrayLength().Should().Be(1);

        var peerList = await otherDriverClient.GetAsync("/v1/staff/issues");
        using var peerDoc = JsonDocument.Parse(await peerList.Content.ReadAsStringAsync());
        peerDoc.RootElement.GetProperty("data").GetArrayLength().Should().Be(0);

        var managerList = await adminClient.GetAsync("/v1/staff/issues");
        using var managerDoc = JsonDocument.Parse(await managerList.Content.ReadAsStringAsync());
        managerDoc.RootElement.GetProperty("data").GetArrayLength().Should().Be(1);

        var adminNotifications = await adminClient.GetAsync("/v1/notifications");
        using var notifDoc = JsonDocument.Parse(await adminNotifications.Content.ReadAsStringAsync());
        var titles = notifDoc.RootElement.GetProperty("data").EnumerateArray()
            .Select(r => r.GetProperty("title").GetString()).ToList();
        titles.Should().Contain(t => t != null && t.Contains("Loose seatbelt on row 3"));
    }

    [Theory]
    [InlineData("driver")]
    [InlineData("conductor")]
    [InlineData("sweeper")]
    [InlineData("gardener")]
    [InlineData("guard")]
    [InlineData("peon")]
    public async Task All_six_staff_roles_can_create_an_issue(string role)
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        await SeedUserAsync(fx, tenantId, userId, $"Staff {role}");
        var client = ClientFor(App(fx), tenantId, userId, role);

        var create = await client.PostAsJsonAsync("/v1/staff/issues", new
        {
            category = "other",
            title = $"{role} reported issue",
            description = "Description text.",
            priority = "normal",
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Reporter_is_always_taken_from_the_authenticated_token_not_the_request_body()
    {
        var tenantId = Guid.NewGuid();
        var driverId = Guid.NewGuid();
        var impersonatedId = Guid.NewGuid();
        await SeedUserAsync(fx, tenantId, driverId, "Real Driver");
        var client = ClientFor(App(fx), tenantId, driverId, "driver");

        var create = await client.PostAsJsonAsync("/v1/staff/issues", new
        {
            category = "other",
            title = "Attempted spoof",
            description = "Trying to set someone else as reporter.",
            priority = "normal",
            reporter_user_id = impersonatedId,
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        using var doc = JsonDocument.Parse(await create.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("data").GetProperty("reporter_user_id").GetString().Should().Be(driverId.ToString());
    }

    [Fact]
    public async Task Cross_tenant_issues_are_never_visible()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        await SeedUserAsync(fx, tenantA, userA, "Tenant A User");
        await SeedUserAsync(fx, tenantB, userB, "Tenant B Admin");
        await SeedManagerRoleAsync(fx, userB, Policies.SchoolAdmin);

        var app = App(fx);
        var clientA = ClientFor(app, tenantA, userA, "driver");
        var clientB = ClientFor(app, tenantB, userB, Policies.SchoolAdmin);

        await clientA.PostAsJsonAsync("/v1/staff/issues", new
        {
            category = "other", title = "Tenant A issue", description = "Description.", priority = "normal",
        });

        var listB = await clientB.GetAsync("/v1/staff/issues");
        using var docB = JsonDocument.Parse(await listB.Content.ReadAsStringAsync());
        docB.RootElement.GetProperty("data").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Non_manager_cannot_patch_an_issue()
    {
        var tenantId = Guid.NewGuid();
        var driverId = Guid.NewGuid();
        await SeedUserAsync(fx, tenantId, driverId, "Driver");
        var client = ClientFor(App(fx), tenantId, driverId, "driver");

        var create = await client.PostAsJsonAsync("/v1/staff/issues", new
        {
            category = "other", title = "Issue", description = "Description.", priority = "normal",
        });
        using var doc = JsonDocument.Parse(await create.Content.ReadAsStringAsync());
        var id = doc.RootElement.GetProperty("data").GetProperty("id").GetString();

        var patch = await client.PatchAsJsonAsync($"/v1/issues/{id}", new { status = "resolved" });
        patch.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Manager_can_patch_status_and_add_a_note()
    {
        var tenantId = Guid.NewGuid();
        var driverId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        await SeedUserAsync(fx, tenantId, driverId, "Driver");
        await SeedUserAsync(fx, tenantId, adminId, "Admin");
        await SeedManagerRoleAsync(fx, adminId, Policies.SchoolAdmin);
        var app = App(fx);
        var driverClient = ClientFor(app, tenantId, driverId, "driver");
        var adminClient = ClientFor(app, tenantId, adminId, Policies.SchoolAdmin);

        var create = await driverClient.PostAsJsonAsync("/v1/staff/issues", new
        {
            category = "other", title = "Issue", description = "Description.", priority = "normal",
        });
        using var doc = JsonDocument.Parse(await create.Content.ReadAsStringAsync());
        var id = doc.RootElement.GetProperty("data").GetProperty("id").GetString();

        var patch = await adminClient.PatchAsJsonAsync($"/v1/issues/{id}", new { status = "in_progress", note = "Looking into it." });
        patch.StatusCode.Should().Be(HttpStatusCode.OK);
        using var patchDoc = JsonDocument.Parse(await patch.Content.ReadAsStringAsync());
        patchDoc.RootElement.GetProperty("data").GetProperty("status").GetString().Should().Be("in_progress");

        var detail = await adminClient.GetAsync($"/v1/staff/issues/{id}");
        using var detailDoc = JsonDocument.Parse(await detail.Content.ReadAsStringAsync());
        detailDoc.RootElement.GetProperty("data").GetProperty("notes").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task Invalid_status_value_is_rejected()
    {
        var tenantId = Guid.NewGuid();
        var driverId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        await SeedUserAsync(fx, tenantId, driverId, "Driver");
        await SeedUserAsync(fx, tenantId, adminId, "Admin");
        await SeedManagerRoleAsync(fx, adminId, Policies.SchoolAdmin);
        var app = App(fx);
        var driverClient = ClientFor(app, tenantId, driverId, "driver");
        var adminClient = ClientFor(app, tenantId, adminId, Policies.SchoolAdmin);

        var create = await driverClient.PostAsJsonAsync("/v1/staff/issues", new
        {
            category = "other", title = "Issue", description = "Description.", priority = "normal",
        });
        using var doc = JsonDocument.Parse(await create.Content.ReadAsStringAsync());
        var id = doc.RootElement.GetProperty("data").GetProperty("id").GetString();

        var patch = await adminClient.PatchAsJsonAsync($"/v1/issues/{id}", new { status = "bogus_status" });
        patch.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Reporting_against_a_trip_that_does_not_belong_to_the_caller_is_rejected()
    {
        var tenantId = Guid.NewGuid();
        var driverId = Guid.NewGuid();
        var otherDriverId = Guid.NewGuid();
        await SeedUserAsync(fx, tenantId, driverId, "Driver");
        await SeedUserAsync(fx, tenantId, otherDriverId, "Other Driver");
        var app = App(fx);
        var otherDriverClient = ClientFor(app, tenantId, otherDriverId, "driver");
        var driverClient = ClientFor(app, tenantId, driverId, "driver");

        var startTrip = await otherDriverClient.PostAsJsonAsync("/v1/staff/trips", new { busNo = "BUS-1", direction = "pickup" });
        startTrip.StatusCode.Should().Be(HttpStatusCode.Created);
        using var tripDoc = JsonDocument.Parse(await startTrip.Content.ReadAsStringAsync());
        var tripId = tripDoc.RootElement.GetProperty("data").GetProperty("id").GetString();

        var create = await driverClient.PostAsJsonAsync("/v1/staff/issues", new
        {
            category = "vehicle", title = "Issue", description = "Description.", priority = "normal", trip_id = tripId,
        });
        create.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Two_rapid_submissions_create_two_distinct_issues_no_deduplication_for_mvp()
    {
        var tenantId = Guid.NewGuid();
        var driverId = Guid.NewGuid();
        await SeedUserAsync(fx, tenantId, driverId, "Driver");
        var client = ClientFor(App(fx), tenantId, driverId, "driver");

        var body = new { category = "other", title = "Duplicate?", description = "Same text twice.", priority = "normal" };
        var first = await client.PostAsJsonAsync("/v1/staff/issues", body);
        var second = await client.PostAsJsonAsync("/v1/staff/issues", body);
        first.StatusCode.Should().Be(HttpStatusCode.Created);
        second.StatusCode.Should().Be(HttpStatusCode.Created);

        var list = await client.GetAsync("/v1/staff/issues");
        using var doc = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("data").GetArrayLength().Should().Be(2);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail (or don't compile) before Tasks 1-4 exist**

Skip this step if Tasks 1-4 are already complete and merged as part of this same plan execution — in that case, run the tests immediately (Step 3) since they should already pass. If executing tasks out of order, run:

Run: `cd D:\SMS\sms-project\sms-backend && dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~IssueEndpointTests"`
Expected: FAIL (compile error or 404s) if Tasks 1-4 are not yet done.

- [ ] **Step 3: Run the tests and verify they pass**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~IssueEndpointTests"`
Expected: PASS — 12 test cases (1 + 6 theory cases + 1 + 1 + 1 + 1 + 1 + 1... count exactly from the file: `Driver_can_create...` (1), `All_six_staff_roles_can_create_an_issue` (6 theory cases), `Reporter_is_always_taken...` (1), `Cross_tenant_issues_are_never_visible` (1), `Non_manager_cannot_patch_an_issue` (1), `Manager_can_patch_status_and_add_a_note` (1), `Invalid_status_value_is_rejected` (1), `Reporting_against_a_trip_that_does_not_belong...` (1), `Two_rapid_submissions...` (1) = 14 total).

If `Reporting_against_a_trip_that_does_not_belong_to_the_caller_is_rejected` fails because the actual trip-start route/body shape differs from `/v1/staff/trips` with `{busNo, direction}` — check `TripController.cs`'s actual route (`POST v1/staff/trips`) and `StartTripRequest(Guid? RouteId, string? BusNo, string Direction)`'s actual JSON casing (the API uses snake_case via a naming policy, confirm from `ServiceCollectionExtensions.cs`'s `SnakeCaseNamingPolicy` usage) and adjust the test body's field names to match (`bus_no`, `direction`) rather than changing production code.

- [ ] **Step 4: Run the full backend test suite for regressions**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet test`
Expected: all existing tests still pass — no regressions in Complaints, Notifications, Transport, Attendance, or Auth.

- [ ] **Step 5: Commit**

```bash
cd D:\SMS\sms-project\sms-backend
git add tests/Sms.Tests.Integration/Issues/
git commit -m "test(issues): add integration tests for tenant isolation, RBAC, trip validation, and notifications

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Mobile domain type, repository contract, and mock repository

**Files:**
- Modify: `D:\SMS\sms-project\sms-staff\src\data\domain\index.ts` (add `export * from './issue';` — check the exact re-export style already used for `task.ts`/`trip.ts` in this file and match it)
- Create: `D:\SMS\sms-project\sms-staff\src\data\domain\issue.ts`
- Modify: `D:\SMS\sms-project\sms-staff\src\data\repositories\types.ts` (add `IssuesRepository` interface and `issues: IssuesRepository` field on `Repositories`)
- Modify: `D:\SMS\sms-project\sms-staff\src\data\mock\store.ts` (add `issues: Issue[]` field, initialized to `[]`, to the `Store` interface and `createStore()`)
- Create: `D:\SMS\sms-project\sms-staff\src\data\mock\issues.repo.ts`
- Modify: `D:\SMS\sms-project\sms-staff\src\data\repositories\factory.ts` (wire `issues: mockIssues(store)` into `createMockRepositories`)
- Test: `D:\SMS\sms-project\sms-staff\src\data\mock\__tests__\issues.repo.test.ts`

**Interfaces:**
- Produces: `Issue`, `NewIssue`, `IssueCategory`, `IssuePriority`, `IssueStatus` types; `IssuesRepository` interface (`list(): Promise<Issue[]>`, `create(req: NewIssue): Promise<Issue>`); `mockIssues(store): IssuesRepository`. Task 7 (http repo) implements the same `IssuesRepository` interface; Task 8 (hooks) consumes `repos.issues.list`/`.create`.

- [ ] **Step 1: Write the domain type**

```typescript
// src/data/domain/issue.ts
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
  photoUrl?: string;
  createdAt: string;
}

export interface NewIssue {
  category: IssueCategory;
  title: string;
  description: string;
  priority: IssuePriority;
  tripId?: string;
  photoUri?: string;
}
```

Read `src/data/domain/index.ts` first to see whether it re-exports each domain file as `export * from './task';` or similar, and add the `issue.ts` export in the exact same style, alphabetically placed if the existing list is alphabetized.

- [ ] **Step 2: Add the repository contract**

In `src/data/repositories/types.ts`, add near the other repository interfaces (e.g. right after `TasksRepository`):

```typescript
export interface IssuesRepository {
  list(): Promise<Issue[]>;
  create(req: NewIssue): Promise<Issue>;
}
```

Add `Issue, NewIssue` to the existing `import type { ... } from '@/data/domain';` line at the top of the file, and add `issues: IssuesRepository;` to the `Repositories` interface (after `tasks: TasksRepository;`).

- [ ] **Step 3: Add `issues` to the mock `Store`**

In `src/data/mock/store.ts`, add `issues: Issue[];` to the `Store` interface (add `Issue` to the existing domain type import), and in `createStore()`'s returned object literal add `issues: [],` (next to `tasks: clone(seed.tasks),` — no seeding needed, starts empty per the spec).

- [ ] **Step 4: Write the failing mock repo test**

```typescript
// src/data/mock/__tests__/issues.repo.test.ts
import { createStore } from '@/data/mock/store';
import { mockIssues } from '@/data/mock/issues.repo';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

describe('mock issues repo', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('starts empty', async () => {
    const repo = mockIssues(await createStore());
    expect(await repo.list()).toEqual([]);
  });

  it('create adds an issue with status open and returns it', async () => {
    const repo = mockIssues(await createStore());
    const created = await repo.create({
      category: 'safety',
      title: 'Loose seatbelt',
      description: 'Row 3 seatbelt is broken.',
      priority: 'high',
    });
    expect(created.status).toBe('open');
    expect(created.title).toBe('Loose seatbelt');
    expect(created.id).toBeTruthy();
  });

  it('create prepends the new issue so list() returns newest first', async () => {
    const repo = mockIssues(await createStore());
    await repo.create({ category: 'other', title: 'First', description: 'd', priority: 'normal' });
    await repo.create({ category: 'other', title: 'Second', description: 'd', priority: 'normal' });
    const list = await repo.list();
    expect(list[0].title).toBe('Second');
    expect(list[1].title).toBe('First');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/data/mock/__tests__/issues.repo.test.ts`
Expected: FAIL — `mockIssues` module does not exist.

- [ ] **Step 6: Write `issues.repo.ts`**

```typescript
// src/data/mock/issues.repo.ts
import type { IssuesRepository } from '@/data/repositories/types';
import type { Issue, NewIssue } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function mockIssues(store: Store): IssuesRepository {
  return {
    async list(): Promise<Issue[]> {
      await simulateLatency();
      return clone(store.issues);
    },
    async create(req: NewIssue): Promise<Issue> {
      await simulateLatency();
      const issue: Issue = {
        id: store.genId('issue'),
        category: req.category,
        title: req.title,
        description: req.description,
        priority: req.priority,
        status: 'open',
        tripId: req.tripId,
        photoUrl: req.photoUri,
        createdAt: new Date().toISOString(),
      };
      store.issues.unshift(issue);
      return clone(issue);
    },
  };
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/data/mock/__tests__/issues.repo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Wire into the mock repository factory**

In `src/data/repositories/factory.ts`, add `import { mockIssues } from '@/data/mock/issues.repo';` and add `issues: mockIssues(store),` to `createMockRepositories`'s returned object (next to `tasks: mockTasks(store),`).

- [ ] **Step 9: Run the full mobile test suite to catch any wiring break**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest`
Expected: all tests pass, including the existing `src/data/mock/__tests__/repos.test.ts` (which likely asserts on the full `Repositories` shape — if it fails because `issues` is now required but not asserted there, that's expected churn; check whether that test enumerates repository keys and needs `issues` added to its expectations, and update it if so — this is the one exception to "don't touch unrelated tests," since adding a field to `Repositories` is the direct, necessary consequence of this task).

- [ ] **Step 10: Commit**

```bash
cd D:\SMS\sms-project\sms-staff
git add src/data/domain/issue.ts src/data/domain/index.ts src/data/repositories/types.ts src/data/repositories/factory.ts src/data/mock/store.ts src/data/mock/issues.repo.ts src/data/mock/__tests__/issues.repo.test.ts src/data/mock/__tests__/repos.test.ts
git commit -m "feat(issues): add Issue domain type, repository contract, and mock repository

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Mobile HTTP repository and mapper

**Files:**
- Modify: `D:\SMS\sms-project\sms-staff\src\data\http\mappers.ts` (add `IssueDTO`, `toIssue`, `fromNewIssue`)
- Create: `D:\SMS\sms-project\sms-staff\src\data\http\issues.repo.ts`
- Modify: `D:\SMS\sms-project\sms-staff\src\data\repositories\factory.ts` (wire `issues: httpIssues(http)` into `createHttpRepositories`)
- Test: `D:\SMS\sms-project\sms-staff\src\data\http\__tests__\issues.repo.test.ts`

**Interfaces:**
- Consumes: `HttpClient` (existing, `src/lib/httpClient.ts`), `Issue`/`NewIssue` (Task 6).
- Produces: `httpIssues(http): IssuesRepository` — same interface Task 6's `mockIssues` implements, selected by `createHttpRepositories`.

- [ ] **Step 1: Write the failing http repo test**

```typescript
// src/data/http/__tests__/issues.repo.test.ts
import { httpIssues } from '@/data/http/issues.repo';
import type { HttpClient } from '@/lib/httpClient';

function fakeHttp(routes: Record<string, unknown>): { http: HttpClient; calls: Array<{ method: string; path: string; body?: unknown }> } {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const http: HttpClient = {
    get: <T>(path: string) => { calls.push({ method: 'GET', path }); return Promise.resolve(routes[`GET ${path}`] as T); },
    post: <T>(path: string, body?: unknown) => { calls.push({ method: 'POST', path, body }); return Promise.resolve(routes[`POST ${path}`] as T); },
    patch: <T>(path: string, body?: unknown) => { calls.push({ method: 'PATCH', path, body }); return Promise.resolve(routes[`PATCH ${path}`] as T); },
    delete: <T>(path: string) => { calls.push({ method: 'DELETE', path }); return Promise.resolve(routes[`DELETE ${path}`] as T); },
  };
  return { http, calls };
}

describe('httpIssues', () => {
  it('list maps DTOs to domain Issues', async () => {
    const { http } = fakeHttp({
      'GET /staff/issues': [
        { id: 'i1', category: 'safety', title: 'Loose seatbelt', description: 'd', priority: 'high', status: 'open', created_at: '2026-09-15T08:00:00Z' },
      ],
    });
    const list = await httpIssues(http).list();
    expect(list).toEqual([
      { id: 'i1', category: 'safety', title: 'Loose seatbelt', description: 'd', priority: 'high', status: 'open', createdAt: '2026-09-15T08:00:00Z' },
    ]);
  });

  it('create posts snake_case fields and maps the response back', async () => {
    const { http, calls } = fakeHttp({
      'POST /staff/issues': { id: 'i2', category: 'other', title: 'T', description: 'd', priority: 'normal', status: 'open', created_at: '2026-09-15T08:00:00Z' },
    });
    const created = await httpIssues(http).create({ category: 'other', title: 'T', description: 'd', priority: 'normal', tripId: 'trip_1' });
    expect(created.id).toBe('i2');
    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/staff/issues',
      body: { category: 'other', title: 'T', description: 'd', priority: 'normal', trip_id: 'trip_1', photo_url: undefined },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/data/http/__tests__/issues.repo.test.ts`
Expected: FAIL — `httpIssues` does not exist.

- [ ] **Step 3: Add the DTO and mapper functions to `mappers.ts`**

Append to `src/data/http/mappers.ts` (near `toTask`, matching its style):

```typescript
export interface IssueDTO {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  vehicle_id?: string;
  route_id?: string;
  trip_id?: string;
  photo_url?: string;
  created_at: string;
}
export function toIssue(d: IssueDTO): Issue {
  const i: Issue = {
    id: d.id,
    category: d.category as IssueCategory,
    title: d.title,
    description: d.description,
    priority: d.priority as IssuePriority,
    status: d.status as IssueStatus,
    createdAt: d.created_at,
  };
  if (d.vehicle_id !== undefined) i.vehicleId = d.vehicle_id;
  if (d.route_id !== undefined) i.routeId = d.route_id;
  if (d.trip_id !== undefined) i.tripId = d.trip_id;
  if (d.photo_url !== undefined) i.photoUrl = d.photo_url;
  return i;
}
export const fromNewIssue = (r: NewIssue) => ({
  category: r.category,
  title: r.title,
  description: r.description,
  priority: r.priority,
  trip_id: r.tripId,
  photo_url: r.photoUri,
});
```

Add `Issue, IssueCategory, IssuePriority, IssueStatus, NewIssue` to the existing `import type { ... } from '@/data/domain';` block at the top of `mappers.ts`.

- [ ] **Step 4: Write `issues.repo.ts`**

```typescript
// src/data/http/issues.repo.ts
import type { IssuesRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toIssue, fromNewIssue, type IssueDTO } from './mappers';

export function httpIssues(http: HttpClient): IssuesRepository {
  return {
    list: () => http.get<IssueDTO[]>('/staff/issues').then((a) => a.map(toIssue)),
    create: (req) => http.post<IssueDTO>('/staff/issues', fromNewIssue(req)).then(toIssue),
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/data/http/__tests__/issues.repo.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Wire into the http repository factory**

In `src/data/repositories/factory.ts`, add `import { httpIssues } from '@/data/http/issues.repo';` and `issues: httpIssues(http),` to `createHttpRepositories`.

- [ ] **Step 7: Run the full mobile test suite and typecheck**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest && npm run typecheck`
Expected: all tests pass, typecheck succeeds.

- [ ] **Step 8: Commit**

```bash
cd D:\SMS\sms-project\sms-staff
git add src/data/http/mappers.ts src/data/http/issues.repo.ts src/data/repositories/factory.ts src/data/http/__tests__/issues.repo.test.ts
git commit -m "feat(issues): add http repository and mapper for issues

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Hooks and query key

**Files:**
- Modify: `D:\SMS\sms-project\sms-staff\src\lib\queryClient.ts` (add `issues: (tenantId: string) => ['issues', tenantId] as const,` to `queryKeys`)
- Create: `D:\SMS\sms-project\sms-staff\src\features\issues\hooks.ts`
- Test: `D:\SMS\sms-project\sms-staff\src\features\__tests__\issuesHooks.test.tsx`

**Interfaces:**
- Consumes: `useRepositories`, `useTenantId`, `queryKeys` (all existing), `Issue`/`NewIssue` (Task 6).
- Produces: `useIssues()`, `useReportIssue()` — Task 9's screen consumes both by exact name.

- [ ] **Step 1: Add the query key**

In `src/lib/queryClient.ts`, add `issues: (tenantId: string) => ['issues', tenantId] as const,` to the `queryKeys` object (next to `tasks`).

- [ ] **Step 2: Write the failing hook test**

Check `src/features/__tests__/hooks.test.tsx` first for the exact `renderHook` + `QueryClientProvider` + `RepositoryProvider` wrapper pattern this codebase already uses for hook tests, and mirror it exactly rather than inventing a new harness.

```typescript
// src/features/__tests__/issuesHooks.test.tsx
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { useIssues, useReportIssue } from '@/features/issues/hooks';
import type { Repositories, Issue, NewIssue } from '@/data/domain';

function makeRepos(overrides?: Partial<Repositories['issues']>): Repositories {
  return {
    issues: {
      list: jest.fn(async () => [] as Issue[]),
      create: jest.fn(async (req: NewIssue) => ({
        id: 'i1', ...req, status: 'open', createdAt: '2026-09-15T08:00:00Z',
      } as unknown as Issue)),
      ...overrides,
    },
  } as unknown as Repositories;
}

function wrapper(repos: Repositories) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepositoryProvider repositories={repos}>{children}</RepositoryProvider>
    </QueryClientProvider>
  );
}

// useTenantId reads from AuthProvider context — mock it the same way other feature hook
// tests in this file/suite already do (check src/features/__tests__/hooks.test.tsx for the
// exact mock shape before writing this).
jest.mock('@/features/auth/AuthProvider', () => ({
  ...jest.requireActual('@/features/auth/AuthProvider'),
  useTenantId: () => 'tenant_1',
}));

describe('useIssues / useReportIssue', () => {
  it('useIssues returns the repo list', async () => {
    const repos = makeRepos();
    const { result } = renderHook(() => useIssues(), { wrapper: wrapper(repos) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('useReportIssue creates and the mutation resolves with the created issue', async () => {
    const repos = makeRepos();
    const { result } = renderHook(() => useReportIssue(), { wrapper: wrapper(repos) });
    await act(async () => {
      await result.current.mutateAsync({ category: 'other', title: 'T', description: 'd', priority: 'normal' });
    });
    expect(repos.issues.create).toHaveBeenCalledWith({ category: 'other', title: 'T', description: 'd', priority: 'normal' });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/features/__tests__/issuesHooks.test.tsx`
Expected: FAIL — `@/features/issues/hooks` does not exist.

- [ ] **Step 4: Write the hooks**

```typescript
// src/features/issues/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { Issue, NewIssue } from '@/data/domain';

export function useIssues() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.issues(tenantId), queryFn: () => repos.issues.list() });
}

export function useReportIssue() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  const key = queryKeys.issues(tenantId);
  return useMutation({
    mutationFn: (req: NewIssue) => repos.issues.create(req),
    onSuccess: (issue) => {
      const prev = qc.getQueryData<Issue[]>(key) ?? [];
      qc.setQueryData<Issue[]>(key, [issue, ...prev]);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/features/__tests__/issuesHooks.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd D:\SMS\sms-project\sms-staff
git add src/lib/queryClient.ts src/features/issues/hooks.ts src/features/__tests__/issuesHooks.test.tsx
git commit -m "feat(issues): add useIssues/useReportIssue hooks

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: i18n strings (all 4 locales)

**Files:**
- Modify: `D:\SMS\sms-project\sms-staff\src\i18n\resources\en.json`
- Modify: `D:\SMS\sms-project\sms-staff\src\i18n\resources\hi.json`
- Modify: `D:\SMS\sms-project\sms-staff\src\i18n\resources\mr.json`
- Modify: `D:\SMS\sms-project\sms-staff\src\i18n\resources\ta.json`

**Interfaces:**
- Produces: the `issues.*` translation keys Task 10's screen and Task 11's Home quick-action button consume via `t('issues....')`.

- [ ] **Step 1: Add keys to `en.json`**

Add this block (matching the existing flat-key JSON style, alphabetically near `home.*`/`leave.*` or appended at a sensible point — check where `leave.*` keys currently sit and add `issues.*` in the same relative position):

```json
"issues.reportIssue": "Report Issue",
"issues.title": "Report an Issue",
"issues.category": "Category",
"issues.category.vehicle": "Vehicle",
"issues.category.student": "Student",
"issues.category.route": "Route",
"issues.category.safety": "Safety",
"issues.category.other": "Other",
"issues.titleLabel": "Title",
"issues.titlePlaceholder": "Short title",
"issues.description": "Description",
"issues.priority": "Priority",
"issues.priority.normal": "Normal",
"issues.priority.high": "High",
"issues.priority.emergency": "Emergency",
"issues.attachPhoto": "Attach photo",
"issues.submit": "Submit report",
"issues.submitted": "Report submitted",
"issues.submitError": "Something went wrong, please try again",
"issues.invalid": "Please fill in all required fields",
"issues.myIssues": "My Reports",
"issues.empty": "No reports yet",
"issues.status.open": "Open",
"issues.status.in_progress": "In Progress",
"issues.status.resolved": "Resolved",
"issues.status.closed": "Closed"
```

- [ ] **Step 2: Add keys to `hi.json`**

```json
"issues.reportIssue": "समस्या रिपोर्ट करें",
"issues.title": "समस्या रिपोर्ट करें",
"issues.category": "श्रेणी",
"issues.category.vehicle": "वाहन",
"issues.category.student": "छात्र",
"issues.category.route": "मार्ग",
"issues.category.safety": "सुरक्षा",
"issues.category.other": "अन्य",
"issues.titleLabel": "शीर्षक",
"issues.titlePlaceholder": "संक्षिप्त शीर्षक",
"issues.description": "विवरण",
"issues.priority": "प्राथमिकता",
"issues.priority.normal": "सामान्य",
"issues.priority.high": "उच्च",
"issues.priority.emergency": "आपातकालीन",
"issues.attachPhoto": "फ़ोटो जोड़ें",
"issues.submit": "रिपोर्ट सबमिट करें",
"issues.submitted": "रिपोर्ट सबमिट की गई",
"issues.submitError": "कुछ गलत हो गया, फिर से प्रयास करें",
"issues.invalid": "कृपया सभी आवश्यक फ़ील्ड भरें",
"issues.myIssues": "मेरी रिपोर्ट्स",
"issues.empty": "अभी तक कोई रिपोर्ट नहीं",
"issues.status.open": "खुला",
"issues.status.in_progress": "प्रगति पर",
"issues.status.resolved": "हल हो गया",
"issues.status.closed": "बंद"
```

- [ ] **Step 3: Add keys to `mr.json`**

```json
"issues.reportIssue": "समस्या नोंदवा",
"issues.title": "समस्या नोंदवा",
"issues.category": "श्रेणी",
"issues.category.vehicle": "वाहन",
"issues.category.student": "विद्यार्थी",
"issues.category.route": "मार्ग",
"issues.category.safety": "सुरक्षा",
"issues.category.other": "इतर",
"issues.titleLabel": "शीर्षक",
"issues.titlePlaceholder": "थोडक्यात शीर्षक",
"issues.description": "वर्णन",
"issues.priority": "प्राधान्य",
"issues.priority.normal": "सामान्य",
"issues.priority.high": "उच्च",
"issues.priority.emergency": "आणीबाणी",
"issues.attachPhoto": "फोटो जोडा",
"issues.submit": "अहवाल सबमिट करा",
"issues.submitted": "अहवाल सबमिट झाला",
"issues.submitError": "काहीतरी चुकले, पुन्हा प्रयत्न करा",
"issues.invalid": "कृपया सर्व आवश्यक माहिती भरा",
"issues.myIssues": "माझे अहवाल",
"issues.empty": "अद्याप कोणताही अहवाल नाही",
"issues.status.open": "उघडे",
"issues.status.in_progress": "प्रगतीपथावर",
"issues.status.resolved": "सोडवले",
"issues.status.closed": "बंद"
```

- [ ] **Step 4: Add keys to `ta.json`**

```json
"issues.reportIssue": "சிக்கலைப் புகாரளி",
"issues.title": "சிக்கலைப் புகாரளிக்கவும்",
"issues.category": "வகை",
"issues.category.vehicle": "வாகனம்",
"issues.category.student": "மாணவர்",
"issues.category.route": "வழி",
"issues.category.safety": "பாதுகாப்பு",
"issues.category.other": "மற்றவை",
"issues.titleLabel": "தலைப்பு",
"issues.titlePlaceholder": "சுருக்கமான தலைப்பு",
"issues.description": "விவரம்",
"issues.priority": "முன்னுரிமை",
"issues.priority.normal": "சாதாரண",
"issues.priority.high": "உயர்",
"issues.priority.emergency": "அவசரம்",
"issues.attachPhoto": "புகைப்படம் இணை",
"issues.submit": "புகாரைச் சமர்ப்பி",
"issues.submitted": "புகார் சமர்ப்பிக்கப்பட்டது",
"issues.submitError": "ஏதோ தவறு நடந்தது, மீண்டும் முயற்சிக்கவும்",
"issues.invalid": "தேவையான அனைத்து விவரங்களையும் நிரப்பவும்",
"issues.myIssues": "எனது புகார்கள்",
"issues.empty": "இதுவரை புகார்கள் இல்லை",
"issues.status.open": "திறந்துள்ளது",
"issues.status.in_progress": "செயலில்",
"issues.status.resolved": "தீர்க்கப்பட்டது",
"issues.status.closed": "மூடப்பட்டது"
```

- [ ] **Step 5: Validate all 4 files are still valid JSON**

Run: `cd D:\SMS\sms-project\sms-staff && node -e "['en','hi','mr','ta'].forEach(l => JSON.parse(require('fs').readFileSync('src/i18n/resources/'+l+'.json','utf8')))"`
Expected: no output (no thrown error means all 4 parse successfully).

- [ ] **Step 6: Commit**

```bash
cd D:\SMS\sms-project\sms-staff
git add src/i18n/resources/en.json src/i18n/resources/hi.json src/i18n/resources/mr.json src/i18n/resources/ta.json
git commit -m "feat(issues): add issue-reporting translation strings for all 4 locales

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: IssuesScreen (report form + my issues list) and navigation route

**Files:**
- Modify: `D:\SMS\sms-project\sms-staff\src\navigation\types.ts` (add `Issues: undefined;` to `MainStackParamList`)
- Modify: `D:\SMS\sms-project\sms-staff\src\navigation\MainTabNavigator.tsx` (register the `IssuesScreen` as a new `Stack.Screen`, same `presentation: 'card'` pattern as `Attendance`/`Trip`)
- Create: `D:\SMS\sms-project\sms-staff\src\screens\IssuesScreen.tsx`
- Test: `D:\SMS\sms-project\sms-staff\src\screens\__tests__\IssuesScreen.test.tsx`

**Interfaces:**
- Consumes: `useIssues`, `useReportIssue` (Task 8), `useCurrentTrip` (existing, `src/features/trip/hooks.ts`), `Card`/`Btn`/`Pill`/`Skeleton` (existing UI kit), `ErrorState` (existing), `ImagePicker` (expo-image-picker, same pattern as `HomeScreen.handleAttachPhoto`).
- Produces: the `IssuesScreen` component and the `'Issues'` route, which Task 11's Home quick-action navigates to.

- [ ] **Step 1: Add the navigation route type**

In `src/navigation/types.ts`, add `Issues: undefined;` to `MainStackParamList` (next to `Trip: undefined;`).

- [ ] **Step 2: Write the failing screen test**

```typescript
// src/screens/__tests__/IssuesScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { IssuesScreen } from '@/screens/IssuesScreen';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

const mockRequestMediaLibraryPermissionsAsync = jest.fn(async () => ({ status: 'granted' }));
const mockLaunchImageLibraryAsync = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: 'file:///photo.jpg', base64: 'abc123' }],
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockRequestMediaLibraryPermissionsAsync(),
  launchImageLibraryAsync: (..._args: unknown[]) => mockLaunchImageLibraryAsync(),
}));

jest.mock('@/features/trip/hooks', () => ({
  ...jest.requireActual('@/features/trip/hooks'),
  useCurrentTrip: () => ({ data: null, isLoading: false }),
}));

const mockCreate = jest.fn(async (req: unknown) => ({ id: 'i1', status: 'open', createdAt: '2026-09-15T08:00:00Z', ...(req as object) }));
jest.mock('@/features/issues/hooks', () => ({
  useIssues: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useReportIssue: () => ({ mutateAsync: mockCreate, isPending: false }),
}));

function renderIssues() {
  return render(<AppProviders><IssuesScreen /></AppProviders>);
}

it('submits a report with the entered fields', async () => {
  const { getByTestId, getByText } = renderIssues();
  fireEvent.changeText(getByTestId('issue-title'), 'Loose seatbelt');
  fireEvent.changeText(getByTestId('issue-description'), 'Row 3 seatbelt is broken.');
  fireEvent.press(getByTestId('issue-category-safety'));
  fireEvent.press(getByTestId('issue-priority-high'));
  fireEvent.press(getByTestId('issue-submit'));
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
    category: 'safety',
    title: 'Loose seatbelt',
    description: 'Row 3 seatbelt is broken.',
    priority: 'high',
  }));
  expect(getByText('Report submitted')).toBeTruthy();
});

it('shows a validation message when required fields are empty', async () => {
  const { getByTestId, getByText } = renderIssues();
  fireEvent.press(getByTestId('issue-submit'));
  await waitFor(() => expect(getByText('Please fill in all required fields')).toBeTruthy());
  expect(mockCreate).not.toHaveBeenCalled();
});

it('shows an empty state when there are no past reports', async () => {
  const { getByText } = renderIssues();
  await waitFor(() => expect(getByText('No reports yet')).toBeTruthy());
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/screens/__tests__/IssuesScreen.test.tsx`
Expected: FAIL — `IssuesScreen` does not exist.

- [ ] **Step 4: Write `IssuesScreen.tsx`**

Model this closely on `src/screens/LeaveScreen.tsx`'s structure (segmented Pressable buttons for category/priority, `TextInput` for title/description, `Btn` submit, `Pill` for status, list of past items below) — read `LeaveScreen.tsx` again just before writing this if its exact styling helpers (`TextScale`, `Card`, `useTheme`) have changed since this plan was written.

```typescript
// src/screens/IssuesScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme';
import { useIssues, useReportIssue } from '@/features/issues/hooks';
import { useCurrentTrip } from '@/features/trip/hooks';
import { Card, Btn, Pill, Skeleton, useToast } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';
import type { IssueCategory, IssuePriority, IssueStatus } from '@/data/domain';

const CATEGORIES: IssueCategory[] = ['vehicle', 'student', 'route', 'safety', 'other'];
const PRIORITIES: IssuePriority[] = ['normal', 'high', 'emergency'];

function statusColor(status: IssueStatus, colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'resolved' || status === 'closed') return colors.success;
  if (status === 'in_progress') return colors.warn;
  return colors.inkSoft;
}

export const IssuesScreen = () => {
  const { t } = useTranslation();
  const { colors, role } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useIssues();
  const currentTrip = useCurrentTrip();
  const report = useReportIssue();
  const toast = useToast();

  const [category, setCategory] = useState<IssueCategory>('other');
  const [priority, setPriority] = useState<IssuePriority>('normal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const attachPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
  };

  const onSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError(t('issues.invalid'));
      return;
    }
    setError(null);
    try {
      await report.mutateAsync({
        category,
        title,
        description,
        priority,
        tripId: currentTrip.data?.id,
        photoUri,
      });
      setSubmitted(true);
      setTitle('');
      setDescription('');
      setPhotoUri(undefined);
    } catch {
      toast.show(t('issues.submitError'), 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <Text style={[TextScale.screenTitle, styles.title, { color: colors.ink }]}>{t('issues.title')}</Text>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}>
        <Card>
          <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('issues.category')}</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                testID={`issue-category-${c}`}
                onPress={() => setCategory(c)}
                style={[styles.chip, { backgroundColor: category === c ? role.accent : colors.surface, borderColor: role.accent }]}
              >
                <Text style={[TextScale.caption, { color: category === c ? '#FFFFFF' : role.accent }]}>{t(`issues.category.${c}`)}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            testID="issue-title"
            placeholder={t('issues.titlePlaceholder')}
            placeholderTextColor={colors.inkFaint}
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { borderColor: colors.sunken, color: colors.ink }]}
          />
          <TextInput
            testID="issue-description"
            placeholder={t('issues.description')}
            placeholderTextColor={colors.inkFaint}
            value={description}
            onChangeText={setDescription}
            multiline
            style={[styles.input, styles.multiline, { borderColor: colors.sunken, color: colors.ink }]}
          />

          <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('issues.priority')}</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map((p) => (
              <Pressable
                key={p}
                testID={`issue-priority-${p}`}
                onPress={() => setPriority(p)}
                style={[styles.chip, { backgroundColor: priority === p ? role.accent : colors.surface, borderColor: role.accent }]}
              >
                <Text style={[TextScale.caption, { color: priority === p ? '#FFFFFF' : role.accent }]}>{t(`issues.priority.${p}`)}</Text>
              </Pressable>
            ))}
          </View>

          <Btn testID="issue-attach-photo" label={t('issues.attachPhoto')} variant="ghost" icon="camera" onPress={attachPhoto} style={styles.spacer} />
          {error ? <Text style={[TextScale.caption, { color: colors.danger }]}>{error}</Text> : null}
          <Btn testID="issue-submit" label={t('issues.submit')} onPress={onSubmit} accent={role.accent} loading={report.isPending} style={styles.cta} />
          {submitted ? <View testID="issue-submitted"><Pill label={t('issues.submitted')} color={colors.success} bg={colors.successSoft} icon="check" /></View> : null}
        </Card>

        <Text style={[TextScale.cardTitle, { color: colors.ink, marginTop: 4 }]}>{t('issues.myIssues')}</Text>
        {isLoading ? <Skeleton width="100%" height={64} radius={16} />
          : isError ? <ErrorState onRetry={refetch} />
          : data && data.length > 0 ? data.map((issue) => (
            <Card key={issue.id}>
              <View style={styles.issueRow}>
                <Text style={[TextScale.body, { color: colors.ink, flex: 1 }]}>{issue.title}</Text>
                <Pill label={t(`issues.status.${issue.status}`)} color={statusColor(issue.status, colors)} bg={colors.surface2} />
              </View>
            </Card>
          )) : <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t('issues.empty')}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 12 },
  body: { padding: 16, gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  spacer: { marginTop: 4, marginBottom: 8 },
  cta: { marginTop: 4 },
  issueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/screens/__tests__/IssuesScreen.test.tsx`
Expected: PASS (3 tests). If `useToast`/`Card`/`Pill`/`Skeleton`/`Btn` import paths or prop names differ from what's assumed here, fix the import/usage to match `src/components/ui/index.ts`'s actual exports rather than changing the test's expectations.

- [ ] **Step 6: Register the route in the navigator**

In `src/navigation/MainTabNavigator.tsx`, add `import { IssuesScreen } from '@/screens/IssuesScreen';` and register it in the `Stack.Navigator` alongside `Attendance`/`Trip`:

```tsx
    <Stack.Screen
      name="Issues"
      component={IssuesScreen}
      options={{ presentation: 'card', animation: 'slide_from_right' }}
    />
```

- [ ] **Step 7: Commit**

```bash
cd D:\SMS\sms-project\sms-staff
git add src/navigation/types.ts src/navigation/MainTabNavigator.tsx src/screens/IssuesScreen.tsx src/screens/__tests__/IssuesScreen.test.tsx
git commit -m "feat(issues): add IssuesScreen (report form + my issues list) and route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Home quick-action entry point

**Files:**
- Modify: `D:\SMS\sms-project\sms-staff\src\screens\HomeScreen.tsx` (add a "Report Issue" quick-action `Btn`, visible to all 6 roles, navigating to `'Issues'`)
- Modify: `D:\SMS\sms-project\sms-staff\src\screens\__tests__\HomeScreen.test.tsx` (add a test asserting the button exists and navigates)

**Interfaces:**
- Consumes: the existing `Btn` component, `navigation.navigate` (already used for `'Trip'`), the `'Issues'` route (Task 10).

- [ ] **Step 1: Write the failing Home test**

Add this test to the existing `src/screens/__tests__/HomeScreen.test.tsx` (append to the file, do not remove any existing test):

```typescript
it('shows a Report Issue quick action for every role and navigates to Issues on press', async () => {
  const navigate = jest.fn();
  const { findByTestId } = render(<AppProviders><HomeScreen navigation={{ navigate } as any} /></AppProviders>);
  const btn = await findByTestId('home-report-issue');
  fireEvent.press(btn);
  expect(navigate).toHaveBeenCalledWith('Issues');
});
```

(This reuses the file's existing mocks for `useAttendanceStatus`/`useDashboard`/`useAuth`, which mock a `driver` role — the button must render for that role too, proving it's not role-gated like the `home-open-trip` button.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/screens/__tests__/HomeScreen.test.tsx`
Expected: FAIL — `home-report-issue` testID not found.

- [ ] **Step 3: Add the quick-action button to `HomeScreen.tsx`**

In `src/screens/HomeScreen.tsx`, add a new `Animated.View` block, unconditional (all roles), placed after the existing role-gated Trip button block (after the `{(role.key === 'driver' || role.key === 'conductor') && (...)}` block) and before the `TasksPeek` block:

```tsx
        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
          <Btn
            testID="home-report-issue"
            label={t('issues.reportIssue')}
            icon="alert"
            variant="ghost"
            onPress={() => navigation.navigate('Issues')}
          />
        </Animated.View>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest src/screens/__tests__/HomeScreen.test.tsx`
Expected: PASS, including all pre-existing `HomeScreen.test.tsx` tests still passing.

- [ ] **Step 5: Commit**

```bash
cd D:\SMS\sms-project\sms-staff
git add src/screens/HomeScreen.tsx src/screens/__tests__/HomeScreen.test.tsx
git commit -m "feat(issues): add Report Issue quick action to Home for all roles

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: Full regression pass and final report

**Files:** none (verification only).

- [ ] **Step 1: Backend — full test suite**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet test`
Expected: all tests pass (existing + the new Issue tests from Tasks 2 and 5). Record the exact pass/fail count for the final report.

- [ ] **Step 2: Backend — build**

Run: `cd D:\SMS\sms-project\sms-backend && dotnet build`
Expected: build succeeds, 0 errors.

- [ ] **Step 3: Mobile — full test suite**

Run: `cd D:\SMS\sms-project\sms-staff && npx jest`
Expected: all tests pass (existing + new Issue tests from Tasks 6, 7, 8, 10, 11). Record the exact pass/fail count.

- [ ] **Step 4: Mobile — typecheck and lint**

Run: `cd D:\SMS\sms-project\sms-staff && npm run typecheck && npm run lint`
Expected: both succeed with no errors.

- [ ] **Step 5: Manually verify no regression in adjacent screens**

Using the `run` skill (or `npx expo start --web`, per this session's established pattern), confirm: login still works, Home still renders (dashboard stats, role card, Trip button for driver/conductor, and the new Report Issue button), Attendance check-in/check-out still works, Tasks screen and photo-attach still work, Leave screen still works, Profile screen still works, and the new Issues screen opens from Home, accepts a submission, and lists it back.

- [ ] **Step 6: Write the final report**

Produce the report the user asked for, covering: exact commits (list `git log --oneline` for the range covering this work, in both repos), exact files changed (from each task's Files section above), migration numbers (M0200/M0201, or their actual final numbers if renumbered in Task 1 Step 1), API endpoints (`POST/GET /v1/staff/issues`, `GET /v1/staff/issues/{id}`, `PATCH /v1/issues/{id}`), the shared service (`IIssueService`/`IssueService`, explicitly reusable by a future CRM controller with no duplicate table/service), tables (`dbo.Issues`, `dbo.IssueNotes`), RLS/tenant behavior (native SQL Server RLS policies, identical pattern to `Complaints`/`Notifications`), RBAC behavior (self-scoped create/list via `[Authorize]` + `ITenantContext`, manager-only `PATCH` via `RoleChecks.IsStaff`), notification behavior (reuses `INotificationService`, targets `SchoolAdmin`/`SchoolOwner` users in-tenant), attachment behavior (reuses `ImageUrlValidation`, ~300KB limit, base64 inline), exact test counts from Steps 1 and 3, typecheck/build results from Steps 2 and 4, regression status from Step 5, and explicitly confirm the required closing statement: **"CRM UI was not implemented, but the Issue backend is reusable by sms-admin and does not require a duplicate CRM Issue table/service."**

- [ ] **Step 7: No commit for this task** — it is verification/reporting only; nothing to add to git beyond what Tasks 1-11 already committed.
