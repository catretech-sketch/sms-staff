import type { VehicleChecksRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import {
  toVehicleInspection, fromNewVehicleInspection, type VehicleInspectionDTO,
  toFuelLog, fromNewFuelLog, type FuelLogDTO,
} from './mappers';

export function httpVehicleChecks(http: HttpClient): VehicleChecksRepository {
  return {
    listInspections: (busId) =>
      http.get<VehicleInspectionDTO[]>(`/staff/vehicle-checks/inspections?busId=${busId}`).then((a) => a.map(toVehicleInspection)),
    submitInspection: (req) =>
      http.post<VehicleInspectionDTO>('/staff/vehicle-checks/inspections', fromNewVehicleInspection(req)).then(toVehicleInspection),
    listFuelLogs: (busId) =>
      http.get<FuelLogDTO[]>(`/staff/vehicle-checks/fuel-logs?busId=${busId}`).then((a) => a.map(toFuelLog)),
    submitFuelLog: (req) =>
      http.post<FuelLogDTO>('/staff/vehicle-checks/fuel-logs', fromNewFuelLog(req)).then(toFuelLog),
  };
}
