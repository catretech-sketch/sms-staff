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

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: () => signOut() });
}
