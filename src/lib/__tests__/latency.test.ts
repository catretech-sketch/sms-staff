import { simulateLatency, maybeFail } from '@/lib/latency';
import { AppError } from '@/lib/errors';

describe('latency', () => {
  it('simulateLatency resolves after a delay', async () => {
    const start = Date.now();
    await simulateLatency(20, 20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('maybeFail with rate 0 never throws', () => {
    expect(() => maybeFail(0)).not.toThrow();
  });

  it('maybeFail with rate 1 throws an AppError', () => {
    expect(() => maybeFail(1)).toThrow(AppError);
  });
});
