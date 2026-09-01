import type { LeaveRepository } from '@/data/repositories/types';
import type { NewLeaveRequest, LeaveSummary } from '@/data/domain';
import type { HttpClient } from '@/lib/httpClient';
import {
  toLeaveBalance, toLeaveRequestFromWire, fromNewLeave,
  type LeaveBalanceDTO, type LeaveRequestWireDTO,
} from './mappers';

export function httpLeave(http: HttpClient): LeaveRepository {
  return {
    summary: async (): Promise<LeaveSummary> => {
      const [balances, requests] = await Promise.all([
        http.get<LeaveBalanceDTO[]>('/leave/balances'),
        http.get<LeaveRequestWireDTO[]>('/leave'),
      ]);
      return { balances: balances.map(toLeaveBalance), requests: requests.map(toLeaveRequestFromWire) };
    },
    submit: (req: NewLeaveRequest) =>
      http.post<LeaveRequestWireDTO>('/leave', fromNewLeave(req)).then(toLeaveRequestFromWire),
  };
}
