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

  // Date Range Filtering
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Filtered Data
  const filteredDailyData = summary?.dailyData.filter(d => d.date >= startDate && d.date <= endDate) || [];
  const filteredRentals = rentals.filter(r => {
    const rDate = r.start_time.split('T')[0];
    return rDate >= startDate && rDate <= endDate;
  });
  const filteredTrips = trips.filter(t => t.date >= startDate && t.date <= endDate);
  const filteredMaintenance = maintenanceRecords.filter(m => m.date >= startDate && m.date <= endDate);

  const totalRevenueInRange = filteredDailyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalProfitInRange = filteredDailyData.reduce((sum, d) => sum + d.profit, 0);

  const activeRentals = filteredRentals.filter(r => r.status === RentalStatus.Active).length;
  const reservedRentals = filteredRentals.filter(r => r.status === RentalStatus.Reserved).length;

  const summaryChartData = [
    ...Object.values(TripStatus).map(status => ({
      name: `Trip: ${status}`,
      value: filteredTrips.filter(trip => trip.status === status).length,
      colorName: status
    })),
    ...Object.values(RentalStatus).map(status => ({
      name: `Rental: ${status}`,
      value: filteredRentals.filter(rental => rental.status === status).length,
      colorName: status
    }))
  ].filter(item => item.value > 0);

  const expenseData = filteredMaintenance.reduce((acc, record) => {
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of your fleet operations</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
            <span className="text-xs font-bold text-slate-400 uppercase">From</span>
            <input
              type="date"
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl">
            <span className="text-xs font-bold text-slate-400 uppercase">To</span>
            <input
              type="date"
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={() => setCurrentView('rentals')}
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition font-bold text-sm cursor-pointer ml-2"
          >
            + New Booking
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Revenue in Range</h4>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenueInRange)}</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Total Sales</p>
        </Card>
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Net Profit in Range</h4>
          <p className="text-3xl font-bold text-indigo-600">{formatCurrency(totalProfitInRange)}</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">After Expenses</p>
        </Card>
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Bookings in Range</h4>
          <p className="text-3xl font-bold text-blue-600">{filteredRentals.length}</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{activeRentals} Active Currently</p>
        </Card>
        <Card>
          <h4 className="text-sm font-medium text-slate-500">Avg. Revenue / Day</h4>
          <p className="text-3xl font-bold text-orange-500">
            {formatCurrency(filteredDailyData.length ? totalRevenueInRange / filteredDailyData.length : 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Based on selected range</p>
        </Card>
      </div>

      <Card title={`Financial Trend (${startDate} to ${endDate})`} className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredDailyData}>
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
            {filteredTrips.slice(0, 5).map(trip => (
              <div key={trip.id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold text-sm">{trip.route.join(' → ')}</p>
                  <p className="text-[11px] text-slate-500">{new Date(trip.date).toLocaleDateString()} | {trip.departureTime}</p>
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