import React, { useEffect, useState } from 'react';
import { getTransactions, createExpense, getVehicles, createPrivateHire, updateTransaction, deleteTransaction, getPartners, getPartnerTransactions, createPartnerTransaction, updatePartnerTransaction, deletePartnerTransaction } from '../services/api';
import { Transaction, TransactionType, Vehicle, ContractType, Partner, PartnerTransaction, PartnerTransactionType } from '../types';
import { TRANSACTION_TYPE_COLORS, EXPENSE_TYPES, formatCurrency } from '../constants';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

const FinancialsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'partners'>('ledger');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Partner State
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerTransactions, setPartnerTransactions] = useState<PartnerTransaction[]>([]);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartnerTransaction, setEditingPartnerTransaction] = useState<PartnerTransaction | null>(null);
  const [partnerDeleteModal, setPartnerDeleteModal] = useState<{ isOpen: boolean, transaction: PartnerTransaction | null }>({
    isOpen: false,
    transaction: null
  });

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPrivateHireModalOpen, setIsPrivateHireModalOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Delete Confirmation
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, transaction: Transaction | null }>({
    isOpen: false,
    transaction: null
  });


  // ... fetch logic similar to before
  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [transData, vehiclesData, partnersData, partnerTransData] = await Promise.all([
        getTransactions(),
        getVehicles(),
        getPartners(),
        getPartnerTransactions()
      ]);
      setTransactions(transData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setVehicles(vehiclesData);
      setPartners(partnersData);
      setPartnerTransactions(partnerTransData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
    // Validation
    if (formData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!formData.description) {
      toast.error("Please provide a description or type");
      return;
    }

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, formData);
      toast.success("Expense updated");
    } else {
      await createExpense(formData);
      toast.success("Expense recorded");
    }
    fetchFinancialData();
    setIsExpenseModalOpen(false);
    setEditingTransaction(null);
  };

  const handleSavePrivateHire = async (formData: any) => {
    // Validation
    if (!formData.vehicle_id) {
      toast.error("Please select a vehicle");
      return;
    }
    if (formData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!formData.description) {
      toast.error("Please provide a description");
      return;
    }
    if (new Date(formData.end_date) < new Date(formData.date)) {
      toast.error("End date cannot be before start date");
      return;
    }

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, formData);
      toast.success("Income record updated");
    } else {
      await createPrivateHire(formData);
      toast.success("Income recorded successfully");
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

  const handleDeleteClick = (t: Transaction) => {
    setDeleteModal({ isOpen: true, transaction: t });
  };

  const onConfirmDelete = async () => {
    if (!deleteModal.transaction) return;
    try {
      await deleteTransaction(deleteModal.transaction.id);
      toast.success("Transaction deleted");
      fetchFinancialData();
    } catch (error) {
      toast.error("Failed to delete transaction");
    }
  };

  const handleSavePartnerTransaction = async (formData: any) => {
    try {
      if (editingPartnerTransaction) {
        await updatePartnerTransaction(editingPartnerTransaction.id, formData);
        toast.success("Partner transaction updated");
      } else {
        await createPartnerTransaction(formData);
        toast.success("Partner transaction recorded");
      }
      fetchFinancialData();
      setIsPartnerModalOpen(false);
      setEditingPartnerTransaction(null);
    } catch (error) {
      toast.error("Failed to save partner transaction");
    }
  };

  const onConfirmPartnerDelete = async () => {
    if (!partnerDeleteModal.transaction) return;
    try {
      await deletePartnerTransaction(partnerDeleteModal.transaction.id);
      toast.success("Partner transaction deleted");
      fetchFinancialData();
    } catch (error) {
      toast.error("Failed to delete partner transaction");
    } finally {
      setPartnerDeleteModal({ isOpen: false, transaction: null });
    }
  };

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
        {activeTab === 'ledger' && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-4 sm:px-0">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-2 px-4 font-bold text-sm transition-colors relative ${activeTab === 'ledger' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          General Ledger
          {activeTab === 'ledger' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`py-2 px-4 font-bold text-sm transition-colors relative ${activeTab === 'partners' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Partner Accounts
          {activeTab === 'partners' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <>
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
                <div key={t.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-50 flex justify-between items-center group relative hover:bg-slate-50 transition">

                  <div className="flex items-start gap-2.5 flex-1 cursor-pointer" onClick={() => openEditModal(t)}>
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
                    {(t.type === TransactionType.PrivateHire || t.type === TransactionType.Expense) && (
                      <>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(t);
                          }}
                          className="text-slate-300 group-hover:text-blue-500 text-xs hidden sm:block cursor-pointer hover:underline"
                        >
                          Edit
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(t);
                          }}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition cursor-pointer"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </>
                    )}
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
        </>
      ) : (
        <PartnerAccountsView
          partners={partners}
          transactions={partnerTransactions}
          onAddTransaction={() => {
            setEditingPartnerTransaction(null);
            setIsPartnerModalOpen(true);
          }}
          onEditTransaction={(t) => {
            setEditingPartnerTransaction(t);
            setIsPartnerModalOpen(true);
          }}
          onDeleteTransaction={(t) => {
            setPartnerDeleteModal({ isOpen: true, transaction: t });
          }}
        />
      )}

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

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, transaction: null })}
        onConfirm={onConfirmDelete}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deleteModal.transaction?.description}"? This cannot be undone.`}
        confirmLabel="Delete"
      />

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

      {/* Partner Transaction Modal */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsPartnerModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-indigo-600">
                {editingPartnerTransaction ? 'Edit Partner Transaction' : 'New Partner Transaction'}
              </h2>
              <button onClick={() => setIsPartnerModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none cursor-pointer rounded-lg p-1 hover:bg-slate-200 transition">&times;</button>
            </div>
            <div className="p-6">
              <PartnerTransactionForm
                partners={partners}
                onSave={handleSavePartnerTransaction}
                initialData={editingPartnerTransaction || {}}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={partnerDeleteModal.isOpen}
        onClose={() => setPartnerDeleteModal({ isOpen: false, transaction: null })}
        onConfirm={onConfirmPartnerDelete}
        title="Delete Partner Transaction"
        message={`Are you sure you want to delete this partner transaction? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
};

// Refactored Simple Forms

const ExpenseForm: React.FC<{ vehicles: Vehicle[], onSave: (data: any) => void, initialData: any }> = ({ vehicles, onSave, initialData }) => {
  // Parse initial description to split Type and Notes
  const parseDescription = (desc: string) => {
    if (!desc) return { type: EXPENSE_TYPES[0], notes: '' };
    const match = EXPENSE_TYPES.find(t => desc.startsWith(t));
    if (match) {
      return { type: match, notes: desc.substring(match.length).trim() };
    }
    return { type: 'Other', notes: desc };
  };

  const parsed = parseDescription(initialData.description);

  const [formData, setFormData] = useState({
    amount: 0,
    vehicle_id: '',
    ...initialData,
    description: parsed.type, // Use parsed type for the dropdown
    notes: parsed.notes,      // Use parsed notes for text input
    date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });

  const handleSave = () => {
    // Reconstruct full description
    const fullDescription = formData.description + (formData.notes ? ` ${formData.notes}` : '');
    // Remove 'notes' from the object sent to backend
    const { notes, ...dataToSave } = formData;

    onSave({
      ...dataToSave,
      description: fullDescription
    });
  };

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
        <label className="block text-sm font-bold text-slate-700 mb-1">Notes / Details</label>
        <input
          type="text"
          className="w-full p-2.5 border rounded-lg"
          placeholder="e.g. for Vehicle ABC-123"
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
        />
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
      <button onClick={handleSave} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold shadow-lg mt-4 cursor-pointer hover:bg-red-700 transition">
        {initialData.id ? 'Update Expense' : 'Confirm Expense'}
      </button>
    </div>
  )
}

const PartnerTransactionForm: React.FC<{ partners: Partner[], onSave: (data: any) => void, initialData: any }> = ({ partners, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    partner_id: partners[0]?.id || '',
    type: PartnerTransactionType.Contribution,
    amount: 0,
    description: '',
    ...initialData,
    date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Partner</label>
        <select
          className="w-full p-2.5 border rounded-lg bg-slate-50"
          value={formData.partner_id}
          onChange={e => setFormData({ ...formData, partner_id: e.target.value })}
        >
          {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
          <select
            className="w-full p-2.5 border rounded-lg bg-slate-50"
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
          >
            <option value={PartnerTransactionType.Contribution}>Contribution</option>
            <option value={PartnerTransactionType.Drawing}>Drawing</option>
            <option value={PartnerTransactionType.CommitteeAdjustment}>Committee Adjustment</option>
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
        <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
        <input type="date" className="w-full p-2.5 border rounded-lg"
          value={formData.date}
          onChange={e => setFormData({ ...formData, date: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">Description / Notes</label>
        <input type="text" className="w-full p-2.5 border rounded-lg" placeholder="e.g. Initial capital"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <button onClick={() => onSave(formData)} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg mt-4 cursor-pointer hover:bg-indigo-700 transition">
        {initialData.id ? 'Update Transaction' : 'Confirm Transaction'}
      </button>
    </div>
  );
};

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

const PartnerAccountsView: React.FC<{
  partners: Partner[],
  transactions: PartnerTransaction[],
  onAddTransaction: () => void,
  onEditTransaction: (t: PartnerTransaction) => void,
  onDeleteTransaction: (t: PartnerTransaction) => void
}> = ({ partners, transactions, onAddTransaction, onEditTransaction, onDeleteTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const calculateBalance = (partnerId: string) => {
    const partnerTrans = transactions.filter(t => t.partner_id === partnerId);
    const contributions = partnerTrans
      .filter(t => t.type === PartnerTransactionType.Contribution)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const drawings = partnerTrans
      .filter(t => t.type === PartnerTransactionType.Drawing)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const adjustments = partnerTrans
      .filter(t => t.type === PartnerTransactionType.CommitteeAdjustment)
      .reduce((sum, t) => sum + Number(t.amount), 0); // Assuming adjustment adds to equity

    return contributions - drawings + adjustments;
  };

  const filteredTransactions = transactions.filter(t => {
    const partner = partners.find(p => p.id === t.partner_id);
    const search = searchTerm.toLowerCase();
    return (
      partner?.name.toLowerCase().includes(search) ||
      t.type.toLowerCase().includes(search) ||
      t.description?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Partner Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 sm:px-0">
        {partners.map(partner => {
          const balance = calculateBalance(partner.id);
          return (
            <div key={partner.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${balance >= 0 ? 'bg-indigo-500' : 'bg-red-500'}`}></div>
              <p className="text-xs text-slate-500 uppercase font-bold">{partner.name}</p>
              <p className={`text-lg sm:text-2xl font-mono font-bold ${balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                {formatCurrency(balance)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Net Equity Balance</p>
            </div>
          );
        })}
      </div>

      {/* Header with Add Button */}
      <div className="flex justify-between items-center px-4 sm:px-0">
        <h2 className="text-xl font-bold text-slate-800">Partner Ledger</h2>
        <button
          onClick={onAddTransaction}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 font-bold text-sm transition"
        >
          + Log Transaction
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative px-4 sm:px-0">
        <input
          type="text"
          placeholder="Search partner transactions..."
          className="w-full p-3 pl-10 rounded-lg border border-slate-200 shadow-sm bg-white focus:ring-2 focus:ring-blue-500 transition outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <span className="absolute left-7 top-3.5 text-slate-400">🔍</span>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden mx-4 sm:mx-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Partner</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Description</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map(t => {
                const partner = partners.find(p => p.id === t.partner_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition group">
                    <td className="p-4 text-sm text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="p-4 text-sm font-bold text-slate-800">{partner?.name || 'Unknown'}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                        t.type === PartnerTransactionType.Contribution ? 'bg-green-100 text-green-700' :
                        t.type === PartnerTransactionType.Drawing ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-mono font-bold text-slate-800">
                      {formatCurrency(Number(t.amount))}
                    </td>
                    <td className="p-4 text-sm text-slate-500 max-w-xs truncate" title={t.description}>
                      {t.description}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => onEditTransaction(t)}
                        className="text-slate-400 hover:text-blue-600 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(t)}
                        className="text-slate-400 hover:text-red-600 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    No partner transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialsView;