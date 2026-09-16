import { httpTasks } from '@/data/http/tasks.repo';
import type { HttpClient } from '@/lib/httpClient';

function fakeHttp(routes: Record<string, unknown>): { http: HttpClient; calls: Array<{ method: string; path: string; body?: unknown }> } {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const http: HttpClient = {
    get: <T>(path: string) => { calls.push({ method: 'GET', path }); return Promise.resolve(routes[`GET ${path}`] as T); },
    post: <T>(path: string, body?: unknown) => { calls.push({ method: 'POST', path, body }); return Promise.resolve(routes[`POST ${path}`] as T); },
    patch: <T>(path: string, body?: unknown) => { calls.push({ method: 'PATCH', path, body }); return Promise.resolve(routes[`PATCH ${path}`] as T); },
    delete: <T>(path: string) => { calls.push({ method: 'DELETE', path }); return Promise.resolve(routes[`DELETE ${path}`] as T); },
  };
  return { http, calls };
}

describe('httpTasks', () => {
  it('attachPhoto posts the photo data URI and maps photo_url back onto the task', async () => {
    const { http, calls } = fakeHttp({
      'POST /staff/tasks/task_1/photo': [
        { id: 'task_1', title: 'Water the lawn', priority: 'normal', done: false, photo_url: 'data:image/jpeg;base64,abc123' },
      ],
    });
    const tasks = await httpTasks(http).attachPhoto('task_1', 'data:image/jpeg;base64,abc123');
    expect(tasks[0].photoUrl).toBe('data:image/jpeg;base64,abc123');
    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/staff/tasks/task_1/photo',
      body: { photo_base64: 'data:image/jpeg;base64,abc123' },
    });
  });
});
