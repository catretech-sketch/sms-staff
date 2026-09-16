import type { VehicleChecksRepository } from '@/data/repositories/types';
import type { VehicleInspection, NewVehicleInspection, FuelLogEntry, NewFuelLogEntry } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const todayDate = () => new Date().toISOString().slice(0, 10);

export function mockVehicleChecks(store: Store): VehicleChecksRepository {
  return {
    async listInspections(busId: string): Promise<VehicleInspection[]> {
      await simulateLatency();
      return clone(store.vehicleInspections.filter((i) => i.busId === busId));
    },
    async submitInspection(req: NewVehicleInspection): Promise<VehicleInspection> {
      await simulateLatency();
      const inspectionDate = todayDate();
      const allOk = req.brakes && req.tyres && req.lights && req.horn
        && req.firstAidKit && req.fireExtinguisher && req.emergencyExit && req.fuelLevel;
      const existing = store.vehicleInspections.find((i) => i.busId === req.busId && i.inspectionDate === inspectionDate);
      const inspection: VehicleInspection = {
        id: existing?.id ?? store.genId('inspection'),
        busId: req.busId,
        brakes: req.brakes,
        tyres: req.tyres,
        lights: req.lights,
        horn: req.horn,
        firstAidKit: req.firstAidKit,
        fireExtinguisher: req.fireExtinguisher,
        emergencyExit: req.emergencyExit,
        fuelLevel: req.fuelLevel,
        allOk,
        remarks: req.remarks,
        inspectionDate,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      if (existing) {
        Object.assign(existing, inspection);
      } else {
        store.vehicleInspections.unshift(inspection);
      }
      return clone(inspection);
    },
    async listFuelLogs(busId: string): Promise<FuelLogEntry[]> {
      await simulateLatency();
      return clone(store.fuelLogs.filter((f) => f.busId === busId));
    },
    async submitFuelLog(req: NewFuelLogEntry): Promise<FuelLogEntry> {
      await simulateLatency();
      const entry: FuelLogEntry = {
        id: store.genId('fuelLog'),
        busId: req.busId,
        odometerKm: req.odometerKm,
        fuelAddedLiters: req.fuelAddedLiters,
        recordedAt: new Date().toISOString(),
      };
      store.fuelLogs.unshift(entry);
      return clone(entry);
    },
  };
}
