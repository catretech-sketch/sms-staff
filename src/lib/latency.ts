import { AppError } from './errors';

export function simulateLatency(min = 150, max = 500): Promise<void> {
  const ms = min + Math.random() * Math.max(0, max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function maybeFail(rate = 0): void {
  if (rate > 0 && Math.random() < rate) {
    throw new AppError('mock_failure', 500, 'Simulated mock failure');
  }
}
