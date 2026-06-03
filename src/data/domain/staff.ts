import type { Role } from '@/theme/roles';

export interface Staff {
  id: string;
  name: string;
  firstName: string;
  roleKey: Role;
  empId: string;
  joined: string; // ISO date
  rating: number;
  dutyPost: string;
  shift: string;
  timing: string;
  phone: string;
}
