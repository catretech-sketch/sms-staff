# Staff App — Plan 7: Finish Screens (Roster · Leave · Tasks · Profile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Depends on Plan 5 (role refactor) merged**; independent of Plan 6 (can run before or after it).

**Goal:** Make the staff app genuinely complete for all 6 roles by turning the Tasks, Roster, and Profile stubs into real, data-backed screens and adding a Leave overlay — each on the existing swappable mock→http data layer.

**Architecture:** Four additive data slices (`TasksRepository`, `RosterRepository`, `LeaveRepository`, `ProfileRepository`), each with mock + http adapters wired through the existing factory/RepositoryContext exactly like dashboard/attendance. Four feature hook modules. Tasks/Roster/Profile replace their `StubScreen`; Leave is a new stack overlay reached from Profile. All screens reuse the existing UI primitives (`Card`, `Btn`, `Pill`, `IconBtn`, `Avatar`, `SectionLabel`, `Skeleton`, `ErrorState`) and the role accent from `useTheme()`.

**Tech Stack:** Expo SDK 54, React 19, RN 0.81, TypeScript, `@tanstack/react-query`, `react-native-gesture-handler` (already installed) for swipe-to-complete, `react-i18next`, `zod` (already installed) for the leave form, Jest + RNTL.

**Scope guards:**
- Additive only — no existing repo/contract/screen logic changed except (a) replacing the three stub screen bodies, (b) wiring the Home "View all" to the Tasks tab, (c) registering the Leave overlay route.
- The 4 non-bus roles get these standard screens; no bespoke per-role overlays (out of scope).
- All four new repos get a `keys`-shape contract assertion in the existing contract test.

**New domain shapes (single source of truth):**

```ts
// task.ts
Task = { id; title; detail?; priority: 'urgent' | 'normal'; done: boolean; dueLabel?: string };
// roster.ts
RosterDay  = { date; weekdayLabel; shift; dutyPost; off: boolean };
RosterWeek = { days: RosterDay[]; routeName?: string };
// leave.ts
LeaveType    = 'casual' | 'sick' | 'earned';
LeaveStatus  = 'pending' | 'approved' | 'rejected';
LeaveBalance = { type: LeaveType; total: number; used: number };
LeaveRequest = { id; type: LeaveType; fromDate; toDate; reason; status: LeaveStatus };
LeaveSummary = { balances: LeaveBalance[]; requests: LeaveRequest[] };
// profile.ts
StaffDocument = { id; label; value; ok?: boolean };
Profile       = { documents: StaffDocument[] };   // identity comes from session.user
```

---

## PART A — TASKS

### Task A1: Tasks data slice

**Files:**
- Create: `src/data/domain/task.ts`; modify `src/data/domain/index.ts`
- Modify: `src/data/repositories/types.ts`
- Modify: `src/data/mock/seed.ts`, `src/data/mock/store.ts`
- Create: `src/data/mock/tasks.repo.ts`, `src/data/http/tasks.repo.ts`
- Modify: `src/data/http/mappers.ts`, `src/data/repositories/factory.ts`
- Test: `src/data/mock/__tests__/tasks.repo.test.ts`

- [ ] **Step 1: Domain type**

Create `src/data/domain/task.ts`:

```ts
export interface Task {
  id: string;
  title: string;
  detail?: string;
  priority: 'urgent' | 'normal';
  done: boolean;
  dueLabel?: string;
}
```

Add `export * from './task';` to `src/data/domain/index.ts`.

- [ ] **Step 2: Port**

In `src/data/repositories/types.ts`, add `Task` to the domain import, then add:

```ts
export interface TasksRepository {
  list(): Promise<Task[]>;
  complete(id: string): Promise<Task[]>;
}
```

Add `tasks: TasksRepository;` to `Repositories`.

- [ ] **Step 3: Seed + store**

In `src/data/mock/seed.ts`, add `Task` to the domain import and add a seed array before `SeedShape`:

```ts
const tasks: Task[] = [
  { id: 'task_1', title: 'Pre-trip bus inspection', priority: 'urgent', done: false, dueLabel: 'Today 7:00 AM' },
  { id: 'task_2', title: 'Submit trip log sheet', priority: 'normal', done: false, dueLabel: 'Today 4:00 PM' },
  { id: 'task_3', title: 'Refuel at depot', priority: 'normal', done: true, dueLabel: 'Yesterday' },
];
```

Add `tasks: Task[];` to `SeedShape` and `tasks,` to the exported `seed`.

In `src/data/mock/store.ts`, add `Task` to the import, add `tasks: Task[];` to the `Store` interface, and `tasks: clone(seed.tasks),` to the returned store object.

- [ ] **Step 4: Mock repo (failing test first)**

Create `src/data/mock/__tests__/tasks.repo.test.ts`:

```ts
import { createStore } from '@/data/mock/store';
import { mockTasks } from '@/data/mock/tasks.repo';

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

describe('mock tasks repo', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('lists seeded tasks', async () => {
    const repo = mockTasks(await createStore());
    const list = await repo.list();
    expect(list.length).toBe(3);
  });

  it('complete marks a task done and returns the updated list', async () => {
    const repo = mockTasks(await createStore());
    const list = await repo.complete('task_1');
    expect(list.find((t) => t.id === 'task_1')?.done).toBe(true);
  });
});
```

Run: `npm test -- src/data/mock/__tests__/tasks.repo.test.ts` → FAIL (module missing).

Create `src/data/mock/tasks.repo.ts`:

```ts
import type { TasksRepository } from '@/data/repositories/types';
import type { Task } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function mockTasks(store: Store): TasksRepository {
  return {
    async list(): Promise<Task[]> {
      await simulateLatency();
      return clone(store.tasks);
    },
    async complete(id: string): Promise<Task[]> {
      await simulateLatency();
      const task = store.tasks.find((t) => t.id === id);
      if (task) task.done = true;
      return clone(store.tasks);
    },
  };
}
```

Run again → PASS.

- [ ] **Step 5: HTTP repo + mappers**

Append to `src/data/http/mappers.ts`:

```ts
import type { Task } from '@/data/domain';
export interface TaskDTO { id: string; title: string; detail?: string; priority: 'urgent' | 'normal'; done: boolean; due_label?: string; }
export const toTask = (d: TaskDTO): Task => ({ id: d.id, title: d.title, detail: d.detail, priority: d.priority, done: d.done, dueLabel: d.due_label });
```

Create `src/data/http/tasks.repo.ts`:

```ts
import type { TasksRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toTask, type TaskDTO } from './mappers';

export function httpTasks(http: HttpClient): TasksRepository {
  return {
    list: () => http.get<TaskDTO[]>('/staff/tasks').then((a) => a.map(toTask)),
    complete: (id) => http.post<TaskDTO[]>(`/staff/tasks/${id}/complete`, {}).then((a) => a.map(toTask)),
  };
}
```

- [ ] **Step 6: Wire factory**

In `src/data/repositories/factory.ts`: import `mockTasks` + `httpTasks`; add `tasks: mockTasks(store),` and `tasks: httpTasks(http),` to the respective creators.

- [ ] **Step 7: Verify + commit**

Run: `npm test -- src/data/mock/__tests__/tasks.repo.test.ts` and `npm run typecheck` → PASS.

```bash
git add src/data/domain/task.ts src/data/domain/index.ts src/data/repositories/types.ts src/data/repositories/factory.ts src/data/mock/seed.ts src/data/mock/store.ts src/data/mock/tasks.repo.ts src/data/http/tasks.repo.ts src/data/http/mappers.ts src/data/mock/__tests__/tasks.repo.test.ts
git commit -m "feat(tasks): TasksRepository (mock+http) + seed"
```

---

### Task A2: Tasks hook + screen (swipe-to-complete)

**Files:**
- Modify: `src/lib/queryClient.ts`
- Create: `src/features/tasks/hooks.ts`
- Create: `src/screens/TasksScreen.tsx` (replaces the stub)
- Modify: `src/screens/HomeScreen.tsx` (wire "View all")
- Modify: `src/i18n/resources/*.json`
- Test: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Query key + hook**

Add to `queryKeys` in `src/lib/queryClient.ts`:

```ts
  tasks: (tenantId: string) => ['tasks', tenantId] as const,
```

Create `src/features/tasks/hooks.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { Task } from '@/data/domain';

export function useTasks() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.tasks(tenantId), queryFn: () => repos.tasks.list() });
}

export function useCompleteTask() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  const key = queryKeys.tasks(tenantId);
  return useMutation({
    mutationFn: (id: string) => repos.tasks.complete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Task[]>(key) ?? [];
      qc.setQueryData<Task[]>(key, prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
      return { prev };
    },
    onError: (_e, _id, ctx) => { if (ctx) qc.setQueryData(key, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
```

- [ ] **Step 2: Screen test (failing)**

Create `src/screens/__tests__/TasksScreen.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import { TasksScreen } from '@/screens/TasksScreen';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});

async function renderScreen() {
  const repos = createMockRepositories(await createStore());
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <RepositoryProvider repositories={repos}><TasksScreen /></RepositoryProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

it('lists tasks and completes one on tap', async () => {
  const { findByText, getByTestId } = await renderScreen();
  await findByText('Pre-trip bus inspection');
  fireEvent.press(getByTestId('task-complete-task_1'));
  await waitFor(() => expect(getByTestId('task-done-task_1')).toBeTruthy());
});
```

Run → FAIL (screen missing).

- [ ] **Step 3: Create `src/screens/TasksScreen.tsx`**

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useTasks, useCompleteTask } from '@/features/tasks/hooks';
import { Card, IconBtn, Pill, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';

export const TasksScreen = () => {
  const { t } = useTranslation();
  const { colors, role } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useTasks();
  const complete = useCompleteTask();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
        <View style={styles.body}><Skeleton width="100%" height={72} radius={16} /><Skeleton width="100%" height={72} radius={16} /></View>
      </SafeAreaView>
    );
  }
  if (isError) {
    return <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}><ErrorState onRetry={refetch} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <Text style={[TextScale.screenTitle, styles.title, { color: colors.ink }]}>{t('nav.tasks')}</Text>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}>
        {data?.map((task) => (
          <Card key={task.id}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[TextScale.body, { color: task.done ? colors.inkFaint : colors.ink, textDecorationLine: task.done ? 'line-through' : 'none' }]}>
                  {task.title}
                </Text>
                {task.dueLabel ? <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{task.dueLabel}</Text> : null}
              </View>
              {task.priority === 'urgent' && !task.done ? (
                <Pill label={t('tasks.urgent')} color={colors.danger} bg={colors.dangerSoft} icon="alert" />
              ) : null}
              {task.done ? (
                <View testID={`task-done-${task.id}`}>
                  <Pill label={t('tasks.done')} color={colors.success} bg={colors.successSoft} icon="check" />
                </View>
              ) : (
                <IconBtn testID={`task-complete-${task.id}`} icon="check" label={t('tasks.complete')} color="#FFFFFF" bg={role.accent} onPress={() => complete.mutate(task.id)} />
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 12 },
  body: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 2 },
});
```

> **Swipe affordance (optional enhancement, same task):** wrap each `Card` in a `Swipeable` from `react-native-gesture-handler` whose right action calls `complete.mutate(task.id)`. The tap `IconBtn` above remains the tested, accessible path; the swipe is purely additive and not asserted in jest (gesture simulation is unreliable in the test runner).

- [ ] **Step 4: Wire Home "View all" to the Tasks tab**

In `src/screens/HomeScreen.tsx`, change the `TasksPeek` `onViewAll`:

```tsx
            onViewAll={() => navigation.navigate('Tasks')}
```

(`Tasks` is an existing tab in `MainTabParamList`; navigating from the Home tab to a sibling tab works in React Navigation v7.)

- [ ] **Step 5: i18n (all 4 languages)**

Add to each resources file (identical keys; translations shown):
- `en.json`: `"tasks.urgent": "Urgent", "tasks.done": "Done", "tasks.complete": "Mark done",`
- `hi.json`: `"tasks.urgent": "अत्यावश्यक", "tasks.done": "पूर्ण", "tasks.complete": "पूर्ण करें",`
- `mr.json`: `"tasks.urgent": "तातडीचे", "tasks.done": "पूर्ण", "tasks.complete": "पूर्ण करा",`
- `ta.json`: `"tasks.urgent": "அவசரம்", "tasks.done": "முடிந்தது", "tasks.complete": "முடித்ததாகக் குறி",`

- [ ] **Step 6: Verify + commit**

Run: `npm test -- src/screens/__tests__/TasksScreen.test.tsx src/i18n` → PASS.

```bash
git add src/lib/queryClient.ts src/features/tasks/hooks.ts src/screens/TasksScreen.tsx src/screens/HomeScreen.tsx src/i18n
git commit -m "feat(tasks): Tasks screen + optimistic complete + Home View-all wiring"
```

---

## PART B — ROSTER

### Task B1: Roster data slice

**Files:** domain `roster.ts`; `types.ts`; `seed.ts`; `store.ts`; `src/data/mock/roster.repo.ts`; `src/data/http/roster.repo.ts`; `mappers.ts`; `factory.ts`; test `src/data/mock/__tests__/roster.repo.test.ts`.

- [ ] **Step 1: Domain**

Create `src/data/domain/roster.ts`:

```ts
export interface RosterDay {
  date: string;        // ISO date
  weekdayLabel: string; // 'Mon'
  shift: string;
  dutyPost: string;
  off: boolean;
}
export interface RosterWeek {
  days: RosterDay[];
  routeName?: string;
}
```

Add `export * from './roster';` to the domain barrel.

- [ ] **Step 2: Port** — in `types.ts` add `RosterWeek` to the import and:

```ts
export interface RosterRepository { week(): Promise<RosterWeek>; }
```

Add `roster: RosterRepository;` to `Repositories`.

- [ ] **Step 3: Seed + store** — in `seed.ts` add `RosterWeek` to the import and:

```ts
const rosterWeek: RosterWeek = {
  routeName: 'Route 7',
  days: [
    { date: '2026-06-08', weekdayLabel: 'Mon', shift: 'Morning', dutyPost: 'Bus / Route', off: false },
    { date: '2026-06-09', weekdayLabel: 'Tue', shift: 'Morning', dutyPost: 'Bus / Route', off: false },
    { date: '2026-06-10', weekdayLabel: 'Wed', shift: 'Morning', dutyPost: 'Bus / Route', off: false },
    { date: '2026-06-11', weekdayLabel: 'Thu', shift: 'Morning', dutyPost: 'Bus / Route', off: false },
    { date: '2026-06-12', weekdayLabel: 'Fri', shift: 'Morning', dutyPost: 'Bus / Route', off: false },
    { date: '2026-06-13', weekdayLabel: 'Sat', shift: 'Half day', dutyPost: 'Bus / Route', off: false },
    { date: '2026-06-14', weekdayLabel: 'Sun', shift: '—', dutyPost: '—', off: true },
  ],
};
```

Add `rosterWeek: RosterWeek;` to `SeedShape` and `rosterWeek,` to `seed`. In `store.ts` add `RosterWeek` to the import, `rosterWeek: RosterWeek;` to `Store`, and `rosterWeek: clone(seed.rosterWeek),` to the store object.

- [ ] **Step 4: Mock repo (failing test first)**

Create `src/data/mock/__tests__/roster.repo.test.ts` (use the same AsyncStorage mock block as Task A1):

```ts
import { createStore } from '@/data/mock/store';
import { mockRoster } from '@/data/mock/roster.repo';
// ... (AsyncStorage mock block identical to tasks.repo.test.ts) ...
it('returns a 7-day week', async () => {
  const repo = mockRoster(await createStore());
  const week = await repo.week();
  expect(week.days.length).toBe(7);
  expect(week.days[6].off).toBe(true);
});
```

Run → FAIL. Create `src/data/mock/roster.repo.ts`:

```ts
import type { RosterRepository } from '@/data/repositories/types';
import type { RosterWeek } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockRoster(store: Store): RosterRepository {
  return {
    async week(): Promise<RosterWeek> {
      await simulateLatency();
      return JSON.parse(JSON.stringify(store.rosterWeek)) as RosterWeek;
    },
  };
}
```

Run → PASS.

- [ ] **Step 5: HTTP repo + mappers** — append to `mappers.ts`:

```ts
import type { RosterWeek, RosterDay } from '@/data/domain';
export interface RosterDayDTO { date: string; weekday_label: string; shift: string; duty_post: string; off: boolean; }
export interface RosterWeekDTO { days: RosterDayDTO[]; route_name?: string; }
export const toRosterDay = (d: RosterDayDTO): RosterDay => ({ date: d.date, weekdayLabel: d.weekday_label, shift: d.shift, dutyPost: d.duty_post, off: d.off });
export const toRosterWeek = (d: RosterWeekDTO): RosterWeek => ({ days: d.days.map(toRosterDay), routeName: d.route_name });
```

Create `src/data/http/roster.repo.ts`:

```ts
import type { RosterRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toRosterWeek, type RosterWeekDTO } from './mappers';

export function httpRoster(http: HttpClient): RosterRepository {
  return { week: () => http.get<RosterWeekDTO>('/staff/roster').then(toRosterWeek) };
}
```

- [ ] **Step 6: Factory** — import + add `roster: mockRoster(store),` / `roster: httpRoster(http),`.

- [ ] **Step 7: Verify + commit**

Run: `npm test -- src/data/mock/__tests__/roster.repo.test.ts` + `npm run typecheck` → PASS.

```bash
git add src/data/domain/roster.ts src/data/domain/index.ts src/data/repositories/types.ts src/data/repositories/factory.ts src/data/mock/seed.ts src/data/mock/store.ts src/data/mock/roster.repo.ts src/data/http/roster.repo.ts src/data/http/mappers.ts src/data/mock/__tests__/roster.repo.test.ts
git commit -m "feat(roster): RosterRepository (mock+http) + seed"
```

---

### Task B2: Roster hook + screen

**Files:** `queryClient.ts`; `src/features/roster/hooks.ts`; `src/screens/RosterScreen.tsx`; `i18n/*`; test `src/screens/__tests__/RosterScreen.test.tsx`.

- [ ] **Step 1: Query key + hook** — add `roster: (tenantId: string) => ['roster', tenantId] as const,` to `queryKeys`. Create `src/features/roster/hooks.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useRosterWeek() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.roster(tenantId), queryFn: () => repos.roster.week() });
}
```

- [ ] **Step 2: Screen test (failing)** — Create `src/screens/__tests__/RosterScreen.test.tsx` (same harness shape as TasksScreen test, rendering `<RosterScreen />`):

```tsx
it('shows the week strip and a selected day detail', async () => {
  const { findByText, getByTestId } = await renderScreen(); // harness as in TasksScreen.test.tsx
  await findByText('Route 7');
  fireEvent.press(getByTestId('roster-day-2026-06-14'));
  await findByText(/Off/);
});
```

Run → FAIL.

- [ ] **Step 3: Create `src/screens/RosterScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { useRosterWeek } from '@/features/roster/hooks';
import { Card, Pill, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';

export const RosterScreen = () => {
  const { t } = useTranslation();
  const { colors, role } = useTheme();
  const { data, isLoading, isError, refetch } = useRosterWeek();
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}><View style={styles.body}><Skeleton width="100%" height={90} radius={16} /></View></SafeAreaView>;
  if (isError) return <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}><ErrorState onRetry={refetch} /></SafeAreaView>;

  const day = data?.days.find((d) => d.date === selected) ?? data?.days[0];

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <Text style={[TextScale.screenTitle, styles.title, { color: colors.ink }]}>{t('nav.roster')}</Text>
      <ScrollView contentContainerStyle={styles.body}>
        {data?.routeName ? <Pill label={`${t('roster.route')} · ${data.routeName}`} color={role.accent} bg={colors.surface2} icon="route" /> : null}
        <View style={styles.strip}>
          {data?.days.map((d) => {
            const active = (selected ?? data.days[0].date) === d.date;
            return (
              <Pressable key={d.date} testID={`roster-day-${d.date}`} onPress={() => setSelected(d.date)} style={[styles.dayPill, { backgroundColor: active ? role.accent : colors.surface, borderColor: role.accent }]}>
                <Text style={[TextScale.micro, { color: active ? '#FFFFFF' : colors.inkSoft }]}>{d.weekdayLabel}</Text>
              </Pressable>
            );
          })}
        </View>
        {day ? (
          <Card>
            <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{day.weekdayLabel} · {day.date}</Text>
            <Text style={[TextScale.body, { color: colors.inkSoft, marginTop: 6 }]}>
              {day.off ? t('roster.off') : `${day.shift} · ${day.dutyPost}`}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { paddingHorizontal: 16, paddingTop: 12 },
  body: { padding: 16, gap: 12 },
  strip: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayPill: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 4: i18n** — add to all 4 files:
- `en`: `"roster.route": "Route", "roster.off": "Off",`
- `hi`: `"roster.route": "रूट", "roster.off": "अवकाश",`
- `mr`: `"roster.route": "मार्ग", "roster.off": "सुट्टी",`
- `ta`: `"roster.route": "வழி", "roster.off": "விடுமுறை",`

- [ ] **Step 5: Verify + commit**

Run: `npm test -- src/screens/__tests__/RosterScreen.test.tsx src/i18n` → PASS.

```bash
git add src/lib/queryClient.ts src/features/roster/hooks.ts src/screens/RosterScreen.tsx src/i18n
git commit -m "feat(roster): Roster week strip screen"
```

---

## PART C — LEAVE

### Task C1: Leave data slice

**Files:** domain `leave.ts`; `types.ts`; `seed.ts`; `store.ts`; `src/data/mock/leave.repo.ts`; `src/data/http/leave.repo.ts`; `mappers.ts`; `factory.ts`; test `src/data/mock/__tests__/leave.repo.test.ts`.

- [ ] **Step 1: Domain**

Create `src/data/domain/leave.ts`:

```ts
export type LeaveType = 'casual' | 'sick' | 'earned';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export interface LeaveBalance { type: LeaveType; total: number; used: number; }
export interface LeaveRequest { id: string; type: LeaveType; fromDate: string; toDate: string; reason: string; status: LeaveStatus; }
export interface LeaveSummary { balances: LeaveBalance[]; requests: LeaveRequest[]; }
export interface NewLeaveRequest { type: LeaveType; fromDate: string; toDate: string; reason: string; }
```

Add `export * from './leave';` to the barrel.

- [ ] **Step 2: Port** — add `LeaveSummary, LeaveRequest, NewLeaveRequest` to the import in `types.ts`:

```ts
export interface LeaveRepository {
  summary(): Promise<LeaveSummary>;
  submit(req: NewLeaveRequest): Promise<LeaveRequest>;
}
```

Add `leave: LeaveRepository;` to `Repositories`.

- [ ] **Step 3: Seed + store** — in `seed.ts` add the import and:

```ts
const leaveSummary: LeaveSummary = {
  balances: [
    { type: 'casual', total: 12, used: 4 },
    { type: 'sick', total: 8, used: 1 },
    { type: 'earned', total: 15, used: 6 },
  ],
  requests: [
    { id: 'lv_1', type: 'casual', fromDate: '2026-05-20', toDate: '2026-05-21', reason: 'Family function', status: 'approved' },
  ],
};
```

Add `leaveSummary: LeaveSummary;` to `SeedShape` and `leaveSummary,` to `seed`. In `store.ts` add the import, `leave: LeaveSummary;` to `Store`, `leave: clone(seed.leaveSummary),` to the store object, and a `persistLeave()` method:

```ts
    async persistLeave() {
      await asyncStore.set(`${KEY}leave`, store.leave);
    },
```

Add `persistLeave(): Promise<void>;` to the `Store` interface, and hydrate in `createStore`: `const leave = (await asyncStore.get<LeaveSummary>(`${KEY}leave`)) ?? clone(seed.leaveSummary);` then use `leave,` in the object.

- [ ] **Step 4: Mock repo (failing test first)**

Create `src/data/mock/__tests__/leave.repo.test.ts` (AsyncStorage mock block as before):

```ts
import { createStore } from '@/data/mock/store';
import { mockLeave } from '@/data/mock/leave.repo';
// ... AsyncStorage mock block ...
it('returns balances and appends a submitted request as pending', async () => {
  const repo = mockLeave(await createStore());
  const before = await repo.summary();
  expect(before.balances.length).toBe(3);
  const req = await repo.submit({ type: 'sick', fromDate: '2026-06-20', toDate: '2026-06-20', reason: 'Fever' });
  expect(req.status).toBe('pending');
  const after = await repo.summary();
  expect(after.requests.length).toBe(before.requests.length + 1);
});
```

Run → FAIL. Create `src/data/mock/leave.repo.ts`:

```ts
import type { LeaveRepository } from '@/data/repositories/types';
import type { LeaveSummary, LeaveRequest, NewLeaveRequest } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function mockLeave(store: Store): LeaveRepository {
  return {
    async summary(): Promise<LeaveSummary> {
      await simulateLatency();
      return clone(store.leave);
    },
    async submit(req: NewLeaveRequest): Promise<LeaveRequest> {
      await simulateLatency();
      const created: LeaveRequest = { id: store.genId('lv'), status: 'pending', ...req };
      store.leave.requests = [created, ...store.leave.requests];
      await store.persistLeave();
      return clone(created);
    },
  };
}
```

Run → PASS.

- [ ] **Step 5: HTTP repo + mappers** — append to `mappers.ts`:

```ts
import type { LeaveSummary, LeaveBalance, LeaveRequest, NewLeaveRequest } from '@/data/domain';
export interface LeaveBalanceDTO { type: LeaveRequest['type']; total: number; used: number; }
export interface LeaveRequestDTO { id: string; type: LeaveRequest['type']; from_date: string; to_date: string; reason: string; status: LeaveRequest['status']; }
export interface LeaveSummaryDTO { balances: LeaveBalanceDTO[]; requests: LeaveRequestDTO[]; }
export const toLeaveBalance = (d: LeaveBalanceDTO): LeaveBalance => ({ type: d.type, total: d.total, used: d.used });
export const toLeaveRequest = (d: LeaveRequestDTO): LeaveRequest => ({ id: d.id, type: d.type, fromDate: d.from_date, toDate: d.to_date, reason: d.reason, status: d.status });
export const toLeaveSummary = (d: LeaveSummaryDTO): LeaveSummary => ({ balances: d.balances.map(toLeaveBalance), requests: d.requests.map(toLeaveRequest) });
export const fromNewLeave = (r: NewLeaveRequest) => ({ type: r.type, from_date: r.fromDate, to_date: r.toDate, reason: r.reason });
```

Create `src/data/http/leave.repo.ts`:

```ts
import type { LeaveRepository } from '@/data/repositories/types';
import type { NewLeaveRequest } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import { toLeaveSummary, toLeaveRequest, fromNewLeave, type LeaveSummaryDTO, type LeaveRequestDTO } from './mappers';

export function httpLeave(http: HttpClient): LeaveRepository {
  return {
    summary: () => http.get<LeaveSummaryDTO>('/staff/leave').then(toLeaveSummary),
    submit: (req: NewLeaveRequest) => http.post<LeaveRequestDTO>('/staff/leave', fromNewLeave(req)).then(toLeaveRequest),
  };
}
```

- [ ] **Step 6: Factory** — import + `leave: mockLeave(store),` / `leave: httpLeave(http),`.

- [ ] **Step 7: Verify + commit**

Run: `npm test -- src/data/mock/__tests__/leave.repo.test.ts` + `npm run typecheck` → PASS.

```bash
git add src/data/domain/leave.ts src/data/domain/index.ts src/data/repositories/types.ts src/data/repositories/factory.ts src/data/mock/seed.ts src/data/mock/store.ts src/data/mock/leave.repo.ts src/data/http/leave.repo.ts src/data/http/mappers.ts src/data/mock/__tests__/leave.repo.test.ts
git commit -m "feat(leave): LeaveRepository (mock+http) + seed"
```

---

### Task C2: Leave hook + screen (overlay) + zod form

**Files:** `queryClient.ts`; `src/features/leave/hooks.ts`; `src/screens/LeaveScreen.tsx`; `src/navigation/types.ts`; `src/navigation/MainTabNavigator.tsx`; `i18n/*`; test `src/screens/__tests__/LeaveScreen.test.tsx`.

- [ ] **Step 1: Query key + hooks** — add `leave: (tenantId: string) => ['leave', tenantId] as const,` to `queryKeys`. Create `src/features/leave/hooks.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { NewLeaveRequest } from '@/data/domain';

export function useLeaveSummary() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.leave(tenantId), queryFn: () => repos.leave.summary() });
}

export function useSubmitLeave() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: (req: NewLeaveRequest) => repos.leave.submit(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leave(tenantId) }),
  });
}
```

- [ ] **Step 2: Screen test (failing)** — Create `src/screens/__tests__/LeaveScreen.test.tsx` (harness as before, render `<LeaveScreen navigation={nav} />`):

```tsx
it('shows balances and submits a request', async () => {
  const { findByText, getByTestId } = await renderScreen();
  await findByText(/casual|Casual/);
  fireEvent.changeText(getByTestId('leave-reason'), 'Doctor appointment');
  fireEvent.press(getByTestId('leave-submit'));
  await waitFor(() => expect(getByTestId('leave-submitted')).toBeTruthy());
});
```

Run → FAIL.

- [ ] **Step 3: Create `src/screens/LeaveScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useTheme } from '@/theme';
import { useLeaveSummary, useSubmitLeave } from '@/features/leave/hooks';
import { Card, Btn, IconBtn, Pill, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';
import type { LeaveType } from '@/data/domain';

const TYPES: LeaveType[] = ['casual', 'sick', 'earned'];
const schema = z.object({
  type: z.enum(['casual', 'sick', 'earned']),
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  reason: z.string().min(3),
});

export const LeaveScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const { colors, role } = useTheme();
  const { data, isLoading, isError, refetch } = useLeaveSummary();
  const submit = useSubmitLeave();
  const [type, setType] = useState<LeaveType>('casual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    const parsed = schema.safeParse({ type, fromDate, toDate, reason });
    if (!parsed.success) { setError(t('leave.invalid')); return; }
    setError(null);
    await submit.mutateAsync(parsed.data);
    setSubmitted(true);
    setReason('');
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <IconBtn icon="back" label={t('common.back')} onPress={() => navigation.goBack()} />
        <Text style={[TextScale.screenTitle, { color: colors.ink }]}>{t('leave.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {isLoading ? <Skeleton width="100%" height={90} radius={16} />
          : isError ? <ErrorState onRetry={refetch} />
          : (
            <>
              <View style={styles.balances}>
                {data?.balances.map((b) => (
                  <Card key={b.type} style={styles.balCard}>
                    <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t(`leave.type.${b.type}`)}</Text>
                    <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{b.total - b.used} / {b.total}</Text>
                  </Card>
                ))}
              </View>

              <Card>
                <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{t('leave.apply')}</Text>
                <View style={styles.typeRow}>
                  {TYPES.map((ty) => (
                    <Pressable key={ty} testID={`leave-type-${ty}`} onPress={() => setType(ty)} style={[styles.typeBtn, { backgroundColor: type === ty ? role.accent : colors.surface, borderColor: role.accent }]}>
                      <Text style={[TextScale.caption, { color: type === ty ? '#FFFFFF' : role.accent }]}>{t(`leave.type.${ty}`)}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput testID="leave-from" placeholder={t('leave.from')} placeholderTextColor={colors.inkFaint} value={fromDate} onChangeText={setFromDate} style={[styles.input, { borderColor: colors.sunken, color: colors.ink }]} />
                <TextInput testID="leave-to" placeholder={t('leave.to')} placeholderTextColor={colors.inkFaint} value={toDate} onChangeText={setToDate} style={[styles.input, { borderColor: colors.sunken, color: colors.ink }]} />
                <TextInput testID="leave-reason" placeholder={t('leave.reason')} placeholderTextColor={colors.inkFaint} value={reason} onChangeText={setReason} style={[styles.input, { borderColor: colors.sunken, color: colors.ink }]} />
                {error ? <Text style={[TextScale.caption, { color: colors.danger }]}>{error}</Text> : null}
                <Btn testID="leave-submit" label={t('leave.submit')} onPress={onSubmit} accent={role.accent} loading={submit.isPending} style={styles.cta} />
                {submitted ? <View testID="leave-submitted"><Pill label={t('leave.submitted')} color={colors.success} bg={colors.successSoft} icon="check" /></View> : null}
              </Card>

              <Text style={[TextScale.cardTitle, { color: colors.ink, marginTop: 4 }]}>{t('leave.history')}</Text>
              {data?.requests.map((r) => (
                <Card key={r.id}>
                  <Text style={[TextScale.body, { color: colors.ink }]}>{t(`leave.type.${r.type}`)} · {r.fromDate} → {r.toDate}</Text>
                  <Pill label={t(`leave.status.${r.status}`)} color={r.status === 'approved' ? colors.success : r.status === 'rejected' ? colors.danger : colors.warn} bg={colors.surface2} />
                </Card>
              ))}
            </>
          )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  body: { padding: 16, gap: 12 },
  balances: { flexDirection: 'row', gap: 10 },
  balCard: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  typeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  cta: { marginTop: 4 },
});
```

- [ ] **Step 4: Register the Leave overlay route** — in `src/navigation/types.ts` add `Leave: undefined;` to `MainStackParamList`. In `MainTabNavigator.tsx` import `LeaveScreen` and add a sibling `Stack.Screen name="Leave"` with the same overlay options as Attendance.

- [ ] **Step 5: i18n (all 4 languages)** — add the keys (en shown; provide hi/mr/ta equivalents, Marathi/Tamil flagged for proofread):

```json
  "leave.title": "Leave",
  "leave.apply": "Apply for leave",
  "leave.from": "From (YYYY-MM-DD)",
  "leave.to": "To (YYYY-MM-DD)",
  "leave.reason": "Reason",
  "leave.submit": "Submit request",
  "leave.submitted": "Request submitted",
  "leave.invalid": "Please fill all fields (reason ≥ 3 chars)",
  "leave.history": "Your requests",
  "leave.type.casual": "Casual",
  "leave.type.sick": "Sick",
  "leave.type.earned": "Earned",
  "leave.status.pending": "Pending",
  "leave.status.approved": "Approved",
  "leave.status.rejected": "Rejected",
```

Hindi values: `leave.title` "अवकाश", `leave.apply` "अवकाश के लिए आवेदन करें", `leave.from` "से (YYYY-MM-DD)", `leave.to` "तक (YYYY-MM-DD)", `leave.reason` "कारण", `leave.submit` "अनुरोध भेजें", `leave.submitted` "अनुरोध भेजा गया", `leave.invalid` "कृपया सभी फ़ील्ड भरें (कारण ≥ 3 अक्षर)", `leave.history` "आपके अनुरोध", `leave.type.casual` "आकस्मिक", `leave.type.sick` "बीमारी", `leave.type.earned` "अर्जित", `leave.status.pending` "लंबित", `leave.status.approved` "स्वीकृत", `leave.status.rejected` "अस्वीकृत".
Marathi values: "रजा", "रजेसाठी अर्ज करा", "पासून (YYYY-MM-DD)", "पर्यंत (YYYY-MM-DD)", "कारण", "विनंती पाठवा", "विनंती पाठवली", "कृपया सर्व रकाने भरा (कारण ≥ 3 अक्षरे)", "तुमच्या विनंत्या", "नैमित्तिक", "आजारपण", "अर्जित", "प्रलंबित", "मंजूर", "नाकारले".
Tamil values: "விடுப்பு", "விடுப்புக்கு விண்ணப்பி", "முதல் (YYYY-MM-DD)", "வரை (YYYY-MM-DD)", "காரணம்", "கோரிக்கையை சமர்ப்பி", "கோரிக்கை சமர்ப்பிக்கப்பட்டது", "அனைத்து புலங்களையும் நிரப்பவும் (காரணம் ≥ 3 எழுத்துகள்)", "உங்கள் கோரிக்கைகள்", "சாதாரண", "உடல்நலம்", "ஈட்டிய", "நிலுவையில்", "அங்கீகரிக்கப்பட்டது", "நிராகரிக்கப்பட்டது".

- [ ] **Step 6: Verify + commit**

Run: `npm test -- src/screens/__tests__/LeaveScreen.test.tsx src/i18n` → PASS.

```bash
git add src/lib/queryClient.ts src/features/leave/hooks.ts src/screens/LeaveScreen.tsx src/navigation/types.ts src/navigation/MainTabNavigator.tsx src/i18n
git commit -m "feat(leave): Leave overlay screen + zod request form"
```

---

## PART D — PROFILE / ME

### Task D1: Profile data slice

**Files:** domain `profile.ts`; `types.ts`; `seed.ts`; `store.ts`; `src/data/mock/profile.repo.ts`; `src/data/http/profile.repo.ts`; `mappers.ts`; `factory.ts`; test `src/data/mock/__tests__/profile.repo.test.ts`.

- [ ] **Step 1: Domain**

Create `src/data/domain/profile.ts`:

```ts
export interface StaffDocument { id: string; label: string; value: string; ok?: boolean; }
export interface Profile { documents: StaffDocument[]; }
```

Add `export * from './profile';` to the barrel.

- [ ] **Step 2: Port** — add `Profile` to the import in `types.ts`:

```ts
export interface ProfileRepository { get(): Promise<Profile>; }
```

Add `profile: ProfileRepository;` to `Repositories`.

- [ ] **Step 3: Seed + store** — in `seed.ts` add the import and:

```ts
const profile: Profile = {
  documents: [
    { id: 'doc_license', label: 'Driving licence', value: 'DL-0420190012345', ok: true },
    { id: 'doc_fitness', label: 'Bus fitness', value: 'Valid till 2027-03', ok: true },
    { id: 'doc_aadhaar', label: 'ID verified', value: 'Yes', ok: true },
  ],
};
```

Add `profile: Profile;` to `SeedShape`, `profile,` to `seed`. In `store.ts` add the import, `profile: Profile;` to `Store`, `profile: clone(seed.profile),` to the store object.

- [ ] **Step 4: Mock repo (failing test first)**

Create `src/data/mock/__tests__/profile.repo.test.ts` (AsyncStorage mock block):

```ts
import { createStore } from '@/data/mock/store';
import { mockProfile } from '@/data/mock/profile.repo';
// ... AsyncStorage mock block ...
it('returns the staff documents', async () => {
  const repo = mockProfile(await createStore());
  const p = await repo.get();
  expect(p.documents.length).toBe(3);
  expect(p.documents[0].label).toBe('Driving licence');
});
```

Run → FAIL. Create `src/data/mock/profile.repo.ts`:

```ts
import type { ProfileRepository } from '@/data/repositories/types';
import type { Profile } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockProfile(store: Store): ProfileRepository {
  return {
    async get(): Promise<Profile> {
      await simulateLatency();
      return JSON.parse(JSON.stringify(store.profile)) as Profile;
    },
  };
}
```

Run → PASS.

- [ ] **Step 5: HTTP repo + mappers** — append to `mappers.ts`:

```ts
import type { Profile, StaffDocument } from '@/data/domain';
export interface StaffDocumentDTO { id: string; label: string; value: string; ok?: boolean; }
export interface ProfileDTO { documents: StaffDocumentDTO[]; }
export const toStaffDocument = (d: StaffDocumentDTO): StaffDocument => ({ id: d.id, label: d.label, value: d.value, ok: d.ok });
export const toProfile = (d: ProfileDTO): Profile => ({ documents: d.documents.map(toStaffDocument) });
```

Create `src/data/http/profile.repo.ts`:

```ts
import type { ProfileRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toProfile, type ProfileDTO } from './mappers';

export function httpProfile(http: HttpClient): ProfileRepository {
  return { get: () => http.get<ProfileDTO>('/staff/profile').then(toProfile) };
}
```

- [ ] **Step 6: Factory** — import + `profile: mockProfile(store),` / `profile: httpProfile(http),`.

- [ ] **Step 7: Verify + commit**

Run: `npm test -- src/data/mock/__tests__/profile.repo.test.ts` + `npm run typecheck` → PASS.

```bash
git add src/data/domain/profile.ts src/data/domain/index.ts src/data/repositories/types.ts src/data/repositories/factory.ts src/data/mock/seed.ts src/data/mock/store.ts src/data/mock/profile.repo.ts src/data/http/profile.repo.ts src/data/http/mappers.ts src/data/mock/__tests__/profile.repo.test.ts
git commit -m "feat(profile): ProfileRepository (mock+http) + seed"
```

---

### Task D2: Profile hook + screen (identity, docs, settings, language, logout)

**Files:** `queryClient.ts`; `src/features/profile/hooks.ts`; `src/screens/ProfileScreen.tsx` (replaces stub); `i18n/*`; test `src/screens/__tests__/ProfileScreen.test.tsx`.

- [ ] **Step 1: Query key + hook** — add `profile: (tenantId: string) => ['profile', tenantId] as const,` to `queryKeys`. Create `src/features/profile/hooks.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useProfile() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.profile(tenantId), queryFn: () => repos.profile.get() });
}
```

- [ ] **Step 2: Screen test (failing)** — Create `src/screens/__tests__/ProfileScreen.test.tsx` (harness with `AuthProvider` so `session` + `useLogout` resolve; render `<ProfileScreen navigation={nav} />`). Because the screen reads `session.user`, wrap with the real `AuthProvider` and sign in first, mirroring `AuthProvider.test.tsx`'s setup, OR assert only on a document label which comes from the profile repo:

```tsx
it('shows a document and the language switcher', async () => {
  const { findByText, getByTestId } = await renderScreen(); // harness includes AuthProvider + ToastProvider
  await findByText('Driving licence');
  expect(getByTestId('lang-hi')).toBeTruthy();
});
```

> Use the same provider stack as `src/features/auth/__tests__/AuthProvider.test.tsx` (it shows how to mount `AuthProvider` with the mock repos and a signed-in session). The assertion targets the profile document label + a language button testID.

Run → FAIL.

- [ ] **Step 3: Create `src/screens/ProfileScreen.tsx`**

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLogout } from '@/features/auth/hooks';
import { useProfile } from '@/features/profile/hooks';
import { SUPPORTED_LANGUAGES, setLanguage } from '@/i18n';
import { Card, Avatar, Pill, Btn, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/state';
import { TextScale } from '@/theme/typography';

export const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const { t } = useTranslation();
  const { colors, dark, toggleDark, role } = useTheme();
  const { session } = useAuth();
  const logout = useLogout();
  const { data, isLoading, isError, refetch } = useProfile();

  if (!session) return null;
  const u = session.user;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.identity}>
          <Avatar name={u.name} size={64} ring={role.accent} />
          <View style={styles.identityText}>
            <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{u.name}</Text>
            <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{t(role.labelKey)} · {u.empId}</Text>
          </View>
        </View>

        <Text style={[TextScale.cardTitle, { color: colors.ink }]}>{t('profile.documents')}</Text>
        {isLoading ? <Skeleton width="100%" height={64} radius={16} />
          : isError ? <ErrorState onRetry={refetch} />
          : data?.documents.map((doc) => (
            <Card key={doc.id}>
              <View style={styles.docRow}>
                <View style={styles.docText}>
                  <Text style={[TextScale.body, { color: colors.ink }]}>{doc.label}</Text>
                  <Text style={[TextScale.caption, { color: colors.inkSoft }]}>{doc.value}</Text>
                </View>
                {doc.ok ? <Pill label={t('profile.verified')} color={colors.success} bg={colors.successSoft} icon="check" /> : null}
              </View>
            </Card>
          ))}

        <Text style={[TextScale.cardTitle, { color: colors.ink, marginTop: 8 }]}>{t('profile.settings')}</Text>
        <Card>
          <Pressable testID="toggle-theme" onPress={toggleDark} style={styles.settingRow}>
            <Text style={[TextScale.body, { color: colors.ink }]}>{t('profile.darkMode')}</Text>
            <Text style={[TextScale.caption, { color: role.accent }]}>{dark ? t('profile.on') : t('profile.off')}</Text>
          </Pressable>
        </Card>

        <Text style={[TextScale.cardTitle, { color: colors.ink, marginTop: 8 }]}>{t('common.language')}</Text>
        <Card>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = i18next.language === lang.code;
            return (
              <Pressable key={lang.code} testID={`lang-${lang.code}`} onPress={() => setLanguage(lang.code)} style={styles.settingRow}>
                <Text style={[TextScale.body, { color: colors.ink }]}>{lang.native}</Text>
                {active ? <Text style={[TextScale.caption, { color: role.accent }]}>✓</Text> : null}
              </Pressable>
            );
          })}
        </Card>

        <Btn label={t('profile.applyLeave')} variant="ghost" icon="doc" onPress={() => navigation.navigate('Leave')} style={styles.spacer} />
        <Btn testID="logout" label={t('profile.logout')} accent={colors.danger} onPress={() => logout.mutate()} loading={logout.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: 16, gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  identityText: { gap: 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docText: { flex: 1, gap: 2 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  spacer: { marginTop: 8 },
});
```

> **Verify these `@/i18n` exports** before relying on them: `SUPPORTED_LANGUAGES` (array of `{ code, native }`) and `setLanguage(code)` both exist in `src/i18n/index.ts` (confirmed in the codebase map). If `setLanguage`'s signature differs, adapt the call.

- [ ] **Step 4: i18n (all 4 languages)** — add keys (en shown; provide hi/mr/ta):

```json
  "profile.documents": "Documents",
  "profile.verified": "Verified",
  "profile.settings": "Settings",
  "profile.darkMode": "Dark mode",
  "profile.on": "On",
  "profile.off": "Off",
  "profile.applyLeave": "Apply for leave",
  "profile.logout": "Log out",
```

Hindi: "दस्तावेज़", "सत्यापित", "सेटिंग्स", "डार्क मोड", "चालू", "बंद", "अवकाश के लिए आवेदन करें", "लॉग आउट".
Marathi: "कागदपत्रे", "सत्यापित", "सेटिंग्ज", "डार्क मोड", "चालू", "बंद", "रजेसाठी अर्ज करा", "लॉग आउट".
Tamil: "ஆவணங்கள்", "சரிபார்க்கப்பட்டது", "அமைப்புகள்", "இருண்ட பயன்முறை", "ஆன்", "ஆஃப்", "விடுப்புக்கு விண்ணப்பி", "வெளியேறு".

- [ ] **Step 5: Verify + commit**

Run: `npm test -- src/screens/__tests__/ProfileScreen.test.tsx src/i18n` → PASS.

```bash
git add src/lib/queryClient.ts src/features/profile/hooks.ts src/screens/ProfileScreen.tsx src/i18n
git commit -m "feat(profile): Profile screen — identity, docs, settings, language, logout"
```

---

### Task E: Contract assertions for the four new repos + full verification

**Files:**
- Modify: `src/data/__tests__/contract.test.ts`

- [ ] **Step 1: Add fixture routes + shape assertions**

In `fixtureHttp()`'s `routes` map add:

```ts
    'GET /staff/tasks': [{ id: 'task_1', title: 'X', priority: 'normal', done: false }],
    'GET /staff/roster': { days: [{ date: '2026-06-08', weekday_label: 'Mon', shift: 'Morning', duty_post: 'Bus / Route', off: false }], route_name: 'Route 7' },
    'GET /staff/leave': { balances: [{ type: 'casual', total: 12, used: 4 }], requests: [] },
    'GET /staff/profile': { documents: [{ id: 'd1', label: 'L', value: 'V', ok: true }] },
```

Add tests:

```ts
  it('tasks.list returns the same Task shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = (await mock.tasks.list())[0];
    const b = (await http.tasks.list())[0];
    expect(keys(a)).toEqual(keys(b));
  });
  it('roster.week returns the same RosterWeek shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = await mock.roster.week();
    const b = await http.roster.week();
    expect(keys(a)).toEqual(keys(b));
    expect(keys(a.days[0])).toEqual(keys(b.days[0]));
  });
  it('leave.summary returns the same LeaveSummary shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = await mock.leave.summary();
    const b = await http.leave.summary();
    expect(keys(a)).toEqual(keys(b));
    expect(keys(a.balances[0])).toEqual(keys(b.balances[0]));
  });
  it('profile.get returns the same Profile shape from both adapters', async () => {
    const mock = createMockRepositories(await createStore());
    const http = createHttpRepositories(fixtureHttp());
    const a = await mock.profile.get();
    const b = await http.profile.get();
    expect(keys(a.documents[0])).toEqual(keys(b.documents[0]));
  });
```

> Note: the mock `Task` shape includes optional `detail`/`dueLabel`. `Object.keys` only lists present keys; the mock seed task `task_1` has `dueLabel` but the http fixture above does not — to keep the `keys()` comparison equal, either add `due_label: 'x'` to the fixture task or drop `dueLabel` from the first seed task. Add `due_label: 'x'` to the fixture task to match.

- [ ] **Step 2: Run the contract test** — Run: `npm test -- src/data/__tests__/contract.test.ts` → PASS.

- [ ] **Step 3: Full verification**
- `npm test` → all suites PASS.
- `npm run typecheck` → 0 errors.
- `npm run lint` → 0 errors.
- `npx expo export --platform web` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/data/__tests__/contract.test.ts
git commit -m "test: contract assertions for tasks/roster/leave/profile repos"
git commit --allow-empty -m "chore: finish-screens verification — suite/typecheck/lint/export green"
```

---

## Self-Review

- **Spec coverage (Finish screens):** Roster week strip + route ✓ Part B; Leave balances + zod form + status timeline ✓ Part C; Tasks list + complete (swipe affordance + tested tap) ✓ Part A; Profile identity/documents/theme toggle/language sheet/logout ✓ Part D. All four on mock+http with one-flag swap ✓ (factory wiring per part). 4-language i18n ✓ each part. Standard flow for all 6 roles (no per-role overlays) ✓.
- **Placeholder scan:** the repeated AsyncStorage mock block and the shared screen render harness are referenced ("as in Task A1 / TasksScreen.test.tsx") rather than re-pasted to keep the plan readable — both are shown in full in Task A. The Profile test references the `AuthProvider.test.tsx` provider stack because it needs a signed-in session; that file exists and demonstrates the exact setup. No `TBD`/`implement later`/"add error handling" placeholders.
- **Type consistency:** repository method names (`list`/`complete`, `week`, `summary`/`submit`, `get`) match across port (Task X2 ports), mock, http, and hooks. DTO snake_case↔camelCase pairs are symmetric in `mappers.ts`. `LeaveType`/`LeaveStatus` literals are identical in domain, zod enum, and i18n keys (`leave.type.*`, `leave.status.*`). `queryKeys.{tasks,roster,leave,profile}` defined once and used by the matching hook.
- **Scope:** additive data slices; the only edits to existing files are the three stub-screen replacements, the Home `onViewAll` wiring, the Leave route registration, and the shared `seed.ts`/`store.ts`/`mappers.ts`/`factory.ts`/`queryClient.ts`/`types.ts` extensions.

## Out of scope (this plan)

- The live-trip feature (Plan 6) and the real backend / consumer apps (SP-2–SP-4).
- Native date-picker for the leave form (plain `YYYY-MM-DD` text inputs validated by zod this round).
- Per-role bespoke deep-dive overlays for cleaner/gardener/security guard/peon.
