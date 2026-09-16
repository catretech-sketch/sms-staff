import type { IssuesRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toIssue, fromNewIssue, type IssueDTO } from './mappers';

export function httpIssues(http: HttpClient): IssuesRepository {
  return {
    list: () => http.get<IssueDTO[]>('/staff/issues').then((a) => a.map(toIssue)),
    create: (req) => http.post<IssueDTO>('/staff/issues', fromNewIssue(req)).then(toIssue),
  };
}
