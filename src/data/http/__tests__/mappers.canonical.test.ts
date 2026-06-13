import { toRoute, type RouteDTO } from '@/data/http/mappers';
import { toStaff, toLeaveRequest, type StaffDTO, type LeaveRequestDTO, type CanonicalLeaveType } from '@/data/http/mappers';

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

describe('StaffDTO + LeaveRequestDTO canonical contract', () => {
  it('StaffDTO carries canonical superset fields and maps the core ones', () => {
    const dto: StaffDTO = {
      id: 'u1', name: 'Ravi Kumar', first_name: 'Ravi', role_key: 'driver',
      emp_id: 'E-100', joined: '2025-01-01', rating: 4.5, duty_post: 'Depot Gate',
      shift: 'morning', timing: '06:00-14:00', phone: '9876500000',
      category: 'transport', department: 'Transport', attendance_pct: 96,
      status: 'active', avatar_hue: 30,
    };
    const s = toStaff(dto);
    expect(s.roleKey).toBe('driver');
    expect(s.empId).toBe('E-100');
    expect(s.firstName).toBe('Ravi');
  });

  it('LeaveRequestDTO accepts the canonical leave-type union', () => {
    const types: CanonicalLeaveType[] = ['casual', 'sick', 'earned', 'medical', 'maternity', 'emergency', 'other'];
    expect(types).toContain('earned');
    const dto: LeaveRequestDTO = {
      id: 'l1', type: 'earned', from_date: '2026-07-01', to_date: '2026-07-02',
      reason: 'Trip', status: 'pending',
    };
    expect(toLeaveRequest(dto).fromDate).toBe('2026-07-01');
  });
});
