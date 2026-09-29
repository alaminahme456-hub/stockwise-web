import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { updateStoreSettings } from '../lib/db';
import { StoreSetupProgress } from './StoreSetupProgress';
import { ActionableInsights } from './ActionableInsights';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Users, 
  Receipt, 
  ArrowRight, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Truck, 
  ShieldCheck, 
  Crown, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  Store as StoreIcon, 
  Building2, 
  Clock, 
  Lock,
  Layers,
  Sparkles,
  Target,
  Edit2,
  Check,
  CreditCard,
  Plus
} from 'lucide-react';
import { DateRangeFilter, NavigationTab, Sale } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab, customerId?: string) => void;
  onViewSaleDetail?: (sale: Sale) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onViewSaleDetail }) => {
  const { 
    currentStore, 
    sales, 
    products, 
    customers, 
    expenses, 
    customerPayments, 
    settings,
    refreshStoreData, 
    hasPermission,
    isStoreOwner
  } = useStore();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const canViewRevenue = isStoreOwner || hasPermission('financials.view_revenue');
  const canViewProfit = isStoreOwner || hasPermission('financials.view_profit');
  const canViewExpenses = isStoreOwner || hasPermission('financials.view_expenses');
  const canViewReports = isStoreOwner || hasPermission('reports.view');
  const canViewStaff = isStoreOwner || hasPermission('staff.view');
  const canViewSettings = isStoreOwner || hasPermission('settings.view');
  const canViewCredit = isStoreOwner || hasPermission('credit.view');
  const canViewCustomers = isStoreOwner || hasPermission('customers.view');
  const canViewProducts = isStoreOwner || hasPermission('products.view');
  const canAdjustStock = isStoreOwner || hasPermission('products.adjust_stock');
  const canCreateSale = isStoreOwner || hasPermission('sales.create');
  const canViewSales = isStoreOwner || hasPermission('sales.view');

  const [dateRange, setDateRange] = useState<DateRangeFilter>('month');
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  
  // Sales Target Configuration (Principle 3: Make business progress visible)
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetInput, setTargetInput] = useState(() => (settings?.daily_sales_target ? String(settings.daily_sales_target) : ''));
  const [savingTarget, setSavingTarget] = useState(false);

  // Time-of-day greeting (Principle 5 & 16: Endowment & Personalization)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Store Owner';

  // Filter items by selected date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      const saleDate = new Date(s.created_at);
      if (dateRange === 'today') {
        return (
          saleDate.getDate() === now.getDate() &&
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      } else if (dateRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return saleDate >= oneWeekAgo;
      } else if (dateRange === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return saleDate >= oneMonthAgo;
      }
      return true;
    });
  }, [sales, dateRange]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      const expDate = new Date(e.expense_date);
      if (dateRange === 'today') {
        return (
          expDate.getDate() === now.getDate() &&
          expDate.getMonth() === now.getMonth() &&
          expDate.getFullYear() === now.getFullYear()
        );
      } else if (dateRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return expDate >= oneWeekAgo;
      } else if (dateRange === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return expDate >= oneMonthAgo;
      }
      return true;
    });
  }, [expenses, dateRange]);

  // Today's specific sales & metrics
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter((s) => new Date(s.created_at).toDateString() === today);
  }, [sales]);

  const todaySalesAmount = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [todaySales]);

  const todaySalesCount = todaySales.length;

  // Yesterday's specific sales (Contrast / Anchoring - Principle 7)
  const yesterdaySales = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    return sales.filter((s) => new Date(s.created_at).toDateString() === yesterdayStr);
  }, [sales]);

  const yesterdaySalesAmount = useMemo(() => {
    return yesterdaySales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [yesterdaySales]);

  const salesDiff = todaySalesAmount - yesterdaySalesAmount;
  const salesDiffPercent = yesterdaySalesAmount > 0 
    ? Math.round(((todaySalesAmount - yesterdaySalesAmount) / yesterdaySalesAmount) * 100) 
    : null;

  // Today's Sales Target calculation (Principle 3)
  const configuredTarget = settings?.daily_sales_target ? Number(settings.daily_sales_target) : null;
  const targetProgressPercent = configuredTarget && configuredTarget > 0 
    ? Math.min(100, Math.round((todaySalesAmount / configuredTarget) * 100))
    : null;

  // Total sales amount (all time in current store)
  const totalSalesAmount = useMemo(() => {
    return sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [sales]);

  // Total cost of goods sold in selected range
  const totalCogs = useMemo(() => {
    let cogs = 0;
    filteredSales.forEach((s) => {
      if (s.items) {
        s.items.forEach((item) => {
          cogs += Number(item.cost_price || 0) * Number(item.quantity);
        });
      }
    });
    return cogs;
  }, [filteredSales]);

  // Total expenses in selected range
  const totalExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  // Estimated Net Profit
  const estimatedProfit = useMemo(() => {
    const periodSales = filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    return periodSales - totalCogs - totalExpensesAmount;
  }, [filteredSales, totalCogs, totalExpensesAmount]);

  // Customer Credit Overview (Principle 13)
  const creditOverview = useMemo(() => {
    const creditSales = sales.filter((s) => s.payment_method === 'credit');
    const totalCreditIssued = creditSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const totalRepaymentsReceived = customerPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalOutstandingCredit = Math.max(0, Math.round((totalCreditIssued - totalRepaymentsReceived) * 100) / 100);

    const debtors: {
      customerId: string;
      customerName: string;
      phone?: string | null;
      creditTaken: number;
      repaid: number;
      outstandingBalance: number;
    }[] = [];

    customers.forEach((c) => {
      const custSales = creditSales.filter((s) => s.customer_id === c.id);
      const custPayments = customerPayments.filter((p) => p.customer_id === c.id);
      const creditTaken = custSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const repaid = custPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const balance = Math.max(0, Math.round((creditTaken - repaid) * 100) / 100);

      if (balance > 0) {
        debtors.push({
          customerId: c.id,
          customerName: c.name,
          phone: c.phone,
          creditTaken,
          repaid,
          outstandingBalance: balance,
        });
      }
    });

    debtors.sort((a, b) => b.outstandingBalance - a.outstandingBalance);

    interface CreditTx {
      id: string;
      date: string;
      type: 'credit_sale' | 'repayment';
      customerName: string;
      customerId?: string | null;
      amount: number;
      reference: string;
      notes?: string | null;
    }

    const txs: CreditTx[] = [
      ...creditSales.map((s) => ({
        id: `sale-${s.id}`,
        date: s.created_at,
        type: 'credit_sale' as const,
        customerName: s.customer_name || 'Customer',
        customerId: s.customer_id,
        amount: Number(s.total_amount || 0),
        reference: `#${s.id.slice(0, 8).toUpperCase()}`,
        notes: s.notes,
      })),
      ...customerPayments.map((p) => {
        const matchingCust = customers.find((c) => c.id === p.customer_id);
        return {
          id: `pay-${p.id}`,
          date: p.payment_date || p.created_at,
          type: 'repayment' as const,
          customerName: p.customer_name || matchingCust?.name || 'Customer',
          customerId: p.customer_id,
          amount: Number(p.amount || 0),
          reference: p.reference_id || `#${p.id.slice(0, 8).toUpperCase()}`,
          notes: p.notes,
        };
      }),
    ];

    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalCreditIssued,
      totalRepaymentsReceived,
      totalOutstandingCredit,
      debtorsCount: debtors.length,
      debtors,
      recentCreditTransactions: txs.slice(0, 5),
    };
  }, [sales, customerPayments, customers]);

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

  // Save Target Handler
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;
    const val = parseFloat(targetInput);
    setSavingTarget(true);
    try {
      await updateStoreSettings(currentStore.id, {
        daily_sales_target: !isNaN(val) && val > 0 ? val : null,
      });
      await refreshStoreData();
      showToast('✓ Daily sales target updated successfully!', 'success');
      setTargetModalOpen(false);
    } catch {
      showToast('Could not save target. Please try again.', 'error');
    } finally {
      setSavingTarget(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ======================================================== */}
      {/* 1. PERSONALIZED WORKSPACE HEADER (IKEA EFFECT & IDENTITY)*/}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 text-white p-5 sm:p-7 border border-slate-800 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
              <span>{greeting}, {userName}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 capitalize">{profile?.role || 'Store Administrator'}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {currentStore?.business_name || currentStore?.name || 'StockWise Store'}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 font-medium">
              <span>{currency} Workspace</span>
              <span>·</span>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>

          {/* ONE PROMINENT PRIMARY ACTION: POS SALE (Principle 9) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-overview-pos-sale"
              onClick={() => onNavigate('pos')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition group cursor-pointer active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>New POS Sale</span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. GOAL-GRADIENT STORE SETUP PROGRESS (Principle 2 & 18) */}
      {/* ======================================================== */}
      <StoreSetupProgress onNavigate={onNavigate} />

      {/* ======================================================== */}
      {/* 3. ACTIONABLE BUSINESS INSIGHTS (Reciprocity & Loss Aversion) */}
      {/* ======================================================== */}
      <ActionableInsights onNavigate={onNavigate} />

      {/* ======================================================== */}
      {/* 4. TODAY'S BUSINESS PROGRESS & SALES TARGET (Principle 3 & 7) */}
      {/* ======================================================== */}
      {canViewRevenue && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Today&apos;s Performance</h2>
                <span className="text-xs text-slate-400 font-medium">Real-time daily progress</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Understand how your business is doing right now relative to yesterday and your targets.
              </p>
            </div>

            {/* Target Settings Shortcut */}
            {isStoreOwner && (
              <button
                type="button"
                onClick={() => {
                  setTargetInput(settings?.daily_sales_target ? String(settings.daily_sales_target) : '');
                  setTargetModalOpen(true);
                }}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-slate-600" />
                <span>{configuredTarget ? 'Edit Sales Target' : '+ Set Daily Target'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Today's Sales with Yesterday Contrast (Principle 7) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600">Today&apos;s Sales</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums mt-1">
                  {formatCurrency(todaySalesAmount, currency)}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs">
                <div className="text-slate-500">
                  Compared with: <span className="font-semibold text-slate-800 font-mono">{formatCurrency(yesterdaySalesAmount, currency)} yesterday</span>
                </div>
                <div className="mt-1 font-semibold flex items-center gap-1">
                  {salesDiff > 0 ? (
                    <span className="text-emerald-700 font-mono">
                      +{formatCurrency(salesDiff, currency)} ({salesDiffPercent ? `+${salesDiffPercent}%` : 'Higher'})
                    </span>
                  ) : salesDiff < 0 ? (
                    <span className="text-amber-800 font-mono">
                      -{formatCurrency(Math.abs(salesDiff), currency)} ({salesDiffPercent ? `${salesDiffPercent}%` : 'Lower'})
                    </span>
                  ) : (
                    <span className="text-slate-600">Matching yesterday&apos;s pace</span>
                  )}
                </div>
              </div>
            </div>

            {/* Sales Target Progress Bar (Principle 3: Goal-Gradient) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Daily Sales Target</span>
                  {configuredTarget && (
                    <span className="text-xs font-bold text-blue-700 font-mono">
                      {targetProgressPercent}%
                    </span>
                  )}
                </div>
                {configuredTarget ? (
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums mt-1">
                    {formatCurrency(todaySalesAmount, currency)} <span className="text-sm font-normal text-slate-500">/ {formatCurrency(configuredTarget, currency)}</span>
                  </div>
                ) : (
                  <div className="mt-1">
                    <div className="text-sm font-semibold text-slate-700">No Target Configured</div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Setting an optional daily goal motivates team productivity.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/80">
                {configuredTarget ? (
                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          (targetProgressPercent || 0) >= 100 ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${targetProgressPercent || 0}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>{todaySalesCount} orders recorded</span>
                      <span>
                        {(targetProgressPercent || 0) >= 100 
                          ? '🎉 Target reached!' 
                          : `${formatCurrency(Math.max(0, configuredTarget - todaySalesAmount), currency)} remaining`
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetInput('');
                      setTargetModalOpen(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Set a target for today</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Estimated Net Profit in Range */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600">Estimated Profit (This Month)</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums mt-1">
                  {canViewProfit ? (
                    formatCurrency(estimatedProfit, currency)
                  ) : (
                    <span className="text-slate-400 font-mono text-base">Restricted</span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                <span>Revenue minus product cost &amp; expenses</span>
                <div className="mt-1 flex items-center justify-between text-slate-700 font-medium font-mono">
                  <span>COGS: {formatCurrency(totalCogs, currency)}</span>
                  <span>Exp: {formatCurrency(totalExpensesAmount, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. 2x2 KEY METRIC CARDS WITH CONTEXT (Principles 7 & 27) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4.5">
        {/* Metric 1: Today's Revenue */}
        <div 
          onClick={() => canViewSales && onNavigate('transactions')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs transition flex flex-col justify-between ${
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
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {canViewRevenue ? (
                formatCurrency(todaySalesAmount, currency)
              ) : (
                <span className="text-slate-400 font-mono tracking-widest text-sm flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Restricted</span>
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-slate-500 font-medium">
              <span>{todaySalesCount} {todaySalesCount === 1 ? 'sale' : 'sales'} completed today</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Lifetime Sales */}
        <div 
          onClick={() => canViewSales && onNavigate('transactions')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs transition flex flex-col justify-between ${
            canViewSales ? 'hover:border-blue-300 hover:shadow-sm cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">Total Lifetime Sales</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
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

        {/* Metric 3: Active Products */}
        <div 
          onClick={() => canViewProducts && onNavigate('products')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs transition flex flex-col justify-between ${
            canViewProducts ? 'hover:border-blue-300 hover:shadow-sm cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">Active Products</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
              {totalProductsCount}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-slate-500 font-medium">
              <span>{totalProductsCount - (lowStockProducts.length + outOfStockProducts.length)} in healthy stock</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Low Stock Alert (Loss Aversion with Non-Color Indicator) */}
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
            <div className="text-lg sm:text-2xl font-black text-amber-900 tracking-tight font-mono tabular-nums flex items-center gap-1.5">
              <span>{lowStockProducts.length + outOfStockProducts.length}</span>
              {lowStockProducts.length + outOfStockProducts.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  ⚠ Attention
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] sm:text-xs text-amber-700 font-medium truncate">
              {lowStockProducts.length + outOfStockProducts.length > 0 ? (
                <span>{lowStockProducts.length} low threshold · {outOfStockProducts.length} out of stock</span>
              ) : (
                <span>✓ All inventory levels healthy</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. PRIMARY & SECONDARY QUICK ACTIONS (Principle 9)       */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase tracking-wider text-xs text-slate-500">
            Quick Actions
          </h2>
          <span className="text-xs text-slate-400">One-click workflows</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Action 1: New Sale (Primary) */}
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
          >
            <ShoppingCart className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">New POS Sale</span>
          </button>

          {/* Action 2: Add Product */}
          {canViewProducts && (
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-xs transition flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
            >
              <Package className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Manage Products</span>
            </button>
          )}

          {/* Action 3: Customer Credit & Repayments */}
          {canViewCredit && (
            <button
              type="button"
              onClick={() => onNavigate('customers')}
              className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-xs transition flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
            >
              <CreditCard className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Customer Credit</span>
            </button>
          )}

          {/* Action 4: Reports */}
          {canViewReports && (
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-xs transition flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
            >
              <BarChart3 className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">Business Reports</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7. CUSTOMER CREDIT & DEBT SUMMARY (Principle 13)         */}
      {/* ======================================================== */}
      {canViewCredit && (
        <div className="pt-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Customer Credit &amp; Debt Overview</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Accounts Receivable
                </span>
              </div>
              <p className="text-xs text-slate-500">Live credit sales balance, customer debt recovery, and payment audit</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('customers')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>View Customer Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div 
              onClick={() => onNavigate('customers')}
              className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-xs hover:border-amber-400 transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-amber-900 text-xs font-semibold">
                <span>Outstanding Debt</span>
                <Clock className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 mt-2 font-mono tabular-nums">
                {formatCurrency(creditOverview.totalOutstandingCredit, currency)}
              </div>
              <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                {creditOverview.debtorsCount} active debtor{creditOverview.debtorsCount === 1 ? '' : 's'}
              </div>
            </div>

            <div 
              onClick={() => onNavigate('customers')}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                <span>Debtors Count</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono tabular-nums">
                {creditOverview.debtorsCount}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {creditOverview.debtorsCount === 0 ? 'All accounts clear' : 'Unpaid balances'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 text-xs font-semibold">
                <span>Total Credit Issued</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono tabular-nums">
                {formatCurrency(creditOverview.totalCreditIssued, currency)}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                All-time credit orders
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
                <span>Total Repayments</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-2 font-mono tabular-nums">
                {formatCurrency(creditOverview.totalRepaymentsReceived, currency)}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Recovered funds
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. RECENT SALES ACTIVITY FEED (TRANSPARENCY & CONTEXT)   */}
      {/* ======================================================== */}
      {canViewSales && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Sales Activity</h3>
              <p className="text-xs text-slate-500">Live transaction stream across all store registers</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({sales.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {sales.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">No Sales Recorded Yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ring up your first retail order in the POS to begin generating live business insights and revenue records.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('pos')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Open POS Register
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sales.slice(0, 5).map((s) => (
                <div 
                  key={s.id}
                  onClick={() => onViewSaleDetail ? onViewSaleDetail(s) : onNavigate('transactions')}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {s.customer_name || 'Walk-in Customer'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.payment_method === 'credit'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {s.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(s.created_at)} · #{s.id.slice(0, 8)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-extrabold font-mono tabular-nums text-slate-900 group-hover:text-blue-600 transition">
                      {formatCurrency(s.total_amount, currency)}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      ✓ Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. SALES TARGET MODAL (Principle 3: Goal-Gradient)       */}
      {/* ======================================================== */}
      {targetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Configure Daily Sales Target</h3>
              </div>
              <button
                type="button"
                onClick={() => setTargetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Daily Revenue ({currency})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
                    {currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 250000"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-base font-bold font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave blank or set to 0 to disable daily target tracking.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTargetModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingTarget ? 'Saving...' : 'Save Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
