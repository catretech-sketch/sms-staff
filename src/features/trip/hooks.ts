import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { TripDirection, Boarding } from '@/data/domain';

export function useTripAssignment() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.tripAssignment(tenantId),
    queryFn: () => repos.trip.myAssignment(),
  });
}

export function useCurrentTrip() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.tripCurrent(tenantId),
    queryFn: () => repos.trip.current(),
  });
}

export function useStartTrip() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: (vars: { routeId: string; direction: TripDirection; busNo: string }) =>
      repos.trip.startTrip(vars.routeId, vars.direction, vars.busNo),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tripCurrent(tenantId) }),
  });
}

export function useEndTrip() {
  const repos = useRepositories();
  const qc = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: (tripId: string) => repos.trip.endTrip(tripId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tripCurrent(tenantId) }),
  });
}

export function useRoster(tripId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.tripRoster(tripId ?? 'none'),
    queryFn: () => repos.trip.roster(tripId as string),
    enabled: !!tripId,
  });
}

export function useBoarding(tripId: string | undefined) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.tripBoarding(tripId ?? 'none'),
    queryFn: () => repos.trip.boardingState(tripId as string),
    enabled: !!tripId,
  });
  const setBoarding = useMutation({
    mutationFn: (b: Boarding) => repos.trip.setBoarding(b),
    onMutate: async (b) => {
      const key = queryKeys.tripBoarding(b.tripId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Boarding[]>(key) ?? [];
      const next = prev.filter((x) => x.studentId !== b.studentId).concat(b);
      qc.setQueryData<Boarding[]>(key, next);
      return { prev, key };
    },
    onError: (_e, _b, ctx) => { if (ctx) qc.setQueryData(ctx.key, ctx.prev); },
    onSettled: (_d, _e, b) => qc.invalidateQueries({ queryKey: queryKeys.tripBoarding(b.tripId) }),
  });
  return { ...query, setBoarding };
}
