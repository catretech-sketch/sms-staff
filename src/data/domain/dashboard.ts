export interface TaskPeek {
  id: string;
  title: string;
  priority: 'urgent' | 'normal';
  done: boolean;
}

export type RoleCard =
  | { kind: 'driver'; busNo: string; routeName: string; licenseExpiresInDays: number; fitnessOk: boolean }
  | { kind: 'conductor'; routeName: string; onBoard: number; capacity: number; nextStop: string }
  | { kind: 'guard'; gate: string; roundsDone: number; roundsTotal: number; visitorsToday: number }
  | { kind: 'gardener'; zones: string[]; wateringDue: number }
  | { kind: 'sweeper'; blocks: string[]; suppliesLow: string[] }
  | { kind: 'peon'; errands: number; bellDuty: boolean };

export interface Dashboard {
  hoursThisWeek: number;
  hoursTarget: number;
  streakDays: number;
  leaveLeft: number;
  roleCard: RoleCard;
  pendingTasksPeek: TaskPeek[];
  alert?: string;
}
