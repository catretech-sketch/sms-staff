import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Attendance } from '@/data/domain';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useAttendanceStatus() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.attendance(tenantId),
    queryFn: () => repos.attendance.status(),
  });
}

export function useSchoolLocation() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.schoolLocation(tenantId),
    queryFn: () => repos.attendance.schoolLocation(),
    staleTime: 5 * 60_000,
  });
}

interface CheckPunch {
  at: string;
  lat: number;
  lng: number;
  accuracyMeters: number;
}

export function useCheckIn() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.attendance(tenantId);
  return useMutation({
    mutationFn: ({ at, lat, lng, accuracyMeters }: CheckPunch) =>
      repos.attendance.checkIn(at, lat, lng, accuracyMeters),
    onMutate: async ({ at }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Attendance>(key);
      if (prev) {
        qc.setQueryData<Attendance>(key, {
          ...prev,
          checkedIn: true,
          checkInAt: at,
          lastLog: [{ at, kind: 'in', inZone: true }, ...prev.lastLog],
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useCheckOut() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.attendance(tenantId);
  return useMutation({
    mutationFn: ({ at, lat, lng, accuracyMeters }: CheckPunch) =>
      repos.attendance.checkOut(at, lat, lng, accuracyMeters),
    onMutate: async ({ at }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Attendance>(key);
      if (prev) {
        qc.setQueryData<Attendance>(key, {
          ...prev,
          checkedIn: false,
          checkInAt: undefined,
          lastLog: [{ at, kind: 'out', inZone: true }, ...prev.lastLog],
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
