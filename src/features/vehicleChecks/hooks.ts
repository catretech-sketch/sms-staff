import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { queryKeys } from '@/lib/queryClient';
import type { NewVehicleInspection, NewFuelLogEntry } from '@/data/domain';

export function useVehicleInspections(busId: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.vehicleInspections(busId),
    queryFn: () => repos.vehicleChecks.listInspections(busId),
    enabled: !!busId,
  });
}

export function useSubmitInspection(busId: string) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const key = queryKeys.vehicleInspections(busId);
  return useMutation({
    mutationFn: (req: NewVehicleInspection) => repos.vehicleChecks.submitInspection(req),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useFuelLogs(busId: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: queryKeys.fuelLogs(busId),
    queryFn: () => repos.vehicleChecks.listFuelLogs(busId),
    enabled: !!busId,
  });
}

export function useSubmitFuelLog(busId: string) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const key = queryKeys.fuelLogs(busId);
  return useMutation({
    mutationFn: (req: NewFuelLogEntry) => repos.vehicleChecks.submitFuelLog(req),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
