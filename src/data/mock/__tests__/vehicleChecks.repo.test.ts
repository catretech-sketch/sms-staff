import { createStore } from '@/data/mock/store';
import { mockVehicleChecks } from '@/data/mock/vehicleChecks.repo';
import type { NewVehicleInspection } from '@/data/domain';

jest.mock('@react-native-async-storage/async-storage', () => {
  let mem: Record<string, string> = {};
  return { __esModule: true, default: {
    getItem: jest.fn((k: string) => Promise.resolve(mem[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { mem[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete mem[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
  } };
});
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const passingChecklist: Omit<NewVehicleInspection, 'busId' | 'remarks'> = {
  brakes: true, tyres: true, lights: true, horn: true,
  firstAidKit: true, fireExtinguisher: true, emergencyExit: true, fuelLevel: true,
};

describe('mock vehicle checks repo', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('starts with no inspections or fuel logs for a bus', async () => {
    const repo = mockVehicleChecks(await createStore());
    expect(await repo.listInspections('bus_1')).toEqual([]);
    expect(await repo.listFuelLogs('bus_1')).toEqual([]);
  });

  it('submitInspection computes allOk as AND of the checklist', async () => {
    const repo = mockVehicleChecks(await createStore());
    const failing = await repo.submitInspection({ busId: 'bus_1', ...passingChecklist, fireExtinguisher: false });
    expect(failing.allOk).toBe(false);
    const passing = await repo.submitInspection({ busId: 'bus_2', ...passingChecklist });
    expect(passing.allOk).toBe(true);
  });

  it('resubmitting for the same bus on the same day updates in place, not a new row', async () => {
    const repo = mockVehicleChecks(await createStore());
    const first = await repo.submitInspection({ busId: 'bus_1', ...passingChecklist });
    const second = await repo.submitInspection({ busId: 'bus_1', ...passingChecklist, brakes: false });
    expect(second.id).toBe(first.id);
    const list = await repo.listInspections('bus_1');
    expect(list).toHaveLength(1);
    expect(list[0].brakes).toBe(false);
  });

  it('listInspections only returns rows for the requested bus', async () => {
    const repo = mockVehicleChecks(await createStore());
    await repo.submitInspection({ busId: 'bus_1', ...passingChecklist });
    await repo.submitInspection({ busId: 'bus_2', ...passingChecklist });
    expect(await repo.listInspections('bus_1')).toHaveLength(1);
  });

  it('submitFuelLog appends distinct entries as history, no upsert', async () => {
    const repo = mockVehicleChecks(await createStore());
    await repo.submitFuelLog({ busId: 'bus_1', odometerKm: 45210, fuelAddedLiters: 30 });
    await repo.submitFuelLog({ busId: 'bus_1', odometerKm: 45300, fuelAddedLiters: 25 });
    const list = await repo.listFuelLogs('bus_1');
    expect(list).toHaveLength(2);
  });
});
