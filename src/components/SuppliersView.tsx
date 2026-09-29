import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { Supplier } from '../types';
import { createSupplier, updateSupplier, deleteSupplier } from '../lib/db';
import { ExpandableSearch } from './ExpandableSearch';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Package, 
  X,
  Building
} from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const { currentStore, suppliers, products, refreshStoreData } = useStore();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    });
  }, [suppliers, searchQuery]);

  const handleOpenAdd = () => {
    setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || '',
    });
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
        setEditingSupplier(null);
      } else {
        await createSupplier(currentStore.id, formData);
        setIsAddModalOpen(false);
      }
      await refreshStoreData();
      showToast(editingSupplier ? `✓ Supplier "${formData.name}" updated` : `✓ Supplier "${formData.name}" added`, 'success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save supplier details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    try {
      await deleteSupplier(deletingSupplier.id);
      showToast(`✓ Supplier "${deletingSupplier.name}" deleted`, 'info');
      setDeletingSupplier(null);
      await refreshStoreData();
    } catch (err: any) {
      showToast(err?.message ? `Could not delete supplier: ${err.message}` : 'Could not delete supplier. Please try again.', 'error');
    }
  };

  // Products supplied by this supplier
  const supplierProducts = useMemo(() => {
    if (!viewingSupplier) return [];
    return products.filter((p) => p.supplier_id === viewingSupplier.id);
  }, [products, viewingSupplier]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers & Distributors</h1>
          <p className="text-sm text-slate-500">
            Vendor contact management, supply sources, and product catalog linkages
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by supplier name, contact, phone..."
          />

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center gap-2 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl">
            <span>Searching: "{searchQuery}" ({filteredSuppliers.length} results)</span>
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

      {/* Suppliers List (Replaced horizontal scrolling table with clickable list items) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="px-5 py-16 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No suppliers registered</p>
            <p className="text-xs text-slate-400 mt-1">Add your product vendors and distributors to manage inventory sources.</p>
          </div>
        ) : (
          filteredSuppliers.map((s) => {
            const suppliedCount = products.filter((p) => p.supplier_id === s.id).length;
            return (
              <div
                key={s.id}
                onClick={() => setViewingSupplier(s)}
                className="p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left: Supplier Info */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                    <Truck className="w-5 h-5 text-slate-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm sm:text-base">
                        {s.name}
                      </h3>
                      {s.contact_person && (
                        <span className="text-xs text-slate-500 font-normal">
                          ({s.contact_person})
                        </span>
                      )}
                    </div>

                    {/* Unboxed metadata with subtle typographic separators */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      {s.phone && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{s.phone}</span>
                        </span>
                      )}
                      {s.phone && s.email && <span aria-hidden="true" className="text-slate-300">·</span>}
                      {s.email && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{s.email}</span>
                        </span>
                      )}
                      {(s.phone || s.email) && s.address && <span aria-hidden="true" className="text-slate-300">·</span>}
                      {s.address && (
                        <span className="truncate max-w-xs text-slate-500">{s.address}</span>
                      )}
                      {!s.phone && !s.email && !s.address && (
                        <span className="text-slate-400">No contact details</span>
                      )}
                    </div>

                    {s.notes && (
                      <p className="text-xs text-slate-400 truncate max-w-md mt-1">{s.notes}</p>
                    )}
                  </div>
                </div>

                {/* Right: Products Supplied & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {suppliedCount} {suppliedCount === 1 ? 'product' : 'products'} supplied
                    </span>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setViewingSupplier(s)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="View Supplier Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(s)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Edit Supplier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingSupplier(s)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete Supplier"
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

      {/* Add / Edit Supplier Modal */}
      {(isAddModalOpen || editingSupplier) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingSupplier(null); }}
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
                  Company / Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Distributors Ltd."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Representative
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins (Account Manager)"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
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
                    placeholder="orders@supplier.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warehouse / Physical Address
                </label>
                <input
                  type="text"
                  placeholder="Industrial Park, Dock 4"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Terms & Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Payment on Net 30, weekly delivery schedule..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingSupplier(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Supplier Catalog Modal */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingSupplier.name}</h3>
                <p className="text-xs text-slate-500">Assigned Store Products</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-1 text-xs text-slate-600">
              {viewingSupplier.contact_person && <div><strong>Contact:</strong> {viewingSupplier.contact_person}</div>}
              {viewingSupplier.phone && <div><strong>Phone:</strong> {viewingSupplier.phone}</div>}
              {viewingSupplier.email && <div><strong>Email:</strong> {viewingSupplier.email}</div>}
              {viewingSupplier.address && <div><strong>Address:</strong> {viewingSupplier.address}</div>}
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Products Supplied ({supplierProducts.length})
              </h4>
              <div className="space-y-2">
                {supplierProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No products currently linked to this supplier.</p>
                ) : (
                  supplierProducts.map((prod) => (
                    <div key={prod.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{prod.name}</div>
                        <div className="font-mono text-slate-400 text-[11px]">{prod.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{prod.current_stock} {prod.unit}</div>
                        <span className="text-[10px] text-slate-500">In Stock</span>
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
                    const supp = viewingSupplier;
                    setViewingSupplier(null);
                    handleOpenEdit(supp);
                  }}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Supplier</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const supp = viewingSupplier;
                    setViewingSupplier(null);
                    setDeletingSupplier(supp);
                  }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-900">Delete Supplier</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to delete supplier <strong>{deletingSupplier.name}</strong>?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingSupplier(null)}
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
