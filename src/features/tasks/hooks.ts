import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { Task } from '@/data/domain';

export function useTasks() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.tasks(tenantId), queryFn: () => repos.tasks.list() });
}

export function useCompleteTask() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  const key = queryKeys.tasks(tenantId);
  return useMutation({
    mutationFn: (id: string) => repos.tasks.complete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Task[]>(key) ?? [];
      qc.setQueryData<Task[]>(key, prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
      return { prev };
    },
    onError: (_e, _id, ctx) => { if (ctx) qc.setQueryData(key, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
