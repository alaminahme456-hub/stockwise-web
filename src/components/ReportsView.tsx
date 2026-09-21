import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon,
  PackageCheck,
  AlertTriangle,
  Download
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { currentStore, sales, expenses, products } = useStore();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const currency = currentStore?.currency || 'USD';

  // Filter sales and expenses by time range
  const { filteredSales, filteredExpenses } = useMemo(() => {
    const now = new Date();
    let cutoff = new Date();

    if (timeRange === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (timeRange === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      cutoff.setDate(now.getDate() - 30);
    } else {
      cutoff = new Date(0); // All time
    }

    const s = sales.filter((item) => new Date(item.created_at) >= cutoff);
    const e = expenses.filter((item) => new Date(item.expense_date || item.date || item.created_at) >= cutoff);

    return { filteredSales: s, filteredExpenses: e };
  }, [sales, expenses, timeRange]);

  // Financial calculations
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [filteredSales]);

  // Estimated Cost of Goods Sold (COGS)
  const totalCOGS = useMemo(() => {
    let cogs = 0;
    filteredSales.forEach((s) => {
      (s.items || []).forEach((it) => {
        const itemCost = Number(it.cost_price || 0);
        cogs += itemCost * Number(it.quantity || 1);
      });
    });
    // If items had 0 cost price fallback estimate (approx 60% of sale)
    if (cogs === 0 && totalRevenue > 0) {
      cogs = totalRevenue * 0.55;
    }
    return cogs;
  }, [filteredSales, totalRevenue]);

  const grossProfit = totalRevenue - totalCOGS;

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Sales by payment method
  const salesByPayment = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSales.forEach((s) => {
      counts[s.payment_method] = (counts[s.payment_method] || 0) + Number(s.total_amount);
    });
    const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b'];
    return Object.entries(counts).map(([name, value], i) => ({
      name: name.replace('_', ' ').toUpperCase(),
      value,
      color: colors[i % colors.length],
    }));
  }, [filteredSales]);

  // Top selling products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {};
    filteredSales.forEach((s) => {
      (s.items || []).forEach((it) => {
        const prodKey = it.product_id || it.sku || it.product_name;
        if (!map[prodKey]) {
          map[prodKey] = { name: it.product_name, sku: it.sku, qty: 0, revenue: 0 };
        }
        map[prodKey].qty += Number(it.quantity);
        map[prodKey].revenue += Number(it.subtotal);
      });
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  // Daily revenue trend chart data
  const revenueTrend = useMemo(() => {
    const daysMap: Record<string, number> = {};
    // Last 7 days bucket
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      daysMap[key] = 0;
    }
    filteredSales.forEach((s) => {
      const day = s.created_at.split('T')[0];
      if (daysMap[day] !== undefined) {
        daysMap[day] += Number(s.total_amount);
      }
    });

    return Object.entries(daysMap).map(([date, amount]) => {
      const d = new Date(date);
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
      return { date: label, revenue: amount };
    });
  }, [filteredSales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Reports & Analytics</h1>
          <p className="text-sm text-slate-500">
            Real-time financial performance, profitability, and operational metrics
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          {(['today', 'week', 'month', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                timeRange === r
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r === 'today' ? 'Today' : r === 'week' ? 'Past 7 Days' : r === 'month' ? 'Past 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards: Revenue, COGS, Gross Profit, Operating Expenses, Net Profit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Revenue</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(totalRevenue, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {filteredSales.length} completed transactions
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(grossProfit, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            COGS: {formatCurrency(totalCOGS, currency)}
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Operating Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2">
            {formatCurrency(totalExpenses, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {filteredExpenses.length} recorded line items
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Net Profit</span>
            <ArrowUpRight className={`w-4 h-4 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Margin: {netMargin.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Trend Area Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Revenue Timeline</h3>
            <span className="text-xs text-slate-400">Daily breakdown</span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val, currency), 'Revenue']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="font-bold text-slate-900 text-base mb-2">Payment Channels</h3>
          
          {salesByPayment.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No sales data in this period
            </div>
          ) : (
            <>
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesByPayment}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {salesByPayment.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(val, currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {salesByPayment.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Selling Products List */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-base mb-4">Best Performing Products</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5 text-right">Units Sold</th>
                <th className="px-4 py-2.5 text-right">Gross Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                    No sales recorded for this range
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{p.qty}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(p.revenue, currency)}
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
