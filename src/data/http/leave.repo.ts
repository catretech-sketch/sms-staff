import type { LeaveRepository } from '@/data/repositories/types';
import type { NewLeaveRequest } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import { toLeaveSummary, toLeaveRequest, fromNewLeave, type LeaveSummaryDTO, type LeaveRequestDTO } from './mappers';

export function httpLeave(http: HttpClient): LeaveRepository {
  return {
    summary: () => http.get<LeaveSummaryDTO>('/staff/leave').then(toLeaveSummary),
    submit: (req: NewLeaveRequest) => http.post<LeaveRequestDTO>('/staff/leave', fromNewLeave(req)).then(toLeaveRequest),
  };
}
