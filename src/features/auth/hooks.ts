import { useMutation } from '@tanstack/react-query';
import type { Role } from '@/theme/roles';
import { useAuth } from './AuthProvider';

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: ({ phone, roleKey }: { phone: string; roleKey: Role }) => signIn(phone, roleKey),
  });
}

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: () => signOut() });
}
