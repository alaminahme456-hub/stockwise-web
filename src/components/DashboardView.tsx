import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Receipt, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Users, 
  Truck, 
  ShieldCheck, 
  Crown, 
  ChevronRight, 
  Store as StoreIcon, 
  X, 
  Check, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  Lock 
} from 'lucide-react';
import { NavigationTab, Sale } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab, customerId?: string) => void;
  onViewSaleDetail?: (sale: Sale) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onViewSaleDetail }) => {
  const { 
    currentStore, 
    sales, 
    products, 
    hasPermission,
    isStoreOwner
  } = useStore();
  const { user } = useAuth();

  const canViewRevenue = isStoreOwner || hasPermission('financials.view_revenue');
  const canViewReports = isStoreOwner || hasPermission('reports.view');
  const canViewStaff = isStoreOwner || hasPermission('staff.view');
  const canViewSettings = isStoreOwner || hasPermission('settings.view');
  const canViewCredit = isStoreOwner || hasPermission('credit.view');
  const canViewCustomers = isStoreOwner || hasPermission('customers.view');
  const canViewProducts = isStoreOwner || hasPermission('products.view');
  const canAdjustStock = isStoreOwner || hasPermission('products.adjust_stock');
  const canCreateSale = isStoreOwner || hasPermission('sales.create');
  const canViewSales = isStoreOwner || hasPermission('sales.view');

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'pro' | 'enterprise'>('pro');
  const [subscriptionFeedback, setSubscriptionFeedback] = useState<string | null>(null);

  // Today's specific sales
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter((s) => new Date(s.created_at).toDateString() === today);
  }, [sales]);

  const todaySalesAmount = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [todaySales]);

  const todaySalesCount = todaySales.length;

  // Total sales amount (all time in current store)
  const totalSalesAmount = useMemo(() => {
    return sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [sales]);

  // Inventory stats
  const totalProductsCount = products.length;
  const lowStockProducts = useMemo(() => {
    return products.filter(
      (p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.min_stock_level)
    );
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => Number(p.current_stock) <= 0);
  }, [products]);

  const currency = currentStore?.currency || 'USD';

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ======================================================== */}
      {/* DASHBOARD OVERVIEW CARD (TITLE, BUSINESS NAME, POS)      */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-5 sm:p-6 shadow-md shadow-blue-500/15">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-blue-100 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
              <StoreIcon className="w-3.5 h-3.5" />
              <span>Dashboard Overview</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {currentStore?.business_name || currentStore?.name || 'StockWise Store'}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/85 flex items-center gap-2 font-medium">
              <span>{currentStore?.currency || 'USD'} Register</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>

          {/* Prominent POS Sale Button */}
          <button
            type="button"
            id="btn-overview-pos-sale"
            onClick={() => onNavigate('pos')}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 active:bg-blue-100 font-bold text-sm shadow-md transition group self-start sm:self-auto cursor-pointer active:scale-95"
          >
            <ShoppingCart className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <span>POS Sale</span>
            <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. 2x2 GRID DISPLAYING KEY METRICS:                     */}
      {/*    "Today's Revenue", "Total Sales", "Total Products",   */}
      {/*    and "Low Stock Alert"                                 */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4.5">
        {/* Metric 1: Today's Revenue */}
        <div 
          onClick={() => canViewSales && onNavigate('transactions')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs transition flex flex-col justify-between ${
            canViewSales ? 'hover:border-blue-300 hover:shadow-sm cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">Today&apos;s Revenue</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              {canViewRevenue ? (
                formatCurrency(todaySalesAmount, currency)
              ) : (
                <span className="text-slate-400 font-mono tracking-widest text-sm flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restricted</span>
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-emerald-600 font-medium flex items-center gap-1">
              <span>{todaySalesCount} {todaySalesCount === 1 ? 'sale' : 'sales'} today</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Sales */}
        <div 
          onClick={() => canViewSales && onNavigate('transactions')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs transition flex flex-col justify-between ${
            canViewSales ? 'hover:border-blue-300 hover:shadow-sm cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">Total Sales</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              {canViewRevenue ? (
                formatCurrency(totalSalesAmount, currency)
              ) : (
                <span className="text-slate-400 font-mono tracking-widest text-sm flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restricted</span>
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-slate-500 font-medium">
              <span>{sales.length} lifetime orders</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Total Products */}
        <div 
          onClick={() => canViewProducts && onNavigate('products')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs transition flex flex-col justify-between ${
            canViewProducts ? 'hover:border-blue-300 hover:shadow-sm cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">Total Products</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalProductsCount}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-slate-500 font-medium">
              <span>Active inventory items</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Low Stock Alert */}
        <div 
          onClick={() => (canViewProducts || canAdjustStock) && onNavigate('inventory')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 bg-amber-50/20 shadow-xs transition flex flex-col justify-between ${
            (canViewProducts || canAdjustStock) ? 'hover:border-amber-400 hover:shadow-sm cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-amber-900">Low Stock Alert</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-black text-amber-900 tracking-tight">
              {lowStockProducts.length + outOfStockProducts.length}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-amber-700 font-medium truncate">
              {lowStockProducts.length + outOfStockProducts.length > 0 ? (
                <span className="text-amber-800 font-semibold">
                  {lowStockProducts.length} low, {outOfStockProducts.length} out
                </span>
              ) : (
                <span>Stock levels healthy</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MAIN MENU SECTION WITH PERMISSION-FILTERED BUTTONS     */}
      {/* ======================================================== */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Main Menu</h2>
          <span className="text-xs text-slate-400 font-medium">Module Shortcuts</span>
        </div>

        {/* Dynamic Grid Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* 1. New Sale (POS) */}
          {(canCreateSale || canViewSales) && (
            <button
              type="button"
              id="menu-btn-pos"
              onClick={() => onNavigate('pos')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">
                New Sale (POS)
              </span>
            </button>
          )}

          {/* 2. Products */}
          {canViewProducts && (
            <button
              type="button"
              id="menu-btn-products"
              onClick={() => onNavigate('products')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition flex items-center justify-center">
                <Package className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition">
                Products
              </span>
            </button>
          )}

          {/* 3. Inventory */}
          {(canViewProducts || canAdjustStock) && (
            <button
              type="button"
              id="menu-btn-inventory"
              onClick={() => onNavigate('inventory')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-amber-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition flex items-center justify-center">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-amber-700 transition">
                Inventory
              </span>
            </button>
          )}

          {/* 4. Sales History */}
          {canViewSales && (
            <button
              type="button"
              id="menu-btn-sales-history"
              onClick={() => onNavigate('transactions')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition flex items-center justify-center">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition">
                Sales History
              </span>
            </button>
          )}

          {/* 5. Reports */}
          {canViewReports && (
            <button
              type="button"
              id="menu-btn-reports"
              onClick={() => onNavigate('reports')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-cyan-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition flex items-center justify-center">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-cyan-700 transition">
                Reports
              </span>
            </button>
          )}

          {/* 6. Settings */}
          {canViewSettings && (
            <button
              type="button"
              id="menu-btn-settings"
              onClick={() => onNavigate('settings')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition flex items-center justify-center">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition">
                Settings
              </span>
            </button>
          )}

          {/* 7. Customers */}
          {(canViewCustomers || canViewCredit) && (
            <button
              type="button"
              id="menu-btn-customers"
              onClick={() => onNavigate('customers')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-purple-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition flex items-center justify-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-purple-700 transition">
                Customers
              </span>
            </button>
          )}

          {/* 8. Suppliers */}
          {(isStoreOwner || hasPermission('products.create') || hasPermission('products.edit')) && (
            <button
              type="button"
              id="menu-btn-suppliers"
              onClick={() => onNavigate('suppliers')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-orange-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition flex items-center justify-center">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-orange-700 transition">
                Suppliers
              </span>
            </button>
          )}

          {/* 9. Staff */}
          {canViewStaff && (
            <button
              type="button"
              id="menu-btn-staff"
              onClick={() => onNavigate('staff')}
              className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-rose-400 hover:shadow-md transition text-center flex flex-col items-center justify-center gap-2 group active:scale-95 cursor-pointer"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-rose-700 transition">
                Staff
              </span>
            </button>
          )}
        </div>

        {/* Finish this section with wide buttons for "Subscription" */}
        <div className="pt-1 sm:pt-2">
          <button
            type="button"
            id="btn-menu-subscription"
            onClick={() => setSubscriptionModalOpen(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md hover:shadow-lg border border-slate-800 hover:border-indigo-500/50 transition flex items-center justify-between group text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <Crown className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-white tracking-tight">Subscription</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active Pro
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                  StockWise Pro Business • Unlimited Products, Multi-Terminal POS & Sync
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-indigo-300 group-hover:text-white transition pl-2">
              <span className="text-xs font-semibold hidden sm:inline">Manage Plan</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. RECENT COMPLETED SALES TABLE                          */}
      {/* ======================================================== */}
      <div className="pt-2">
        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">Recent Completed Sales</h4>
              <p className="text-xs text-slate-500">Live database transactions</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Receipt / ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No sales recorded yet. Click &quot;POS Sale&quot; to make your first transaction!
                    </td>
                  </tr>
                ) : (
                  sales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-900 font-mono">
                        #{sale.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-800">
                        {sale.customer_name || <span className="text-slate-400">Walk-in Customer</span>}
                      </td>
                      <td className="px-5 py-3.5 capitalize">
                        <span className="px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                          {sale.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(sale.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        {formatCurrency(sale.total_amount, currency)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => onViewSaleDetail ? onViewSaleDetail(sale) : onNavigate('transactions')}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition"
                        >
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. SUBSCRIPTION MODAL DIALOG                             */}
      {/* ======================================================== */}
      {subscriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shadow-md">
                  <Crown className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">StockWise Subscription</h3>
                  <p className="text-xs text-indigo-200">Active Business Plan & Features</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubscriptionModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {subscriptionFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{subscriptionFeedback}</span>
                </div>
              )}

              {/* Current Active Plan Status */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Current Plan</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">StockWise Pro Business</div>
                  <div className="text-xs text-slate-500 mt-0.5">Renews automatically • Unlimited stores & staff</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                  Active
                </span>
              </div>

              {/* Plan Options Selector */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Subscription Tier
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setSubscriptionPlan('pro')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      subscriptionPlan === 'pro'
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">Pro Tier</span>
                        {subscriptionPlan === 'pro' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="text-xl font-black text-slate-900 mt-1">$29<span className="text-xs font-normal text-slate-500">/mo</span></div>
                      <p className="text-[11px] text-slate-500 mt-1">For single & dual retail shops</p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSubscriptionPlan('enterprise')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      subscriptionPlan === 'enterprise'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">Enterprise</span>
                        {subscriptionPlan === 'enterprise' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div className="text-xl font-black text-slate-900 mt-1">$79<span className="text-xs font-normal text-slate-500">/mo</span></div>
                      <p className="text-[11px] text-slate-500 mt-1">Multi-store chain & API sync</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Included Features Checklist */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 mb-1">Included with your subscription:</div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Cloud PostgreSQL Database & Real-Time Cross Device Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Unlimited POS Sales, Items, & Thermal Receipt Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Multi-User Staff Permissions (Owner, Manager, Cashier)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Low Stock & Out of Stock Automatic Alerts</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSubscriptionModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubscriptionFeedback(`Your ${subscriptionPlan === 'enterprise' ? 'Enterprise' : 'Pro'} Plan subscription is active and verified!`);
                  setTimeout(() => setSubscriptionFeedback(null), 3500);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
              >
                Save Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
