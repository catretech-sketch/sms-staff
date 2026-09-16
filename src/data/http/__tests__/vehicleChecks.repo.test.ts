import { httpVehicleChecks } from '@/data/http/vehicleChecks.repo';
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

describe('httpVehicleChecks', () => {
  it('listInspections maps DTOs to domain VehicleInspections', async () => {
    const { http } = fakeHttp({
      'GET /staff/vehicle-checks/inspections?busId=bus_1': [
        {
          id: 'insp_1', bus_id: 'bus_1', brakes: true, tyres: true, lights: true, horn: true,
          first_aid_kit: true, fire_extinguisher: true, emergency_exit: true, fuel_level: true,
          all_ok: true, remarks: null, inspection_date: '2026-09-16', created_at: '2026-09-16T06:00:00Z',
        },
      ],
    });
    const list = await httpVehicleChecks(http).listInspections('bus_1');
    expect(list).toEqual([
      {
        id: 'insp_1', busId: 'bus_1', brakes: true, tyres: true, lights: true, horn: true,
        firstAidKit: true, fireExtinguisher: true, emergencyExit: true, fuelLevel: true,
        allOk: true, inspectionDate: '2026-09-16', createdAt: '2026-09-16T06:00:00Z',
      },
    ]);
  });

  it('submitInspection posts snake_case fields, computes all_ok, and maps the response', async () => {
    const { http, calls } = fakeHttp({
      'POST /staff/vehicle-checks/inspections': {
        id: 'insp_2', bus_id: 'bus_1', brakes: true, tyres: true, lights: true, horn: true,
        first_aid_kit: true, fire_extinguisher: false, emergency_exit: true, fuel_level: true,
        all_ok: false, remarks: 'Fire extinguisher expired', inspection_date: '2026-09-16', created_at: '2026-09-16T06:00:00Z',
      },
    });
    const result = await httpVehicleChecks(http).submitInspection({
      busId: 'bus_1', brakes: true, tyres: true, lights: true, horn: true,
      firstAidKit: true, fireExtinguisher: false, emergencyExit: true, fuelLevel: true,
      remarks: 'Fire extinguisher expired',
    });
    expect(result.allOk).toBe(false);
    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/staff/vehicle-checks/inspections',
      body: {
        bus_id: 'bus_1', brakes: true, tyres: true, lights: true, horn: true,
        first_aid_kit: true, fire_extinguisher: false, emergency_exit: true, fuel_level: true,
        all_ok: false, remarks: 'Fire extinguisher expired',
      },
    });
  });

  it('listFuelLogs maps DTOs to domain FuelLogEntries', async () => {
    const { http } = fakeHttp({
      'GET /staff/vehicle-checks/fuel-logs?busId=bus_1': [
        { id: 'fuel_1', bus_id: 'bus_1', odometer_km: 45210, fuel_added_liters: 30, recorded_at: '2026-09-16T06:05:00Z' },
      ],
    });
    const list = await httpVehicleChecks(http).listFuelLogs('bus_1');
    expect(list).toEqual([
      { id: 'fuel_1', busId: 'bus_1', odometerKm: 45210, fuelAddedLiters: 30, recordedAt: '2026-09-16T06:05:00Z' },
    ]);
  });

  it('submitFuelLog posts snake_case fields and maps the response', async () => {
    const { http, calls } = fakeHttp({
      'POST /staff/vehicle-checks/fuel-logs': { id: 'fuel_2', bus_id: 'bus_1', odometer_km: 45300, fuel_added_liters: 25, recorded_at: '2026-09-16T06:10:00Z' },
    });
    const result = await httpVehicleChecks(http).submitFuelLog({ busId: 'bus_1', odometerKm: 45300, fuelAddedLiters: 25 });
    expect(result.id).toBe('fuel_2');
    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/staff/vehicle-checks/fuel-logs',
      body: { bus_id: 'bus_1', odometer_km: 45300, fuel_added_liters: 25 },
    });
  });
});
