import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { updateStore, updateStoreSettings, createStore } from '../lib/db';
import { getSupabaseCredentials } from '../lib/supabase';
import { 
  Store, 
  Settings as SettingsIcon, 
  Receipt, 
  Database, 
  Plus, 
  Check, 
  Copy, 
  Save, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentStore, settings, stores, setCurrentStore, refreshStoreData } = useStore();
  const { user } = useAuth();

  // Store profile form
  const [storeForm, setStoreForm] = useState({
    name: currentStore?.name || '',
    phone: currentStore?.phone || '',
    email: currentStore?.email || '',
    address: currentStore?.address || '',
    currency: currentStore?.currency || 'USD',
  });

  // Store receipts & tax settings form
  const [settingsForm, setSettingsForm] = useState({
    tax_rate: settings?.tax_rate || 0,
    receipt_header: settings?.receipt_header || '',
    receipt_footer: settings?.receipt_footer || '',
    low_stock_threshold_default: settings?.low_stock_threshold_default || 5,
  });

  // Create new store modal
  const [isNewStoreOpen, setIsNewStoreOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCurrency, setNewStoreCurrency] = useState('USD');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [copiedSchema, setCopiedSchema] = useState(false);

  const { url: supabaseUrl } = getSupabaseCredentials();

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateStore(currentStore.id, {
        name: storeForm.name,
        phone: storeForm.phone,
        email: storeForm.email,
        address: storeForm.address,
        currency: storeForm.currency,
      });

      await updateStoreSettings(currentStore.id, {
        tax_rate: Number(settingsForm.tax_rate),
        receipt_header: settingsForm.receipt_header,
        receipt_footer: settingsForm.receipt_footer,
        low_stock_threshold_default: Number(settingsForm.low_stock_threshold_default),
      });

      await refreshStoreData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save store settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newStoreName.trim()) return;

    setSaving(true);
    try {
      const created = await createStore(user.id, newStoreName.trim(), newStoreCurrency);
      setIsNewStoreOpen(false);
      setNewStoreName('');
      await refreshStoreData();
      setCurrentStore(created);
    } catch (err: any) {
      alert(`Could not create store: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store & System Settings</h1>
          <p className="text-sm text-slate-500">
            Configure business identity, receipts, currencies, and multi-store management
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewStoreOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Store / Branch</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 font-medium">
          <Check className="w-4 h-4" />
          <span>Store settings have been updated and persisted to Supabase!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Store Profile Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Store Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store / Company Name *
              </label>
              <input
                type="text"
                required
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Currency Code *
              </label>
              <select
                value={storeForm.currency}
                onChange={(e) => setStoreForm({ ...storeForm, currency: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="NGN">NGN (₦) - Nigerian Naira</option>
                <option value="KES">KES (KSh) - Kenyan Shilling</option>
                <option value="GHS">GHS (GH₵) - Ghanaian Cedi</option>
                <option value="ZAR">ZAR (R) - South African Rand</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Phone Number
              </label>
              <input
                type="tel"
                value={storeForm.phone}
                onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Official Email
              </label>
              <input
                type="email"
                value={storeForm.email}
                onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Store Physical Address
            </label>
            <input
              type="text"
              value={storeForm.address}
              onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* POS & Receipt Customization */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Point of Sale & Receipt Customization</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Sales Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settingsForm.tax_rate}
                onChange={(e) => setSettingsForm({ ...settingsForm, tax_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Automatically computed at checkout.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={settingsForm.low_stock_threshold_default}
                onChange={(e) => setSettingsForm({ ...settingsForm, low_stock_threshold_default: parseInt(e.target.value, 10) || 5 })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt Header Note
            </label>
            <input
              type="text"
              placeholder="e.g. ALTECH StockWise Official Outlet"
              value={settingsForm.receipt_header}
              onChange={(e) => setSettingsForm({ ...settingsForm, receipt_header: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt Footer Greeting
            </label>
            <input
              type="text"
              placeholder="e.g. Goods sold in good condition cannot be returned. Thank you!"
              value={settingsForm.receipt_footer}
              onChange={(e) => setSettingsForm({ ...settingsForm, receipt_footer: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Submit Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* Database Connection & Schema Information */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">PostgreSQL Single Source of Truth</h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ALTECH StockWise is connected directly to your PostgreSQL database hosted on Supabase.
          All data modifications (products, sales, inventory deductions, staff accounts) are strictly persisted to the database and synced across multiple browsers using PostgreSQL Realtime changes.
        </p>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
          <div className="truncate">
            <span className="text-slate-400">Host URL: </span>
            <span>{supabaseUrl || 'https://eca66e4c-ee5d-49ef-af91-320a781a1f01.supabase.co'}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Realtime Active
          </span>
        </div>
      </div>

      {/* Create New Store Modal */}
      {isNewStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900">Add New Store Branch</h3>
            <p className="text-xs text-slate-500 mt-1">
              Create an isolated branch with independent inventory, sales ledger, and staff members.
            </p>

            <form onSubmit={handleCreateStore} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store / Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westside Mall Branch"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store Currency
                </label>
                <select
                  value={newStoreCurrency}
                  onChange={(e) => setNewStoreCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="NGN">NGN (₦) - Nigerian Naira</option>
                  <option value="KES">KES (KSh) - Kenyan Shilling</option>
                  <option value="GHS">GHS (GH₵) - Ghanaian Cedi</option>
                  <option value="ZAR">ZAR (R) - South African Rand</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewStoreOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
