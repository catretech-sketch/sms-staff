import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { NewLeaveRequest } from '@/data/domain';

export function useLeaveSummary() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.leave(tenantId), queryFn: () => repos.leave.summary() });
}

export function useSubmitLeave() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: (req: NewLeaveRequest) => repos.leave.submit(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.leave(tenantId) }),
  });
}
