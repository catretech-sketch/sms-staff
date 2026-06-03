import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@/data/domain';
import type { Role } from '@/theme/roles';
import { tokenStore } from '@/lib/tokenStore';
import { asyncStore } from '@/lib/asyncStore';
import { authSnapshot } from '@/lib/authSnapshot';
import { queryClient } from '@/lib/queryClient';
import { useRepositories } from '@/data/repositories/RepositoryContext';

const SESSION_KEY = 'sms.session';

type Status = 'loading' | 'authenticated' | 'unauthenticated';
interface AuthValue {
  status: Status;
  session: Session | null;
  signIn: (phone: string, roleKey: Role) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repos = useRepositories();
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      const tokens = await tokenStore.read();
      const stored = await asyncStore.get<Session>(SESSION_KEY);
      if (!tokens || !stored) {
        if (tokens) await tokenStore.clear();
        setStatus('unauthenticated');
        return;
      }
      try {
        const user = await repos.auth.me();
        const rehydrated: Session = { ...stored, ...tokens, user };
        authSnapshot.set({ accessToken: rehydrated.accessToken, tenantId: rehydrated.tenant.id });
        setSession(rehydrated);
        setStatus('authenticated');
      } catch {
        await tokenStore.clear();
        await asyncStore.remove(SESSION_KEY);
        setStatus('unauthenticated');
      }
    })();
  }, [repos]);

  const signIn = useCallback(
    async (phone: string, roleKey: Role) => {
      const s = await repos.auth.login(phone, roleKey);
      await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
      await asyncStore.set(SESSION_KEY, s);
      authSnapshot.set({ accessToken: s.accessToken, tenantId: s.tenant.id });
      setSession(s);
      setStatus('authenticated');
    },
    [repos],
  );

  const signOut = useCallback(async () => {
    try {
      await repos.auth.logout();
    } finally {
      await tokenStore.clear();
      await asyncStore.remove(SESSION_KEY);
      authSnapshot.clear();
      queryClient.clear();
      setSession(null);
      setStatus('unauthenticated');
    }
  }, [repos]);

  const value = useMemo<AuthValue>(
    () => ({ status, session, signIn, signOut }),
    [status, session, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Context-safe: returns 'anon' when there is no AuthProvider (used by query keys).
export function useTenantId(): string {
  const ctx = useContext(AuthContext);
  return ctx?.session?.tenant.id ?? 'anon';
}
