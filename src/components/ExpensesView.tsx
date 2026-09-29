import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Expense } from '../types';
import { createExpense, updateExpense, deleteExpense } from '../lib/db';
import { formatCurrency, formatDate } from '../lib/utils';
import { ExpandableSearch } from './ExpandableSearch';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar, 
  DollarSign, 
  X,
  Tag,
  ArrowDownRight
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Rent & Lease',
  'Utilities & Electricity',
  'Salaries & Wages',
  'Logistics & Freight',
  'Maintenance & Repairs',
  'Marketing & Ads',
  'Packaging & Supplies',
  'Licenses & Taxes',
  'Miscellaneous',
];

export const ExpensesView: React.FC = () => {
  const { currentStore, expenses, refreshStoreData } = useStore();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Utilities & Electricity',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currency = currentStore?.currency || 'USD';

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = searchQuery.toLowerCase();
      const noteText = e.notes || e.description || '';
      const matchesSearch = 
        e.title.toLowerCase().includes(q) ||
        noteText.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [expenses, searchQuery, selectedCategory]);

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      category: 'Utilities & Electricity',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      notes: '',
    });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    const expDateStr = exp.expense_date || exp.date || exp.created_at || new Date().toISOString();
    setFormData({
      title: exp.title,
      category: exp.category,
      amount: Number(exp.amount),
      date: expDateStr.split('T')[0],
      payment_method: exp.payment_method || 'bank_transfer',
      notes: exp.notes || exp.description || '',
    });
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          title: formData.title,
          category: formData.category,
          amount: Number(formData.amount),
          date: formData.date,
          payment_method: formData.payment_method,
          notes: formData.notes,
        });
        setEditingExpense(null);
      } else {
        await createExpense(currentStore.id, {
          title: formData.title,
          category: formData.category,
          amount: Number(formData.amount),
          date: formData.date,
          payment_method: formData.payment_method,
          notes: formData.notes,
          recorded_by: user?.email || 'Store User',
        });
        setIsAddModalOpen(false);
      }
      await refreshStoreData();
      showToast(editingExpense ? `✓ Expense "${formData.title}" updated` : `✓ Expense "${formData.title}" recorded`, 'success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save expense entry.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpense(deletingExpense.id);
      showToast(`✓ Expense "${deletingExpense.title}" deleted`, 'info');
      setDeletingExpense(null);
      await refreshStoreData();
    } catch (err: any) {
      showToast(err?.message ? `Could not delete expense: ${err.message}` : 'Could not delete expense. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operating Expenses</h1>
          <p className="text-sm text-slate-500">
            Log overheads, logistics, utility bills, and payroll costs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Total Spent:</span>
            <span className="text-sm sm:text-base font-bold text-red-600">
              {formatCurrency(totalExpenseAmount, currency)}
            </span>
          </div>

          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search expense description or notes..."
          />

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {searchQuery && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl">
              <span>Searching: "{searchQuery}" ({filteredExpenses.length} results)</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="hover:text-blue-900 cursor-pointer ml-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredExpenses.length} of {expenses.length} expense entries
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Expense Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Payment Method</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No expenses recorded</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click "Add Expense" to track outgoing store costs.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <div className="font-semibold text-slate-900">{exp.title}</div>
                      {(exp.notes || exp.description) && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">{exp.notes || exp.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                        <Tag className="w-3 h-3" />
                        <span>{exp.category}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatDate(exp.expense_date || exp.date || exp.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-xs capitalize text-slate-600">
                      {exp.payment_method?.replace('_', ' ') || 'Cash'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-red-600 font-mono text-sm">
                      -{formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Expense"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingExpense(exp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {(isAddModalOpen || editingExpense) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingExpense(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electric utility bill for July"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="pos">POS / Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Receipt Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="Invoice number, vendor notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingExpense(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-900">Delete Expense</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to delete expense record <strong>{deletingExpense.title}</strong> ({formatCurrency(deletingExpense.amount, currency)})?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
