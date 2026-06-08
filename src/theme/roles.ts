import type { IconName } from '@/components/icons';

export const ROLE_KEYS = [
  'driver', 'cook', 'guard', 'gardener', 'sweeper', 'peon', 'clerk',
] as const;

export type Role = (typeof ROLE_KEYS)[number];

export interface RoleConfig {
  key: Role;
  labelKey: string;
  icon: IconName;
  accent: string;
  accentSoft: string;
  dutyPostLabelKey: string;
  roleCardKind: Role;
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
