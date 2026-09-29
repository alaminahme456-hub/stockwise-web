import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Customer, Sale } from '../types';
import { createCustomer, updateCustomer, deleteCustomer } from '../lib/db';
import { formatCurrency, formatDate } from '../lib/utils';
import { ExpandableSearch } from './ExpandableSearch';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Receipt, 
  X,
  ShoppingBag
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { currentStore, customers, sales, refreshStoreData } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currency = currentStore?.currency || 'USD';

  // Compute spend stats per customer
  const customerStats = useMemo(() => {
    const stats: Record<string, { totalSpent: number; totalOrders: number; purchases: Sale[] }> = {};
    customers.forEach((c) => {
      const customerSales = sales.filter((s) => s.customer_id === c.id);
      const totalSpent = customerSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      stats[c.id] = {
        totalSpent,
        totalOrders: customerSales.length,
        purchases: customerSales,
      };
    });
    return stats;
  }, [customers, sales]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    });
  }, [customers, searchQuery]);

  const handleOpenAdd = () => {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
    });
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        setEditingCustomer(null);
      } else {
        await createCustomer(currentStore.id, formData);
        setIsAddModalOpen(false);
      }
      await refreshStoreData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save customer details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await deleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
      await refreshStoreData();
    } catch (err: any) {
      alert(`Could not delete customer: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-sm text-slate-500">
            Client profiles, transaction history, and loyalty tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by customer name, phone, or email..."
          />

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center gap-2 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl">
            <span>Searching: "{searchQuery}" ({filteredCustomers.length} results)</span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="hover:text-blue-900 cursor-pointer ml-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Customers List (Replaced horizontal scrolling table with clickable list items) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="px-5 py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No customers found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or add a new customer.</p>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const stats = customerStats[c.id] || { totalSpent: 0, totalOrders: 0 };
            return (
              <div
                key={c.id}
                onClick={() => setViewingCustomer(c)}
                className="p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left: Customer Info */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {c.name ? c.name[0].toUpperCase() : 'C'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm sm:text-base">
                        {c.name}
                      </h3>
                    </div>

                    {/* Unboxed Contact Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      {c.phone && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </span>
                      )}
                      {c.phone && c.email && <span aria-hidden="true" className="text-slate-300">·</span>}
                      {c.email && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </span>
                      )}
                      {(c.phone || c.email) && c.address && <span aria-hidden="true" className="text-slate-300">·</span>}
                      {c.address && (
                        <span className="truncate max-w-xs text-slate-500">{c.address}</span>
                      )}
                      {!c.phone && !c.email && !c.address && (
                        <span className="text-slate-400">No contact info recorded</span>
                      )}
                    </div>

                    {c.notes && (
                      <p className="text-xs text-slate-400 truncate max-w-md mt-1">{c.notes}</p>
                    )}
                  </div>
                </div>

                {/* Right: Orders, Lifetime Spend & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="font-bold text-slate-900 font-mono text-sm sm:text-base">
                      {formatCurrency(stats.totalSpent, currency)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {stats.totalOrders} {stats.totalOrders === 1 ? 'order' : 'orders'} placed
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setViewingCustomer(c)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="View Customer Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Edit Customer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCustomer(c)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {(isAddModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingCustomer(null); }}
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
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Johnathan Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical / Billing Address
                </label>
                <input
                  type="text"
                  placeholder="Street, City, State"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Preferred items, payment terms, or delivery instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingCustomer(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile & Purchase History Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingCustomer.name}</h3>
                <p className="text-xs text-slate-500">Customer Profile & Purchase History</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-xs text-blue-600 font-medium">Total Orders</div>
                <div className="text-xl font-bold text-blue-900 mt-0.5">
                  {customerStats[viewingCustomer.id]?.totalOrders || 0}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-xs text-emerald-600 font-medium">Total Lifetime Spend</div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">
                  {formatCurrency(customerStats[viewingCustomer.id]?.totalSpent || 0, currency)}
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-1.5 text-xs text-slate-600 pb-3 border-b border-slate-100">
              {viewingCustomer.phone && <div><strong>Phone:</strong> {viewingCustomer.phone}</div>}
              {viewingCustomer.email && <div><strong>Email:</strong> {viewingCustomer.email}</div>}
              {viewingCustomer.address && <div><strong>Address:</strong> {viewingCustomer.address}</div>}
            </div>

            {/* Purchase History List */}
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Order History (Real Database Sales)
              </h4>
              <div className="space-y-2">
                {(customerStats[viewingCustomer.id]?.purchases || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No purchases recorded for this customer yet.</p>
                ) : (
                  (customerStats[viewingCustomer.id]?.purchases || []).map((sale) => (
                    <div key={sale.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">#{sale.id.slice(0, 8)}</div>
                        <div className="text-slate-400">{formatDate(sale.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(sale.total_amount, currency)}</div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] capitalize bg-slate-200 text-slate-700">
                          {sale.payment_method}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cust = viewingCustomer;
                    setViewingCustomer(null);
                    handleOpenEdit(cust);
                  }}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cust = viewingCustomer;
                    setViewingCustomer(null);
                    setDeletingCustomer(cust);
                  }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-900">Delete Customer</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to remove <strong>{deletingCustomer.name}</strong> from your customer records?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
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
