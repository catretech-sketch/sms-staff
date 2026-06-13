import { toRoute, type RouteDTO } from '@/data/http/mappers';

describe('RouteDTO canonical contract', () => {
  const dto: RouteDTO = {
    id: 'r1',
    name: 'North Loop',
    bus_no: 'WBA-07',
    stops: [{ id: 's1', name: 'Gate 1', lat: 40, lng: -75, seq: 1, eta_min: 5 }],
  };

  it('declares bus_no (not assigned_bus_no)', () => {
    expect(Object.keys(dto)).toContain('bus_no');
    expect(Object.keys(dto)).not.toContain('assigned_bus_no');
  });

  it('maps bus_no to domain Route.assignedBusNo', () => {
    const route = toRoute(dto);
    expect(route.assignedBusNo).toBe('WBA-07');
    expect(route.stops[0]).toEqual({ id: 's1', name: 'Gate 1', lat: 40, lng: -75, seq: 1, etaMin: 5 });
  });
});
