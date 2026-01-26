import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getFinanceSummary, getTrips, getVehicles, getMaintenanceHistory, getRentals, getCustomers } from '../services/api';
import { FinancialSummary, Trip, Vehicle, TripStatus, VehicleStatus, MaintenanceRecord, Rental, RentalStatus, Customer } from '../types';
import Card from '../components/Card';
import { STATUS_COLORS, formatCurrency, CHART_COLORS } from '../constants';

const DashboardView: React.FC<{ setCurrentView: (view: any) => void }> = ({ setCurrentView }) => {
  console.log("DashboardView rendering");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      console.log("fetchData called");
      try {
        setLoading(true);
        const [summaryData, tripsData, rentalsData, customersData, vehiclesData, maintenanceData] = await Promise.all([
          getFinanceSummary(),
          getTrips(),
          getRentals(),
          getCustomers(),
          getVehicles(),
          getMaintenanceHistory(),
        ]);
        console.log({ summaryData, tripsData, vehiclesData, maintenanceData });
        setSummary(summaryData);
        setTrips(tripsData);
        setRentals(rentalsData);
        setCustomers(customersData);
        setVehicles(vehiclesData);
        setMaintenanceRecords(maintenanceData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        console.log("setLoading to false");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeRentals = rentals.filter(r => r.status === RentalStatus.Active).length;
  const reservedRentals = rentals.filter(r => r.status === RentalStatus.Reserved).length;

  const summaryChartData = [
    ...Object.values(TripStatus).map(status => ({
      name: `Trip: ${status}`,
      value: trips.filter(trip => trip.status === status).length,
      colorName: status
    })),
    ...Object.values(RentalStatus).map(status => ({
      name: `Rental: ${status}`,
      value: rentals.filter(rental => rental.status === status).length,
      colorName: status
    }))
  ].filter(item => item.value > 0);

  const expenseData = maintenanceRecords.reduce((acc, record) => {
    acc[record.type] = (acc[record.type] || 0) + record.cost;
    return acc;
  }, {} as Record<string, number>);

  const expenseChartData = Object.entries(expenseData).map(([name, value]) => ({
    name,
    value,
  }));


  if (loading) {
    return <div className="text-center p-10">Loading Dashboard...</div>;
  }

  console.log("trips", trips);
  console.log("rentals", rentals);
  console.log("customers", customers);
  console.log("vehicles", vehicles);
  console.log("maintenanceRecords", maintenanceRecords);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <button
          onClick={() => setCurrentView('rentals')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 active:scale-95 transition font-bold cursor-pointer"
        >
          + New Booking
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Total Revenue (Today)</h4>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(summary?.dailyData.slice(-1)[0]?.revenue || 0)}</p>
        </Card>
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Net Profit (Today)</h4>
          <p className="text-3xl font-bold text-indigo-600">{formatCurrency(summary?.dailyData.slice(-1)[0]?.profit || 0)}</p>
        </Card>
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Active Rentals</h4>
          <p className="text-3xl font-bold text-blue-600">{activeRentals}</p>
        </Card>
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Reserved (Pending)</h4>
          <p className="text-3xl font-bold text-orange-500">{reservedRentals}</p>
        </Card>
      </div>

      <Card title="Financial Overview (Last 7 Days)" className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={summary?.dailyData.slice(-7)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
            <YAxis tickFormatter={(val) => `PKR ${val / 1000}k`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" />
            <Bar dataKey="profit" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Activity Overview (Trips & Rentals)">
          <div style={{ height: '350px' }}>
            {summaryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 80, left: 80, bottom: 20 }}>
                  <Pie
                    data={summaryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={50}
                    labelLine={true}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                  >
                    {summaryChartData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={CHART_COLORS.TRIP_STATUS[entry.colorName as keyof typeof CHART_COLORS.TRIP_STATUS]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} formatter={(value: number) => `${value} records`} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No activity data available.</div>
            )}
          </div>
        </Card>

        <Card title="Expense Breakdown">
          <div style={{ height: '350px' }}>
            {expenseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 60, left: 60, bottom: 20 }}>
                  <Pie
                    data={expenseChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    style={{ fontSize: '10px' }}
                  >
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS.EXPENSES[index % CHART_COLORS.EXPENSES.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} formatter={(value: number) => formatCurrency(value)} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No expense data available.</div>
            )}
          </div>
        </Card>

        <Card title="Recent Trips">
          <div className="space-y-4">
            {trips.slice(0, 5).map(trip => (
              <div key={trip.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{trip.route.join(' to ')}</p>
                  <p className="text-sm text-slate-500">Veh: {vehicles.find(v => v.id === trip.vehicle_id)?.license_plate || 'N/A'} | {trip.departureTime}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[trip.status]}`}>
                  {trip.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardView;