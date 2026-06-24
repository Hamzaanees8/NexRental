import { Vehicle, Rental, MaintenanceRecord } from '../types';

export interface VehicleProfitabilityReport {
  vehicleId: string;
  licensePlate: string;
  makeModel: string;
  purchasePrice: number;
  totalRevenue: number;
  maintenanceCosts: number;
  tripExpenses: number;
  totalExpenses: number;
  tco: number;
  netProfit: number;
  roi: number;
}

export const getVehicleProfitabilityReport = (
  vehicles: Vehicle[],
  rentals: Rental[],
  maintenanceRecords: MaintenanceRecord[]
): VehicleProfitabilityReport[] => {
  return vehicles.map((vehicle) => {
    const vehicleRentals = rentals.filter((r) => r.vehicle_id === vehicle.id);
    const vehicleMaintenance = maintenanceRecords.filter((m) => m.vehicle_id === vehicle.id);

    const totalRevenue = vehicleRentals.reduce((sum, r) => sum + (r.rent_amount || 0), 0);

    const maintenanceCosts = vehicleMaintenance.reduce((sum, m) => sum + (m.cost || 0), 0);

    const tripExpenses = vehicleRentals.reduce((sum, r) => {
      const fuel = r.fuel_cost || 0;
      const toll = r.toll_cost || 0;
      const driver = r.driver_allowance || 0;
      const other = r.other_expenses || 0;
      const rideExpensesSum = (r.ride_expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      return sum + fuel + toll + driver + other + rideExpensesSum;
    }, 0);

    const totalExpenses = maintenanceCosts + tripExpenses;
    const purchasePrice = vehicle.purchase_price || 0;
    const tco = purchasePrice + totalExpenses;
    const netProfit = totalRevenue - totalExpenses;

    // ROI (%) = (Net Income - TCO) / Vehicle Purchase Price * 100
    // Net Income here is totalRevenue
    const roi = purchasePrice > 0 ? ((totalRevenue - tco) / purchasePrice) * 100 : 0;

    return {
      vehicleId: vehicle.id,
      licensePlate: vehicle.license_plate,
      makeModel: vehicle.make_model || 'Unknown',
      purchasePrice,
      totalRevenue,
      maintenanceCosts,
      tripExpenses,
      totalExpenses,
      tco,
      netProfit,
      roi,
    };
  });
};
