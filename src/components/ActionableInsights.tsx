import React from 'react';
import { useStore } from '../context/StoreContext';
import { NavigationTab } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  AlertTriangle, 
  Wallet, 
  TrendingUp, 
  ArrowRight, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface ActionableInsightsProps {
  onNavigate: (tab: NavigationTab, customerId?: string) => void;
}

export const ActionableInsights: React.FC<ActionableInsightsProps> = ({ onNavigate }) => {
  const { currentStore, products, sales, customers, customerPayments, hasPermission, isStoreOwner } = useStore();

  const canViewProducts = isStoreOwner || hasPermission('products.view');
  const canViewSales = isStoreOwner || hasPermission('sales.view');
  const canViewCredit = isStoreOwner || hasPermission('credit.view');
  const currency = currentStore?.currency || 'USD';

  // 1. Calculate low stock and out-of-stock count
  const lowStockProducts = products.filter(
    (p) => Number(p.current_stock) > 0 && Number(p.current_stock) <= Number(p.min_stock_level)
  );
  const outOfStockProducts = products.filter((p) => Number(p.current_stock) <= 0);
  const urgentInventoryCount = lowStockProducts.length + outOfStockProducts.length;

  // 2. Calculate customer credit outstanding
  const creditSales = sales.filter((s) => s.payment_method === 'credit');
  const totalCreditIssued = creditSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalRepayments = customerPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalOutstanding = Math.max(0, Math.round((totalCreditIssued - totalRepayments) * 100) / 100);

  // Debtors count
  const debtorsCount = customers.filter((c) => {
    const custCredit = creditSales.filter((s) => s.customer_id === c.id).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const custRepaid = customerPayments.filter((p) => p.customer_id === c.id).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return (custCredit - custRepaid) > 0;
  }).length;

  // 3. Today's vs Yesterday's Sales
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const todaySales = sales.filter((s) => new Date(s.created_at).toDateString() === todayStr);
  const yesterdaySales = sales.filter((s) => new Date(s.created_at).toDateString() === yesterdayStr);

  const todayAmount = todaySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const yesterdayAmount = yesterdaySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

  const salesDiff = todayAmount - yesterdayAmount;

  // Don't render anything if no insights apply
  const hasLowStockInsight = urgentInventoryCount > 0 && canViewProducts;
  const hasCreditInsight = totalOutstanding > 0 && canViewCredit;
  const hasSalesInsight = canViewSales && (todaySales.length > 0 || yesterdaySales.length > 0);

  if (!hasLowStockInsight && !hasCreditInsight && !hasSalesInsight) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Actionable Business Insights</span>
        </h3>
        <span className="text-[11px] text-slate-400">Live operational signals</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Insight 1: Low Stock Risk (Ethical Loss Aversion) */}
        {hasLowStockInsight && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Inventory Alert</span>
              </div>
              <div className="text-sm font-bold text-amber-950 mt-1.5">
                ⚠ {urgentInventoryCount} {urgentInventoryCount === 1 ? 'product is' : 'products are'} running low
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {outOfStockProducts.length > 0 
                  ? `${outOfStockProducts.length} items are sold out and ${lowStockProducts.length} are nearing minimum threshold. Restock to prevent missed sales.`
                  : 'These items are nearing your minimum stock threshold and may run out soon based on current stock.'
                }
              </p>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-amber-200/60 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800">
                {lowStockProducts.length} low · {outOfStockProducts.length} out
              </span>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>Review Low Stock</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Insight 2: Customer Credit Risk */}
        {hasCreditInsight && (
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                <Wallet className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Customer Credit</span>
              </div>
              <div className="text-sm font-bold text-rose-950 mt-1.5">
                {formatCurrency(totalOutstanding, currency)} outstanding
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {debtorsCount} {debtorsCount === 1 ? 'customer currently has an' : 'customers currently have'} unpaid debt balance. Record payments to maintain healthy cash flow.
              </p>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-rose-200/60 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-800">
                {debtorsCount} active debtor{debtorsCount === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => onNavigate('customers')}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>Review Credit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Insight 3: Sales Momentum / Daily Comparison */}
        {hasSalesInsight && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Today&apos;s Momentum</span>
              </div>
              <div className="text-sm font-bold text-emerald-950 mt-1.5">
                {salesDiff > 0 ? (
                  `+${formatCurrency(salesDiff, currency)} higher than yesterday`
                ) : salesDiff < 0 ? (
                  `${formatCurrency(todayAmount, currency)} recorded today`
                ) : (
                  `${formatCurrency(todayAmount, currency)} matching yesterday`
                )}
              </div>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                {salesDiff > 0
                  ? `Your store is outperforming yesterday by ${formatCurrency(salesDiff, currency)}. Great momentum!`
                  : yesterdayAmount > 0
                  ? `Yesterday closed with ${formatCurrency(yesterdayAmount, currency)} across ${yesterdaySales.length} orders.`
                  : 'Start your business day by ringing up sales through the POS register.'}
              </p>
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800">
                {todaySales.length} sale{todaySales.length === 1 ? '' : 's'} today
              </span>
              <button
                type="button"
                onClick={() => onNavigate('pos')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <span>Open POS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
