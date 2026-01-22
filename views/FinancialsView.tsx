import React, { useEffect, useState } from 'react';
import { getTransactions, createExpense, getVehicles, createPrivateHire } from '../services/api';
import { Transaction, TransactionType, Vehicle, ContractType } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons';
import { TRANSACTION_TYPE_COLORS, EXPENSE_TYPES, formatCurrency } from '../constants';

const FinancialsView: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPrivateHireModalOpen, setIsPrivateHireModalOpen] = useState(false);

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

  const handleSaveExpense = async (formData: Omit<Transaction, 'transactionId' | 'tenantId' | 'type'>) => {
    await createExpense(formData);
    fetchFinancialData();
    setIsExpenseModalOpen(false);
  };

  const handleSavePrivateHire = async (formData: Omit<Transaction, 'transactionId' | 'tenantId' | 'type'>) => {
    await createPrivateHire(formData);
    fetchFinancialData();
    setIsPrivateHireModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Financials</h1>
        <div className="flex items-center gap-4">
          <Button onClick={() => setIsPrivateHireModalOpen(true)}>
            <PlusIcon />
            <span className="ml-2">Log Private Hire</span>
          </Button>
          <Button variant="secondary" onClick={() => setIsExpenseModalOpen(true)}>
            <PlusIcon />
            <span className="ml-2">Log Expense</span>
          </Button>
        </div>
      </div>
      {loading ? (
        <p>Loading transactions...</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider">Related To</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const startDate = new Date(t.date).toLocaleDateString();
                  const endDate = t.endDate ? new Date(t.endDate).toLocaleDateString() : null;
                  return (
                  <tr key={t.transactionId}>
                    <td className="p-4 text-slate-700">
                       {t.type === TransactionType.PrivateHire && endDate && endDate !== startDate 
                        ? `${startDate} - ${endDate}` 
                        : startDate}
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${TRANSACTION_TYPE_COLORS[t.type]}`}>{t.type}</span>
                    </td>
                    <td className="p-4 text-slate-600">{t.description}</td>
                    <td className="p-4 text-slate-700 font-medium">
                      {t.relatedTripId && `Trip ${t.relatedTripId.slice(-4)}`}
                      {t.relatedVehicleId && !t.relatedTripId && `Veh: ${vehicles.find(v => v.vehicleId === t.relatedVehicleId)?.licensePlate || 'N/A'}`}
                    </td>
                    <td className={`p-4 text-right font-mono ${t.type === TransactionType.Expense ? 'text-red-600' : 'text-green-600'}`}>
                      {t.type === TransactionType.Expense ? '-' : '+'}
                      {formatCurrency(t.amount)}
                      {t.type === TransactionType.PrivateHire && t.contractType === ContractType.PerDay && <span className="text-xs text-slate-500 ml-1">/day</span>}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        vehicles={vehicles}
      />
      <PrivateHireFormModal
        isOpen={isPrivateHireModalOpen}
        onClose={() => setIsPrivateHireModalOpen(false)}
        onSave={handleSavePrivateHire}
        vehicles={vehicles}
      />
    </div>
  );
};

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'transactionId' | 'tenantId' | 'type'>) => void;
  vehicles: Vehicle[];
}

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ isOpen, onClose, onSave, vehicles }) => {
  const [formData, setFormData] = useState({
    amount: 0,
    description: EXPENSE_TYPES[0],
    date: new Date().toISOString().split('T')[0],
    relatedVehicleId: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: 0,
        description: EXPENSE_TYPES[0],
        date: new Date().toISOString().split('T')[0],
        relatedVehicleId: '',
      });
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log New Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle (Optional)</label>
          <select name="relatedVehicleId" value={formData.relatedVehicleId} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
            <option value="">General Expense</option>
            {vehicles.map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.licensePlate} ({v.type})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Expense Type</label>
          <select name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
            {EXPENSE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Amount</label>
          <input type="number" name="amount" step="0.01" value={formData.amount} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required placeholder="0.00" />
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Log Expense</Button>
        </div>
      </form>
    </Modal>
  );
};

interface PrivateHireFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'transactionId' | 'tenantId' | 'type'>) => void;
  vehicles: Vehicle[];
}

const PrivateHireFormModal: React.FC<PrivateHireFormModalProps> = ({ isOpen, onClose, onSave, vehicles }) => {
  const [formData, setFormData] = useState({
    amount: 0,
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    relatedVehicleId: '',
    contractType: ContractType.FixedPrice,
  });

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (isOpen) {
      setFormData({
        amount: 0,
        description: '',
        startDate: todayStr,
        endDate: todayStr,
        relatedVehicleId: vehicles.length > 0 ? vehicles[0].vehicleId : '',
        contractType: ContractType.FixedPrice,
      });
    }
  }, [isOpen, vehicles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newForm = { ...prev, [name]: name === 'amount' ? parseFloat(value) : value };
        // Ensure end date is not before start date
        if (name === 'startDate' && newForm.endDate < newForm.startDate) {
            newForm.endDate = newForm.startDate;
        }
        if (name === 'endDate' && newForm.endDate < newForm.startDate) {
            newForm.startDate = newForm.endDate;
        }
        return newForm;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.relatedVehicleId) {
        alert("Please select a vehicle for the private hire.");
        return;
    }
    const { startDate, ...rest } = formData;
    onSave({ ...rest, date: startDate });
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Private Hire">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Vehicle</label>
          <select name="relatedVehicleId" value={formData.relatedVehicleId} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required>
            <option value="">Select a vehicle</option>
            {vehicles.map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.licensePlate} ({v.type})</option>)}
          </select>
        </div>
         <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Start Date</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">End Date</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required />
            </div>
        </div>
         <div>
          <label className="block text-sm font-medium text-slate-700">Contract Type</label>
          <select name="contractType" value={formData.contractType} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500">
            {Object.values(ContractType).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            {formData.contractType === ContractType.PerDay ? "Rate Per Day" : "Total Fixed Price"}
          </label>
          <input type="number" name="amount" step="0.01" value={formData.amount} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500" required placeholder="0.00" />
        </div>
         <div>
          <label className="block text-sm font-medium text-slate-700">Contract Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-white text-slate-900 focus:border-indigo-500 focus-ring-indigo-500" placeholder="e.g., 3-day hire to Islamabad" required />
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Hire</Button>
        </div>
      </form>
    </Modal>
  );
};


export default FinancialsView;