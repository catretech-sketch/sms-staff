import { QueryClient } from '@tanstack/react-query';
import { isAppError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isAppError(error) && error.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

export const queryKeys = {
  dashboard: (tenantId: string) => ['dashboard', tenantId] as const,
  attendance: (tenantId: string) => ['attendance', tenantId] as const,
  session: () => ['session'] as const,
};
