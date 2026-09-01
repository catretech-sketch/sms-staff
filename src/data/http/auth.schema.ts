// src/data/http/auth.schema.ts — real /auth/* wire contract (shared across sms apps).
import { z } from 'zod';
import type { Staff, Tenant } from '@/data/domain';
import type { Role } from '@/theme/roles';

export const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});
export type TokenWire = z.infer<typeof tokenSchema>;

// GET /auth/me. id/tenant_id always present; display fields are optional —
// sms-backend's generic AuthService has no concept of driver/conductor/etc,
// so role-derived fields (dutyPost/rating/shift/timing) are never on the wire.
export const meSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  employee: z.string().nullable().optional(),
  joined: z.string().nullable().optional(),
  tenant_name: z.string().nullable().optional(),
});
export type MeWire = z.infer<typeof meSchema>;

/**
 * Builds a Staff from the real /auth/me payload. `roleKey` is always chosen
 * client-side (the backend has no granular staff role), and fields the
 * backend never returns (dutyPost/rating/shift/timing) fall back to
 * `previous` (rehydrating an existing session) or a role-derived default
 * (a fresh login has no prior session to carry them from, and no plain-text
 * duty-post label exists outside i18n resources this data layer can't read).
 */
export function toStaffFromMe(me: MeWire, roleKey: Role, previous?: Staff): Staff {
  return {
    id: me.id,
    name: me.name ?? previous?.name ?? '',
    firstName: previous?.firstName ?? (me.name ?? '').split(' ')[0] ?? '',
    roleKey,
    empId: me.employee ?? previous?.empId ?? '',
    joined: me.joined ?? previous?.joined ?? '',
    rating: previous?.rating ?? 0,
    dutyPost: previous?.dutyPost ?? '',
    shift: previous?.shift ?? '',
    timing: previous?.timing ?? '',
    phone: me.phone ?? previous?.phone ?? '',
  };
}

export function toTenantFromMe(me: MeWire): Tenant {
  return { id: me.tenant_id, name: me.tenant_name ?? '' };
}

/** Masks an email/phone identifier for display ("a••@x.com" / "••••0118"). */
export function maskIdentifier(identifier: string): string {
  if (identifier.includes('@')) {
    const [local, domain] = identifier.split('@');
    const head = local.slice(0, 1);
    return `${head}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
  }
  const tail = identifier.slice(-4);
  return `${'•'.repeat(Math.max(identifier.length - 4, 0))}${tail}`;
}
