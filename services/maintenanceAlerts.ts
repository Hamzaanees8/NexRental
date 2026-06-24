import { Vehicle, MaintenanceRecord, MaintenanceType } from '../types';

export interface MaintenanceAlert {
  vehicleId: string;
  licensePlate: string;
  type: MaintenanceType;
  status: 'due_soon' | 'overdue';
  remainingKm: number;
  nextDueOdometer: number;
}

export const calculateMaintenanceAlerts = (
  vehicles: Vehicle[],
  maintenanceRecords: MaintenanceRecord[]
): MaintenanceAlert[] => {
  const alerts: MaintenanceAlert[] = [];
  const THRESHOLD = 500;

  vehicles.forEach((vehicle) => {
    const currentOdo = vehicle.current_odometer || 0;

    // Group records by type for this vehicle
    const vehicleRecords = maintenanceRecords.filter((r) => r.vehicle_id === vehicle.id);

    // Find the latest record for each maintenance type that has a next_due_odometer
    const latestByType: Record<string, MaintenanceRecord> = {};
    vehicleRecords.forEach((record) => {
      if (record.next_due_odometer) {
        if (!latestByType[record.type] || new Date(record.date) > new Date(latestByType[record.type].date)) {
          latestByType[record.type] = record;
        }
      }
    });

    Object.values(latestByType).forEach((record) => {
      const nextDue = record.next_due_odometer!;
      const remaining = nextDue - currentOdo;

      if (remaining <= 0) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          type: record.type,
          status: 'overdue',
          remainingKm: remaining,
          nextDueOdometer: nextDue,
        });
      } else if (remaining <= THRESHOLD) {
        alerts.push({
          vehicleId: vehicle.id,
          licensePlate: vehicle.license_plate,
          type: record.type,
          status: 'due_soon',
          remainingKm: remaining,
          nextDueOdometer: nextDue,
        });
      }
    });
  });

  return alerts;
};
