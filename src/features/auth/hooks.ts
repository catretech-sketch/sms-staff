import { useMutation } from '@tanstack/react-query';
import type { Role } from '@/theme/roles';
import { useAuth } from './AuthProvider';

export function useRequestOtp() {
  const { requestOtp } = useAuth();
  return useMutation({ mutationFn: (identifier: string) => requestOtp(identifier) });
}

export function useVerifyOtp() {
  const { signInWithOtp } = useAuth();
  return useMutation({
    mutationFn: ({ identifier, code, roleKey }: { identifier: string; code: string; roleKey: Role }) =>
      signInWithOtp(identifier, code, roleKey),
  });
}

export function useLogin() {
  const { signInWithPassword } = useAuth();
  return useMutation({
    mutationFn: ({ identifier, password, roleKey }: { identifier: string; password: string; roleKey: Role }) =>
      signInWithPassword(identifier, password, roleKey),
  });
}

export function useSetPassword() {
  const { completePasswordSetup } = useAuth();
  return useMutation({ mutationFn: (password: string) => completePasswordSetup(password) });
}

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: () => signOut() });
}
