import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getVehicles, getRentals, getMaintenanceHistory } from '../services/api';
import { getVehicleProfitabilityReport, VehicleProfitabilityReport } from '../services/vehicleAnalytics';
import Card from '../components/Card';
import { formatCurrency } from '../constants';

const VehicleROIView: React.FC = () => {
  const [report, setReport] = useState<VehicleProfitabilityReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vehicles, rentals, maintenance] = await Promise.all([
          getVehicles(),
          getRentals(),
          getMaintenanceHistory(),
        ]);
        const data = getVehicleProfitabilityReport(vehicles, rentals, maintenance);
        setReport(data);
      } catch (error) {
        console.error("Failed to fetch ROI data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Analytics...</div>;

  const fleetAvgROI = report.length > 0
    ? report.reduce((sum, v) => sum + v.roi, 0) / report.length
    : 0;

  const mostProfitable = [...report].sort((a, b) => b.netProfit - a.netProfit)[0];
  const highestMaintenance = [...report].sort((a, b) => b.maintenanceCosts - a.maintenanceCosts)[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Vehicle ROI & Profitability</h1>
          <p className="text-slate-500">Financial performance analysis per asset</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-none">
          <h4 className="text-sm font-medium opacity-80 uppercase tracking-wider">Fleet Avg ROI</h4>
          <p className="text-4xl font-bold mt-2">{fleetAvgROI.toFixed(1)}%</p>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs opacity-70">Calculated over {report.length} active assets</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
          <h4 className="text-sm font-medium opacity-80 uppercase tracking-wider">Highest Earning Car</h4>
          <p className="text-2xl font-bold mt-2">{mostProfitable?.licensePlate}</p>
          <p className="text-lg font-semibold">{formatCurrency(mostProfitable?.netProfit || 0)} Net</p>
          <div className="mt-2 pt-2 border-t border-white/20">
             <p className="text-xs opacity-70">{mostProfitable?.makeModel}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none">
          <h4 className="text-sm font-medium opacity-80 uppercase tracking-wider">Highest Maintenance</h4>
          <p className="text-2xl font-bold mt-2">{highestMaintenance?.licensePlate}</p>
          <p className="text-lg font-semibold">{formatCurrency(highestMaintenance?.maintenanceCosts || 0)}</p>
          <div className="mt-2 pt-2 border-t border-white/20">
             <p className="text-xs opacity-70">{highestMaintenance?.makeModel}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenue vs Expenses Comparison">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="licensePlate" />
                <YAxis tickFormatter={(val) => `PKR ${val / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="totalRevenue" name="Total Revenue" fill="#10b981" />
                <Bar dataKey="totalExpenses" name="Total Expenses" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="ROI % per Vehicle">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="licensePlate" />
                <YAxis label={{ value: 'ROI %', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                <Bar dataKey="roi" name="ROI %" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Detailed Profitability Ledger" className="overflow-hidden">
        <div className="overflow-x-auto -m-6">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Purchase Price</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Revenue</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Expenses</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Net Profit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.map((row) => (
                <tr key={row.vehicleId} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{row.licensePlate}</p>
                    <p className="text-xs text-slate-500">{row.makeModel}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm">{formatCurrency(row.purchasePrice)}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-green-600">+{formatCurrency(row.totalRevenue)}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-red-500">-{formatCurrency(row.totalExpenses)}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-indigo-600">{formatCurrency(row.netProfit)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.roi >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {row.roi.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default VehicleROIView;
