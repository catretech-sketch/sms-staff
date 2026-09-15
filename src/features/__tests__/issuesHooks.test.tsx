import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { useIssues, useReportIssue } from '@/features/issues/hooks';
import type { Issue, NewIssue } from '@/data/domain';
import type { Repositories } from '@/data/repositories/types';

function makeRepos(overrides?: Partial<Repositories['issues']>): Repositories {
  return {
    issues: {
      list: jest.fn(async () => [] as Issue[]),
      create: jest.fn(async (req: NewIssue) => ({
        id: 'i1', ...req, status: 'open', createdAt: '2026-09-15T08:00:00Z',
      } as unknown as Issue)),
      ...overrides,
    },
  } as unknown as Repositories;
}

function wrapper(repos: Repositories) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RepositoryProvider repositories={repos}>{children}</RepositoryProvider>
    </QueryClientProvider>
  );
}

describe('useIssues / useReportIssue', () => {
  it('useIssues returns the repo list', async () => {
    const repos = makeRepos();
    const { result } = renderHook(() => useIssues(), { wrapper: wrapper(repos) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('useReportIssue creates and the mutation resolves with the created issue', async () => {
    const repos = makeRepos();
    const { result } = renderHook(() => useReportIssue(), { wrapper: wrapper(repos) });
    await act(async () => {
      await result.current.mutateAsync({ category: 'other', title: 'T', description: 'd', priority: 'normal' });
    });
    expect(repos.issues.create).toHaveBeenCalledWith({ category: 'other', title: 'T', description: 'd', priority: 'normal' });
  });
});
