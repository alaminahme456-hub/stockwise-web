import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthModal } from './components/AuthModal';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { InventoryView } from './components/InventoryView';
import { POSView } from './components/POSView';
import { CustomersView } from './components/CustomersView';
import { SuppliersView } from './components/SuppliersView';
import { TransactionsView } from './components/TransactionsView';
import { ExpensesView } from './components/ExpensesView';
import { ReportsView } from './components/ReportsView';
import { StaffView } from './components/StaffView';
import { SettingsView } from './components/SettingsView';
import { AcceptInvitationView } from './components/AcceptInvitationView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { NavigationTab, Product } from './types';
import { createStore } from './lib/db';
import { 
  Store as StoreIcon, 
  Search, 
  Plus, 
  X, 
  Package, 
  Users, 
  Receipt,
  Building2,
  AlertCircle,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { formatCurrency } from './lib/utils';

const MainAppLayout: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { showToast } = useToast();
  const { 
    currentStore, 
    stores, 
    setCurrentStore, 
    loading: storeLoading, 
    refreshStoreData, 
    refreshStores,
    products, 
    sales, 
    customers,
    currentMember,
    isStoreOwner,
    hasPermission
  } = useStore();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCustomerIdForProfile, setSelectedCustomerIdForProfile] = useState<string | null>(null);

  // Cashier landing tab optimization (Principle 17: Staff UX)
  React.useEffect(() => {
    if (currentMember && (currentMember.role === 'cashier' || currentMember.role === 'sales_staff')) {
      if (!hasPermission('dashboard.view')) {
        setCurrentTab('pos');
      }
    }
  }, [currentMember, hasPermission]);

  // Global invitation token state (from URL search, hash, pathname or in-app testing)
  const [activeInviteToken, setActiveInviteToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const queryToken = searchParams.get('invite');
      if (queryToken) return queryToken;

      const hash = window.location.hash;
      if (hash.includes('invite/')) {
        const parts = hash.split('invite/');
        if (parts[1]) return parts[1].replace(/[^a-zA-Z0-9_-]/g, '');
      } else if (hash.includes('invite=')) {
        const parts = hash.split('invite=');
        if (parts[1]) return parts[1].replace(/[^a-zA-Z0-9_-]/g, '');
      }

      const pathname = window.location.pathname;
      if (pathname.includes('/invite/')) {
        const parts = pathname.split('/invite/');
        if (parts[1]) return parts[1].replace(/[^a-zA-Z0-9_-]/g, '');
      }
    }
    return null;
  });

  // Listen for browser URL / hash changes
  React.useEffect(() => {
    const handleUrlCheck = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const queryToken = searchParams.get('invite');
      if (queryToken) {
        setActiveInviteToken(queryToken);
        return;
      }
      const hash = window.location.hash;
      if (hash.includes('invite/')) {
        const parts = hash.split('invite/');
        if (parts[1]) setActiveInviteToken(parts[1].replace(/[^a-zA-Z0-9_-]/g, ''));
      }
    };
    window.addEventListener('popstate', handleUrlCheck);
    window.addEventListener('hashchange', handleUrlCheck);
    return () => {
      window.removeEventListener('popstate', handleUrlCheck);
      window.removeEventListener('hashchange', handleUrlCheck);
    };
  }, []);
  
  // Global quick search modal
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');

  // Quick store creation modal
  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCurrency, setNewStoreCurrency] = useState('USD');
  const [creatingStore, setCreatingStore] = useState(false);
  const [createStoreError, setCreateStoreError] = useState<string | null>(null);

  // If active invitation token is present, show invitation flow (both for guests & signed in users)
  if (activeInviteToken) {
    return (
      <AcceptInvitationView
        token={activeInviteToken}
        onCompleted={async () => {
          setActiveInviteToken(null);
          if (typeof window !== 'undefined' && window.history.pushState) {
            const cleanUrl = window.location.pathname.startsWith('/invite') ? '/' : window.location.pathname;
            window.history.pushState({}, document.title, cleanUrl);
          }
          await refreshStores();
          await refreshStoreData();
        }}
        onCancel={() => {
          setActiveInviteToken(null);
          if (typeof window !== 'undefined' && window.history.pushState) {
            const cleanUrl = window.location.pathname.startsWith('/invite') ? '/' : window.location.pathname;
            window.history.pushState({}, document.title, cleanUrl);
          }
        }}
      />
    );
  }

  // If authentication is still validating token
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/30 animate-pulse">
          <StoreIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">ALTECH StockWise</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to PostgreSQL Supabase database...</p>
      </div>
    );
  }

  // If not logged in, show Auth modal immediately
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <AuthModal />
      </div>
    );
  }

  // Suspended staff verification screen
  if (currentStore && currentMember && currentMember.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-amber-500/30 max-w-md w-full rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
            <Lock className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Account Suspended
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-3">
            Access to {currentStore.name} Suspended
          </h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Your staff privileges for this store have been suspended by the store administrator. Please contact your store owner to reactivate your access.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-800">
            {stores.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const otherStore = stores.find((s) => s.id !== currentStore.id);
                  if (otherStore) setCurrentStore(otherStore);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Switch Store
              </button>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Removed staff verification screen
  if (currentStore && currentMember && currentMember.status === 'removed') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-red-500/30 max-w-md w-full rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
            Membership Removed
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-3">
            Membership in {currentStore.name} Revoked
          </h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Your store membership has been removed by the store owner. Historical sales records remain intact under your name.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-800">
            {stores.filter((s) => s.id !== currentStore.id).length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const otherStore = stores.find((s) => s.id !== currentStore.id);
                  if (otherStore) setCurrentStore(otherStore);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Switch Store
              </button>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Permission verification helper for tabs
  const isTabPermitted = (tab: NavigationTab): boolean => {
    if (isStoreOwner) return true;
    switch (tab) {
      case 'dashboard':
        return hasPermission('dashboard.view');
      case 'products':
        return hasPermission('products.view');
      case 'inventory':
        return hasPermission('products.view') || hasPermission('products.adjust_stock');
      case 'pos':
        return hasPermission('sales.create') || hasPermission('sales.view');
      case 'customers':
        return hasPermission('customers.view') || hasPermission('credit.view');
      case 'suppliers':
        return hasPermission('products.edit') || hasPermission('products.create');
      case 'transactions':
        return hasPermission('sales.view');
      case 'expenses':
        return hasPermission('expenses.view');
      case 'reports':
        return hasPermission('reports.view');
      case 'staff':
        return hasPermission('staff.view');
      case 'settings':
        return hasPermission('settings.view');
      case 'stores':
        return true;
      default:
        return false;
    }
  };

  // If authenticated but no stores exist yet for this account
  if (!storeLoading && stores.length === 0) {
    const handleInitialStoreCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newStoreName.trim()) return;
      setCreatingStore(true);
      setCreateStoreError(null);
      try {
        const store = await createStore(user.id, newStoreName.trim(), newStoreCurrency);
        await refreshStoreData();
        setCurrentStore(store);
      } catch (err: any) {
        setCreateStoreError(err?.message || 'Could not initialize store.');
      } finally {
        setCreatingStore(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome to ALTECH StockWise</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Let's create your first store or retail branch to get started.
          </p>

          {createStoreError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createStoreError}</span>
            </div>
          )}

          <form onSubmit={handleInitialStoreCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store / Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Altech Supermarket Main Branch"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Currency *
              </label>
              <select
                value={newStoreCurrency}
                onChange={(e) => setNewStoreCurrency(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
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

            <button
              type="submit"
              disabled={creatingStore}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {creatingStore ? 'Initializing Database Store...' : 'Create My Store'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filter global search items
  const searchResults = {
    products: products.filter(p => 
      p.name.toLowerCase().includes(globalQuery.toLowerCase()) || 
      p.sku.toLowerCase().includes(globalQuery.toLowerCase())
    ).slice(0, 4),
    customers: customers.filter(c => 
      c.name.toLowerCase().includes(globalQuery.toLowerCase()) || 
      (c.phone && c.phone.includes(globalQuery))
    ).slice(0, 3),
    sales: sales.filter(s => 
      s.id.toLowerCase().includes(globalQuery.toLowerCase()) || 
      (s.customer_name && s.customer_name.toLowerCase().includes(globalQuery.toLowerCase()))
    ).slice(0, 3),
  };

  const handleCreateStoreFromNav = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    setCreatingStore(true);
    try {
      const store = await createStore(user.id, newStoreName.trim(), newStoreCurrency);
      await refreshStoreData();
      setCurrentStore(store);
      setCreateStoreOpen(false);
      setNewStoreName('');
      showToast(`✓ Store "${store.name}" created successfully!`, 'success');
    } catch (err: any) {
      showToast(err?.message ? `Could not create store: ${err.message}` : 'Could not create store. Please try again.', 'error');
    } finally {
      setCreatingStore(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar 
          onNavigate={(tab) => setCurrentTab(tab)} 
        />

        {/* View Routing */}
        <main className={`flex-1 p-3.5 sm:p-4 lg:p-8 max-w-7xl w-full mx-auto ${currentTab === 'pos' ? 'pb-12 sm:pb-16' : 'pb-28 sm:pb-32'}`}>
          {!isTabPermitted(currentTab) ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm animate-in zoom-in-95 duration-100">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                You do not have permission to view or manage the <strong className="capitalize">{currentTab}</strong> module. Your store administrator has configured restricted permissions for your role ({currentMember?.role || 'Staff'}).
              </p>
              <button
                type="button"
                onClick={() => {
                  const firstAllowed = (['dashboard', 'pos', 'products', 'inventory', 'customers', 'transactions', 'stores'] as NavigationTab[]).find(t => isTabPermitted(t)) || 'stores';
                  setCurrentTab(firstAllowed);
                }}
                className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Return to Authorized Features
              </button>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView 
                  onNavigate={(tab, customerId) => {
                    setCurrentTab(tab as NavigationTab);
                    if (customerId) setSelectedCustomerIdForProfile(customerId);
                  }} 
                />
              )}
              {currentTab === 'products' && <ProductsView />}
              {currentTab === 'inventory' && <InventoryView />}
              {currentTab === 'pos' && (
                <POSView onNavigate={(tab) => setCurrentTab(tab as NavigationTab)} />
              )}
              {currentTab === 'customers' && (
                <CustomersView 
                  initialCustomerId={selectedCustomerIdForProfile}
                  onClearInitialCustomer={() => setSelectedCustomerIdForProfile(null)}
                />
              )}
              {currentTab === 'suppliers' && <SuppliersView />}
              {currentTab === 'transactions' && <TransactionsView />}
              {currentTab === 'expenses' && <ExpensesView />}
              {currentTab === 'reports' && <ReportsView />}
              {currentTab === 'staff' && (
                <StaffView 
                  onOpenInvitationToken={(tok) => setActiveInviteToken(tok)} 
                />
              )}
              {(currentTab === 'settings' || currentTab === 'stores') && <SettingsView />}
            </>
          )}
        </main>

        {/* StockWise Mobile Bottom Bar (Hidden on POS/Checkout to prevent overlapping Pay button) */}
        {currentTab !== 'pos' && (
          <MobileBottomNav
            currentTab={currentTab}
            onSelectTab={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenMoreMenu={() => setMobileMenuOpen(true)}
          />
        )}
      </div>

      {/* Global Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-100">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search products, customers, receipt IDs..."
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                className="w-full text-sm font-medium text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-4 text-xs">
              {globalQuery.trim() === '' ? (
                <div className="py-6 text-center text-slate-400">
                  Type product names, SKU barcodes, customers, or receipt numbers
                </div>
              ) : (
                <>
                  {/* Products Matches */}
                  {searchResults.products.length > 0 && (
                    <div>
                      <div className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-2">
                        Products ({searchResults.products.length})
                      </div>
                      <div className="space-y-1">
                        {searchResults.products.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => { setCurrentTab('products'); setSearchOpen(false); }}
                            className="p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold text-slate-800">{p.name}</span>
                              <span className="font-mono text-slate-400 text-[11px]">({p.sku})</span>
                            </div>
                            <span className="font-bold text-slate-900">
                              {formatCurrency(p.selling_price, currentStore?.currency || 'USD')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers Matches */}
                  {searchResults.customers.length > 0 && (
                    <div>
                      <div className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-2">
                        Customers ({searchResults.customers.length})
                      </div>
                      <div className="space-y-1">
                        {searchResults.customers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => { 
                              setSelectedCustomerIdForProfile(c.id);
                              setCurrentTab('customers'); 
                              setSearchOpen(false); 
                            }}
                            className="p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-emerald-600" />
                              <span className="font-semibold text-slate-800">{c.name}</span>
                            </div>
                            <span className="text-slate-500">{c.phone || c.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sales Matches */}
                  {searchResults.sales.length > 0 && (
                    <div>
                      <div className="font-semibold uppercase tracking-wider text-slate-400 text-[10px] mb-2">
                        Receipts / Sales ({searchResults.sales.length})
                      </div>
                      <div className="space-y-1">
                        {searchResults.sales.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => { setCurrentTab('transactions'); setSearchOpen(false); }}
                            className="p-2 rounded-xl hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-purple-600" />
                              <span className="font-mono font-semibold text-slate-800">#{s.id.slice(0, 8)}</span>
                              <span className="text-slate-400">({s.customer_name || 'Walk-in'})</span>
                            </div>
                            <span className="font-bold text-slate-900">
                              {formatCurrency(s.total_amount, currentStore?.currency || 'USD')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.products.length === 0 &&
                   searchResults.customers.length === 0 &&
                   searchResults.sales.length === 0 && (
                    <div className="py-6 text-center text-slate-400">
                      No matching records found for "{globalQuery}"
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navbar Triggered Create Store Modal */}
      {createStoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900">Create New Branch Store</h3>
            <p className="text-xs text-slate-500 mt-1">
              Data, staff, products, and inventory will be kept strictly isolated by store_id.
            </p>

            <form onSubmit={handleCreateStoreFromNav} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store / Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Airport Kiosk Branch"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store Currency *
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
                  onClick={() => setCreateStoreOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStore}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50"
                >
                  {creatingStore ? 'Creating...' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ToastProvider>
          <MainAppLayout />
        </ToastProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
