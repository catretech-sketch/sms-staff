export interface VehicleInspection {
  id: string;
  busId: string;
  brakes: boolean;
  tyres: boolean;
  lights: boolean;
  horn: boolean;
  firstAidKit: boolean;
  fireExtinguisher: boolean;
  emergencyExit: boolean;
  fuelLevel: boolean;
  allOk: boolean;
  remarks?: string;
  inspectionDate: string;
  createdAt: string;
}

export interface NewVehicleInspection {
  busId: string;
  brakes: boolean;
  tyres: boolean;
  lights: boolean;
  horn: boolean;
  firstAidKit: boolean;
  fireExtinguisher: boolean;
  emergencyExit: boolean;
  fuelLevel: boolean;
  remarks?: string;
}

export interface FuelLogEntry {
  id: string;
  busId: string;
  odometerKm: number;
  fuelAddedLiters: number;
  recordedAt: string;
}

export interface NewFuelLogEntry {
  busId: string;
  odometerKm: number;
  fuelAddedLiters: number;
}
