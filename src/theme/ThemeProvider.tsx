import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { makeTheme, type ThemeColors } from './colors';
import { ROLES, type Role, type RoleConfig } from './roles';
import { asyncStore } from '@/lib/asyncStore';

interface ThemeContextValue {
  colors: ThemeColors;
  dark: boolean;
  role: RoleConfig;
  roleKey: Role;
  setDark: (v: boolean) => void;
  toggleDark: () => void;
  setRole: (r: Role) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_KEY = 'sms_staff_dark';
const ROLE_KEY = 'sms_staff_role';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dark, setDarkState] = useState(false);
  const [roleKey, setRoleState] = useState<Role>('driver');

  useEffect(() => {
    (async () => {
      const savedDark = await asyncStore.get<boolean>(DARK_KEY);
      const savedRole = await asyncStore.get<Role>(ROLE_KEY);
      if (savedDark != null) setDarkState(savedDark);
      if (savedRole && ROLES[savedRole]) setRoleState(savedRole);
    })();
  }, []);

  const setDark = (v: boolean) => {
    setDarkState(v);
    void asyncStore.set(DARK_KEY, v);
  };
  const toggleDark = () => setDark(!dark);
  const setRole = (r: Role) => {
    setRoleState(r);
    void asyncStore.set(ROLE_KEY, r);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: makeTheme(dark),
      dark,
      role: ROLES[roleKey],
      roleKey,
      setDark,
      toggleDark,
      setRole,
    }),
    [dark, roleKey],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
