import { queryClient, queryKeys } from '@/lib/queryClient';

describe('queryClient', () => {
  it('exposes a configured QueryClient', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
  });
  it('queryKeys build stable arrays', () => {
    expect(queryKeys.dashboard('school1')).toEqual(['dashboard', 'school1']);
    expect(queryKeys.attendance('school1')).toEqual(['attendance', 'school1']);
  });
});
