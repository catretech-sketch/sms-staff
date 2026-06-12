import { simulateBusPosition } from '@/features/trip/simulateBus';
import type { Route } from '@/data/domain';

const route: Route = {
  id: 'r', name: 'R', assignedBusNo: 'B',
  stops: [
    { id: 's0', name: 'A', lat: 0, lng: 0, seq: 0 },
    { id: 's1', name: 'B', lat: 0, lng: 10, seq: 1 },
    { id: 's2', name: 'C', lat: 0, lng: 20, seq: 2 },
  ],
};

it('sits at the first stop at elapsed 0', () => {
  const p = simulateBusPosition(route, 0, 60_000);
  expect(p.lat).toBeCloseTo(0);
  expect(p.lng).toBeCloseTo(0);
});

it('reaches the final stop at/after total duration', () => {
  const p = simulateBusPosition(route, 60_000, 60_000);
  expect(p.lng).toBeCloseTo(20);
});

it('is monotonic along the route and stays on the line', () => {
  const a = simulateBusPosition(route, 15_000, 60_000);
  const b = simulateBusPosition(route, 30_000, 60_000);
  expect(b.lng).toBeGreaterThan(a.lng);
  expect(a.lat).toBeCloseTo(0); // straight east line → lat stays 0
});
