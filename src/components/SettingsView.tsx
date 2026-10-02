import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { updateStore, updateStoreSettings, createStore } from '../lib/db';
import { 
  Store as StoreIcon, 
  Settings as SettingsIcon, 
  Receipt, 
  Plus, 
  Check, 
  Save, 
  AlertCircle,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  Download,
  ExternalLink,
  Share2,
  PlusSquare,
  X,
  CheckCircle
} from 'lucide-react';
import { Store } from '../types';
import { usePWAInstall } from '../context/PWAInstallContext';
import { STOCKWISE_ANDROID_APK_URL, isApkConfigured } from '../config/appConfig';

export const SettingsView: React.FC = () => {
  const { currentStore, settings, stores, setCurrentStore, refreshStoreData, refreshStores } = useStore();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { deferredPrompt, isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // iOS Safari PWA guide modal state
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const [installingPWA, setInstallingPWA] = useState(false);

  // Trigger the saved beforeinstallprompt event when clicked
  const handleTriggerInstallPrompt = async () => {
    if (isInstalled) {
      showToast('✓ StockWise is already installed and running as a standalone app.', 'info');
      return;
    }

    if (isIOS) {
      setShowIOSInstallGuide(true);
      return;
    }

    if (deferredPrompt) {
      setInstallingPWA(true);
      try {
        const accepted = await install();
        if (accepted) {
          showToast('✓ StockWise app installation confirmed!', 'success');
        }
      } finally {
        setInstallingPWA(false);
      }
      return;
    }

    // If deferredPrompt is not yet fired or not supported
    showToast('To install StockWise, look for the install icon in your browser address bar or menu.', 'info');
  };

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
      showToast(`✓ New branch "${created.name}" created and set as active store.`, 'success');
      setSwitchSuccessMessage(`New branch "${created.name}" created and set as active store.`);
      setTimeout(() => setSwitchSuccessMessage(null), 4000);
    } catch (err: any) {
      showToast(err?.message ? `Could not create store: ${err.message}` : 'Could not create store. Please try again.', 'error');
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

      {/* Cross-Device & Mobile Access Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Mobile &amp; App Access</h2>
              <p className="text-xs text-slate-500">Android APK download, iPhone PWA install, and staff access</p>
            </div>
          </div>

          {/* New Header Install Button triggering the saved beforeinstallprompt */}
          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>App Installed</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleTriggerInstallPrompt}
              disabled={installingPWA}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              title={isInstallable ? 'Install StockWise App (Prompt Ready)' : 'Install StockWise on your device'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{installingPWA ? 'Installing...' : 'Install App'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Android App Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>StockWise Android APK</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Native App
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provides offline barcode scanning, dedicated hardware POS support, and deep-linked staff invitations.
            </p>
            <div className="pt-1 flex items-center gap-2">
              {isApkConfigured() ? (
                <a
                  href={STOCKWISE_ANDROID_APK_URL}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download APK</span>
                </a>
              ) : (
                <span className="text-xs text-slate-500 italic">
                  APK release being prepared (configurable in .env)
                </span>
              )}
              <a
                href="/download/android"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <span>View Download Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* iPhone / iPad & Desktop PWA Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>{isIOS ? 'iPhone / iPad (PWA)' : 'StockWise Web App (PWA)'}</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                PWA Installable
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isIOS 
                ? 'Install directly from Safari by tapping Share → Add to Home Screen. Launches in fullscreen standalone mode.'
                : 'Install StockWise directly to your device for instant launch, offline support, and dedicated standalone window.'}
            </p>
            <div className="pt-1">
              {isInstalled ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Installed &amp; Active</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerInstallPrompt}
                  disabled={installingPWA}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  title="Trigger saved install prompt"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {installingPWA 
                      ? 'Installing...' 
                      : isIOS 
                      ? 'Add to Home Screen' 
                      : isInstallable 
                      ? 'Install StockWise App' 
                      : 'Install StockWise'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* iOS Safari Step-by-Step Installation Modal */}
      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  SW
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add StockWise to Home Screen</h3>
                  <p className="text-[11px] text-slate-400">Install StockWise on iPhone / iPad</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSInstallGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>Tap the Share button</span>
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Located in Safari toolbar at the bottom of your iPhone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>Select &quot;Add to Home Screen&quot;</span>
                    <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scroll down in the Safari share sheet.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>Tap &quot;Add&quot;</span>
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    StockWise will appear on your Home Screen as an app.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

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
