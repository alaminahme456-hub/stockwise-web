import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  XCircle, 
  Users, 
  Receipt, 
  CreditCard, 
  ArrowUpRight, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DateRangeFilter, NavigationTab, Sale } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onViewSaleDetail?: (sale: Sale) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onViewSaleDetail }) => {
  const { currentStore, sales, products, customers, expenses, loadingData } = useStore();
  const [dateRange, setDateRange] = useState<DateRangeFilter>('month');

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
      return true; // 'all'
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

  // Today's specific sales
  const todaySalesAmount = useMemo(() => {
    const today = new Date().toDateString();
    return sales
      .filter((s) => new Date(s.created_at).toDateString() === today)
      .reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [sales]);

  // Total sales in selected range
  const totalSalesAmount = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [filteredSales]);

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
  const estimatedProfit = totalSalesAmount - totalCogs - totalExpensesAmount;

  // Inventory stats
  const totalProductsCount = products.length;
  const lowStockProducts = products.filter(
    (p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.min_stock_level)
  );
  const outOfStockProducts = products.filter((p) => Number(p.current_stock) <= 0);
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + Number(p.cost_price) * Number(p.current_stock),
    0
  );

  // Daily sales for mini chart (last 7 days)
  const last7DaysData = useMemo(() => {
    const days: { label: string; dateStr: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const daySales = sales
        .filter((s) => s.created_at.startsWith(dateStr))
        .reduce((sum, s) => sum + Number(s.total_amount), 0);

      days.push({ label, dateStr, amount: daySales });
    }
    return days;
  }, [sales]);

  const maxDaySale = Math.max(...last7DaysData.map((d) => d.amount), 10);

  const currency = currentStore?.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Overview</h1>
          <p className="text-sm text-slate-500">
            Real-time performance metrics for <span className="font-semibold text-slate-700">{currentStore?.name}</span>
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          {(['today', 'week', 'month', 'all'] as DateRangeFilter[]).map((period) => (
            <button
              key={period}
              type="button"
              id={`filter-${period}`}
              onClick={() => setDateRange(period)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                dateRange === period
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {period === 'all' ? 'All Time' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalSalesAmount, currency)}
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <span className="text-slate-700 font-medium">{filteredSales.length}</span> transactions in period
            </div>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(todaySalesAmount, currency)}
            </div>
            <div className="mt-1 text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <span>Live day register</span>
            </div>
          </div>
        </div>

        {/* Estimated Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Profit</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              estimatedProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
            }`}>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${estimatedProfit >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              {formatCurrency(estimatedProfit, currency)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Rev - COGS ({formatCurrency(totalCogs, currency)}) - Exp
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalExpensesAmount, currency)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              <span className="text-slate-700 font-medium">{filteredExpenses.length}</span> recorded costs
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Products & Stock Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Total Products</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalProductsCount} items</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock Items */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 flex items-center justify-between cursor-pointer hover:bg-amber-50 transition"
        >
          <div>
            <div className="text-xs font-medium text-amber-800">Low Stock Alert</div>
            <div className="text-xl font-bold text-amber-900 mt-1">{lowStockProducts.length} items</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Out of Stock */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/30 flex items-center justify-between cursor-pointer hover:bg-red-50 transition"
        >
          <div>
            <div className="text-xs font-medium text-red-800">Out of Stock</div>
            <div className="text-xl font-bold text-red-900 mt-1">{outOfStockProducts.length} items</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Customers */}
        <div 
          onClick={() => onNavigate('customers')}
          className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
        >
          <div>
            <div className="text-xs font-medium text-slate-500">Total Customers</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{customers.length} clients</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: 7-Day Sales Trend & Inventory Valuation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">7-Day Sales Velocity</h2>
              <p className="text-xs text-slate-500">Daily revenue captured across store registers</p>
            </div>
            <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              Past 7 Days
            </div>
          </div>

          {/* Bar Visualization */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-100">
            {last7DaysData.map((d, index) => {
              const heightPercent = Math.max(8, Math.round((d.amount / maxDaySale) * 100));
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[11px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition truncate">
                    {formatCurrency(d.amount, currency)}
                  </div>
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                    <div 
                      className="w-full bg-blue-600 group-hover:bg-blue-500 transition-all rounded-t-lg"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 mt-1">{d.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
            <span>Total 7-Day Revenue: <strong className="text-slate-800">{formatCurrency(last7DaysData.reduce((s, d) => s + d.amount, 0), currency)}</strong></span>
            <button 
              type="button" 
              onClick={() => onNavigate('pos')}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Open POS Register <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inventory Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Inventory Status</h2>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-500">Stock Valuation (at cost)</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">
                  {formatCurrency(totalInventoryValue, currency)}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> In Stock
                  </span>
                  <span className="font-semibold text-slate-800">
                    {products.filter((p) => Number(p.current_stock) > Number(p.min_stock_level)).length}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Low Stock
                  </span>
                  <span className="font-semibold text-amber-700">{lowStockProducts.length}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Out of Stock
                  </span>
                  <span className="font-semibold text-red-600">{outOfStockProducts.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center justify-center gap-1.5"
            >
              <span>Manage Inventory Adjustments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions / Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Completed Sales</h2>
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
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Receipt / ID</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Date & Time</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No sales recorded yet. Head over to the POS register to make your first sale!
                  </td>
                </tr>
              ) : (
                sales.slice(0, 6).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-medium text-slate-900 font-mono text-xs">
                      #{sale.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-800">
                      {sale.customer_name || <span className="text-slate-400">Walk-in Customer</span>}
                    </td>
                    <td className="px-5 py-3.5 capitalize">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {sale.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                      {formatCurrency(sale.total_amount, currency)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onViewSaleDetail ? onViewSaleDetail(sale) : onNavigate('transactions')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition"
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
  );
};
