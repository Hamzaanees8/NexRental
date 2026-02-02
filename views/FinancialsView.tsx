import React, { useEffect, useState } from 'react';
import { getTransactions, createExpense, getVehicles, createPrivateHire, updateTransaction } from '../services/api';
import { Transaction, TransactionType, Vehicle, ContractType } from '../types';
import { TRANSACTION_TYPE_COLORS, EXPENSE_TYPES, formatCurrency } from '../constants';

const FinancialsView: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPrivateHireModalOpen, setIsPrivateHireModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);


  // ... fetch logic similar to before
  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [transData, vehiclesData] = await Promise.all([
        getTransactions(),
        getVehicles()
      ]);
      setTransactions(transData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setVehicles(vehiclesData);
    } catch (error) {
      console.error("Failed to fetch financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const handleSaveExpense = async (formData: any) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, formData);
    } else {
      await createExpense(formData);
    }
    fetchFinancialData();
    setIsExpenseModalOpen(false);
    setEditingTransaction(null);
  };

  const handleSavePrivateHire = async (formData: any) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, formData);
    } else {
      await createPrivateHire(formData);
    }
    fetchFinancialData();
    setIsPrivateHireModalOpen(false);
    setEditingTransaction(null);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    if (t.type === TransactionType.Expense || t.type === TransactionType.TripExpense) {
      setIsExpenseModalOpen(true);
    } else {
      setIsPrivateHireModalOpen(true);
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const v = vehicles.find(veh => veh.id === t.vehicle_id);
    const search = searchTerm.toLowerCase();

    const descMatch = t.description.toLowerCase().includes(search);
    const typeMatch = t.type.toLowerCase().includes(search);
    const vehicleMatch = v?.license_plate.toLowerCase().includes(search);

    return descMatch || typeMatch || vehicleMatch;
  });

  const isExpenseType = (type: TransactionType) =>
    type === TransactionType.Expense ||
    type === TransactionType.TripExpense ||
    type === TransactionType.MTagTopUp;

  const totalRevenue = transactions
    .filter(t =>
      t.type === TransactionType.Voucher ||
      t.type === TransactionType.PrivateHire ||
      t.type === TransactionType.RentalIncome
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t =>
      t.type === TransactionType.Expense ||
      t.type === TransactionType.TripExpense
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Financials...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-slate-50 z-10 py-4 shadow-sm px-4 rounded-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Financials</h1>
          <p className="text-sm text-slate-500">Overview of income and expenses</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => { setEditingTransaction(null); setIsPrivateHireModalOpen(true); }}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 font-bold text-sm cursor-pointer transition whitespace-nowrap"
          >
            + Income
          </button>
          <button
            onClick={() => { setEditingTransaction(null); setIsExpenseModalOpen(true); }}
            className="flex-1 sm:flex-none bg-pink-600 text-white px-6 py-3 rounded-lg shadow hover:bg-pink-700 font-bold text-sm cursor-pointer transition whitespace-nowrap"
          >
            - Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 sm:px-0">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 uppercase font-bold">Income</p>
          <p className="text-lg sm:text-2xl font-mono font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 uppercase font-bold">Expense</p>
          <p className="text-lg sm:text-2xl font-mono font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <p className="text-xs text-slate-500 uppercase font-bold">Net Profit</p>
          <p className={`text-lg sm:text-2xl font-mono font-bold ${netProfit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search transactions..."
          className="w-full p-4 pl-12 rounded-lg border border-slate-200 shadow-sm bg-white focus:ring-2 focus:ring-blue-500 transition outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <span className="absolute left-4 top-4 text-slate-400">🔍</span>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.map(t => {
          const isExpense = isExpenseType(t.type);
          const vehicle = vehicles.find(v => v.id === t.vehicle_id);
          return (
            <div key={t.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-50 flex justify-between items-center group relative cursor-pointer hover:bg-slate-50 transition" onClick={() => openEditModal(t)}>

              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-lg ${isExpense ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {isExpense ? '↓' : '↑'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{t.description}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      {new Date(t.date).toLocaleDateString()}
                      {vehicle && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono">{vehicle.license_plate}</span>}
                    </p>
                    <span className="text-[10px] font-medium text-slate-400 uppercase bg-slate-100 px-1 rounded w-fit">{t.type}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`font-mono font-bold ${isExpense ? 'text-slate-900' : 'text-green-600'}`}>
                  {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                </div>
                <span className="text-slate-300 group-hover:text-blue-500 text-xs hidden sm:block">Edit</span>
              </div>
            </div>
          )
        })}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No transactions found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-pink-600">{editingTransaction ? 'Edit Expense' : 'New Expense'}</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none cursor-pointer rounded-lg p-1 hover:bg-slate-200 transition">&times;</button>
            </div>
            <div className="p-6">
              <ExpenseForm
                vehicles={vehicles}
                onSave={handleSaveExpense}
                initialData={editingTransaction || {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Private Hire Modal */}
      {isPrivateHireModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsPrivateHireModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-indigo-600">{editingTransaction ? 'Edit Income' : 'New Private Hire'}</h2>
              <button onClick={() => setIsPrivateHireModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none cursor-pointer rounded-lg p-1 hover:bg-slate-200 transition">&times;</button>
            </div>
            <div className="p-6">
              <PrivateHireForm
                vehicles={vehicles}
                onSave={handleSavePrivateHire}
                initialData={editingTransaction || {}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Refactored Simple Forms

const ExpenseForm: React.FC<{ vehicles: Vehicle[], onSave: (data: any) => void, initialData: any }> = ({ vehicles, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    amount: 0,
    description: EXPENSE_TYPES[0],
    vehicle_id: '',
    ...initialData,
    date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
          <select
            className="w-full p-2.5 border rounded-lg bg-slate-50"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          >
            {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Amount</label>
          <input type="number" min="0" className="w-full p-2.5 border rounded-lg font-mono" placeholder="0.00"
            value={formData.amount || ''}
            onChange={e => setFormData({ ...formData, amount: Math.max(0, parseFloat(e.target.value) || 0) })}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Vehicle (Optional)</label>
        <select
          className="w-full p-2.5 border rounded-lg bg-slate-50"
          value={formData.vehicle_id}
          onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
        >
          <option value="">-- General Expense --</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} ({v.type})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
        <input type="date" className="w-full p-2.5 border rounded-lg"
          value={formData.date}
          onChange={e => setFormData({ ...formData, date: e.target.value })}
        />
      </div>
      <button onClick={() => onSave(formData)} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold shadow-lg mt-4 cursor-pointer hover:bg-red-700 transition">
        {initialData.id ? 'Update Expense' : 'Confirm Expense'}
      </button>
    </div>
  )
}

const PrivateHireForm: React.FC<{ vehicles: Vehicle[], onSave: (data: any) => void, initialData: any }> = ({ vehicles, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    amount: 0,
    description: '',
    end_date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    contract_type: ContractType.FixedPrice,
    ...initialData,
    date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Vehicle</label>
        <select
          className="w-full p-2.5 border rounded-lg bg-slate-50"
          value={formData.vehicle_id}
          onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
        >
          <option value="">-- Select Vehicle --</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} ({v.type})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
          <input type="date" className="w-full p-2.5 border rounded-lg"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">End Date</label>
          <input type="date" className="w-full p-2.5 border rounded-lg"
            value={formData.end_date}
            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{formData.contract_type === 'Per Day' ? 'Rate / Day' : 'Total Price'}</label>
        <div className="flex gap-2">
          <select
            className="w-1/3 p-2.5 border rounded-lg bg-slate-50 text-sm"
            value={formData.contract_type}
            onChange={e => setFormData({ ...formData, contract_type: e.target.value as any })}
          >
            <option value={ContractType.FixedPrice}>Fixed</option>
            <option value={ContractType.PerDay}>Per Day</option>
          </select>
          <input type="number" min="0" className="w-2/3 p-2.5 border rounded-lg font-mono" placeholder="0.00"
            value={formData.amount || ''}
            onChange={e => setFormData({ ...formData, amount: Math.max(0, parseFloat(e.target.value) || 0) })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
        <input type="text" className="w-full p-2.5 border rounded-lg" placeholder="e.g. Trip to Lahore"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <button onClick={() => {
        onSave({ ...formData, start_date: formData.date });
      }} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg mt-4 cursor-pointer hover:bg-indigo-700 transition">
        {initialData.id ? 'Update Income' : 'Confirm Income'}
      </button>
    </div>
  )
}

export default FinancialsView;