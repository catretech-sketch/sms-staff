import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { Issue, NewIssue } from '@/data/domain';

export function useIssues() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.issues(tenantId), queryFn: () => repos.issues.list() });
}

export function useReportIssue() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  const key = queryKeys.issues(tenantId);
  return useMutation({
    mutationFn: (req: NewIssue) => repos.issues.create(req),
    onSuccess: (issue) => {
      const prev = qc.getQueryData<Issue[]>(key) ?? [];
      qc.setQueryData<Issue[]>(key, [issue, ...prev]);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
