import type { TasksRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toTask, type TaskDTO } from './mappers';

export function httpTasks(http: HttpClient): TasksRepository {
  return {
    list: () => http.get<TaskDTO[]>('/staff/tasks').then((a) => a.map(toTask)),
    complete: (id) => http.post<TaskDTO[]>(`/staff/tasks/${id}/complete`, {}).then((a) => a.map(toTask)),
  };
}
