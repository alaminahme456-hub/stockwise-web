import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { updateStore, updateStoreSettings, createStore } from '../lib/db';
import { getSupabaseCredentials } from '../lib/supabase';
import { 
  Store as StoreIcon, 
  Settings as SettingsIcon, 
  Receipt, 
  Database, 
  Plus, 
  Check, 
  Save, 
  AlertCircle,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Store } from '../types';

export const SettingsView: React.FC = () => {
  const { currentStore, settings, stores, setCurrentStore, refreshStoreData, refreshStores } = useStore();
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

  // Keep forms in sync whenever active store changes
  useEffect(() => {
    if (currentStore) {
      setStoreForm({
        name: currentStore.name || '',
        phone: currentStore.phone || '',
        email: currentStore.email || '',
        address: currentStore.address || '',
        currency: currentStore.currency || 'USD',
      });
    }
  }, [currentStore?.id]);

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        tax_rate: settings.tax_rate ?? 0,
        receipt_header: settings.receipt_header || '',
        receipt_footer: settings.receipt_footer || '',
        low_stock_threshold_default: settings.low_stock_threshold_default ?? 5,
      });
    }
  }, [settings?.id, currentStore?.id]);

  // Create new store modal
  const [isNewStoreOpen, setIsNewStoreOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCurrency, setNewStoreCurrency] = useState('USD');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [switchSuccessMessage, setSwitchSuccessMessage] = useState<string | null>(null);

  const { url: supabaseUrl } = getSupabaseCredentials();

  // Switch between stores logic
  const handleSwitchStore = (selectedStore: Store) => {
    if (currentStore?.id === selectedStore.id) return;
    setCurrentStore(selectedStore);
    setSwitchSuccessMessage(`Active store switched to "${selectedStore.name}". POS sales, inventory, and staff are now scoped to this branch.`);
    setTimeout(() => {
      setSwitchSuccessMessage(null);
    }, 4000);
  };

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

      await refreshStores();
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
      await refreshStores();
      await refreshStoreData();
      setCurrentStore(created);
      setSwitchSuccessMessage(`New branch "${created.name}" created and set as active store.`);
      setTimeout(() => setSwitchSuccessMessage(null), 4000);
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store &amp; System Settings</h1>
          <p className="text-sm text-slate-500">
            Switch active branch, customize store identity, receipt rules, and database sync
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewStoreOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-xs transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Store / Branch</span>
        </button>
      </div>

      {/* Store Switch Notification Toast */}
      {switchSuccessMessage && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-sm flex items-center gap-2.5 font-medium animate-in fade-in duration-150 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{switchSuccessMessage}</span>
        </div>
      )}

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

      {/* ======================================================== */}
      {/* STORE SWITCHER & MULTI-BRANCH MANAGEMENT SECTION        */}
      {/* ======================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Store Locations &amp; Active Branch Switcher</h2>
              <p className="text-xs text-slate-500">
                Switch which store location you are currently operating. Inventory, POS sales, and staff are strictly isolated per store.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto">
            {stores.length} {stores.length === 1 ? 'Store' : 'Stores'} Available
          </span>
        </div>

        {/* Store Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {stores.map((s: Store) => {
            const isActive = currentStore?.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => handleSwitchStore(s)}
                className={`p-4 rounded-2xl border transition relative flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-600/30'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <StoreIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 text-sm block truncate">{s.name}</span>
                        <span className="text-[11px] text-slate-400 font-medium">Currency: {s.currency || 'USD'}</span>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shrink-0 shadow-xs">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                    {s.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="text-slate-700 font-medium truncate">{s.phone}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="text-slate-700 font-medium truncate max-w-[150px]">{s.email}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Address:</span>
                        <span className="text-slate-700 font-medium truncate max-w-[150px]">{s.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/90">
                  {isActive ? (
                    <div className="w-full py-2 px-3 rounded-xl bg-blue-100/80 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Current Active Store</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchStore(s);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Switch to this Store</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Store Profile Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <StoreIcon className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Store Identity</h3>
                <p className="text-xs text-slate-500">
                  Editing settings for: <strong className="text-slate-800">{currentStore?.name}</strong>
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              Active Store
            </span>
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
            <h3 className="font-bold text-slate-900 text-base">Point of Sale &amp; Receipt Customization</h3>
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
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-sm transition disabled:opacity-50 cursor-pointer"
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50 cursor-pointer"
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
