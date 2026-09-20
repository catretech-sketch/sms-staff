import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { queryKeys } from '@/lib/queryClient';

export function useRouteGeometry(routeId: string | null | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.routeGeometry(routeId ?? ''),
    queryFn: () => repos.routeGeometry.get(routeId as string),
    enabled: !!routeId,
    staleTime: 60_000,
  });
}
