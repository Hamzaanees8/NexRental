import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getFinanceSummary, getTrips, getVehicles, getMaintenanceHistory } from '../services/api';
import { FinancialSummary, Trip, Vehicle, TripStatus, VehicleStatus, MaintenanceRecord } from '../types';
import Card from '../components/Card';
import { STATUS_COLORS, formatCurrency, CHART_COLORS } from '../constants';

const DashboardView: React.FC = () => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryData, tripsData, vehiclesData, maintenanceData] = await Promise.all([
          getFinanceSummary(),
          getTrips(),
          getVehicles(),
          getMaintenanceHistory(),
        ]);
        setSummary(summaryData);
        setTrips(tripsData);
        setVehicles(vehiclesData);
        setMaintenanceRecords(maintenanceData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeTrips = trips.filter(trip => trip.status === TripStatus.EnRoute).length;
  const maintenanceDueVehicles = vehicles.filter(v => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(v.lastMaintenanceDate) < thirtyDaysAgo && v.status === VehicleStatus.Active;
  }).length;

  const tripStatusData = Object.values(TripStatus).map(status => ({
    name: status,
    value: trips.filter(trip => trip.status === status).length,
  })).filter(item => item.value > 0);

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

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Dashboard</h1>
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
          <h4 className="text-sm font-medium text-slate-500">Active Trips</h4>
          <p className="text-3xl font-bold">{activeTrips}</p>
        </Card>
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Maintenance Due</h4>
          <p className="text-3xl font-bold text-red-500">{maintenanceDueVehicles}</p>
        </Card>
      </div>

      <Card title="Financial Overview (Last 7 Days)" className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={summary?.dailyData.slice(-7)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
            <YAxis tickFormatter={(val) => `PKR ${val/1000}k`}/>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" />
            <Bar dataKey="profit" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Trip Status Overview">
          <div style={{ height: '300px' }}>
            {tripStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tripStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {tripStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={CHART_COLORS.TRIP_STATUS[entry.name as TripStatus]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} trips`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No trip data available.</div>
            )}
          </div>
        </Card>

        <Card title="Expense Breakdown">
           <div style={{ height: '300px' }}>
            {expenseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                   {expenseChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.EXPENSES[index % CHART_COLORS.EXPENSES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
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
                    <div key={trip.tripId} className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">{trip.route.join(' to ')}</p>
                            <p className="text-sm text-slate-500">Veh: {vehicles.find(v => v.vehicleId === trip.vehicleId)?.licensePlate || 'N/A'} | {trip.departureTime}</p>
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