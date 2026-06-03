import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  // Once the user changes a preference, don't let async hydration overwrite it.
  const userTouched = useRef(false);

  useEffect(() => {
    (async () => {
      const [savedDark, savedRole] = await Promise.all([
        asyncStore.get<boolean>(DARK_KEY),
        asyncStore.get<Role>(ROLE_KEY),
      ]);
      if (userTouched.current) return;
      if (savedDark != null) setDarkState(savedDark);
      if (savedRole && ROLES[savedRole]) setRoleState(savedRole);
    })();
  }, []);

  const setDark = useCallback((v: boolean) => {
    userTouched.current = true;
    setDarkState(v);
    void asyncStore.set(DARK_KEY, v);
  }, []);

  const toggleDark = useCallback(() => {
    userTouched.current = true;
    setDarkState((prev) => {
      const next = !prev;
      void asyncStore.set(DARK_KEY, next);
      return next;
    });
  }, []);

  const setRole = useCallback((r: Role) => {
    userTouched.current = true;
    setRoleState(r);
    void asyncStore.set(ROLE_KEY, r);
  }, []);

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
    [dark, roleKey, setDark, toggleDark, setRole],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
