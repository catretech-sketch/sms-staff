export interface TaskPeek {
  id: string;
  title: string;
  priority: 'urgent' | 'normal';
  done: boolean;
}

export type RoleCard =
  | { kind: 'driver'; busNo: string; routeName: string; licenseExpiresInDays: number; fitnessOk: boolean }
  | { kind: 'cook'; mealCount: number; menu: string[]; lowStock: string[] }
  | { kind: 'guard'; gate: string; roundsDone: number; roundsTotal: number; visitorsToday: number }
  | { kind: 'gardener'; zones: string[]; wateringDue: number }
  | { kind: 'sweeper'; blocks: string[]; suppliesLow: string[] }
  | { kind: 'peon'; errands: number; bellDuty: boolean }
  | { kind: 'clerk'; pendingFiles: number; requestsOpen: number };

export interface Dashboard {
  hoursThisWeek: number;
  hoursTarget: number;
  streakDays: number;
  leaveLeft: number;
  roleCard: RoleCard;
  pendingTasksPeek: TaskPeek[];
  alert?: string;
}
