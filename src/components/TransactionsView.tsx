import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { PaymentMethod, Sale } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  Receipt, 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  X, 
  ArrowUpDown, 
  Calendar,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const TransactionsView: React.FC<{ onViewSaleDetail?: (s: Sale) => void }> = ({ onViewSaleDetail }) => {
  const { currentStore, sales, settings } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  const currency = currentStore?.currency || 'USD';

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        s.id.toLowerCase().includes(q) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.staff_name && s.staff_name.toLowerCase().includes(q));

      const matchesMethod = selectedMethod === 'all' || s.payment_method === selectedMethod;

      return matchesSearch && matchesMethod;
    });
  }, [sales, searchQuery, selectedMethod]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  }, [filteredSales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaction Ledger</h1>
          <p className="text-sm text-slate-500">
            Audit history of completed point-of-sale register orders
          </p>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="text-xs text-slate-500">Ledger Total:</div>
          <div className="text-lg font-bold text-slate-900">{formatCurrency(totalRevenue, currency)}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by receipt ID, customer name, or cashier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="pos">POS Terminal</option>
            <option value="mixed">Mixed Payment</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Receipt / ID</th>
                <th className="px-5 py-3">Date & Time</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Payment Method</th>
                <th className="px-5 py-3">Cashier / Staff</th>
                <th className="px-5 py-3 text-right">Items Count</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No transactions recorded yet</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const itemsCount = (sale.items || []).reduce((acc, item) => acc + Number(item.quantity), 0);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-900">
                        #{sale.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(sale.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-900 font-medium">
                        {sale.customer_name || <span className="text-slate-400">Walk-in</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-700">
                          {sale.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {sale.staff_name || 'Staff'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-800">
                        {itemsCount > 0 ? itemsCount : (sale.items?.length || 1)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(sale.total_amount, currency)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewSaleDetail) onViewSaleDetail(sale);
                            else setViewingSale(sale);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Transaction Breakdown</h3>
                <p className="font-mono text-xs text-slate-500">Receipt #{viewingSale.id.slice(0, 8)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date:</span>
                <span className="font-medium text-slate-900">{formatDate(viewingSale.created_at)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium text-slate-900">{viewingSale.customer_name || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment:</span>
                <span className="font-medium capitalize text-slate-900">{viewingSale.payment_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Processed by:</span>
                <span className="font-medium text-slate-900">{viewingSale.staff_name || 'Cashier'}</span>
              </div>

              {/* Line items */}
              <div className="pt-2">
                <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-1">Items Purchased:</span>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                  {(viewingSale.items || []).length === 0 ? (
                    <div className="text-slate-400 italic">No line items recorded</div>
                  ) : (
                    (viewingSale.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}x {item.product_name} <span className="text-slate-400">({item.sku})</span>
                        </span>
                        <span className="font-semibold">{formatCurrency(item.subtotal, currency)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 space-y-1 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(viewingSale.subtotal, currency)}</span>
                </div>
                {Number(viewingSale.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(viewingSale.discount || 0, currency)}</span>
                  </div>
                )}
                {Number(viewingSale.tax) > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(viewingSale.tax || 0, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Paid:</span>
                  <span className="text-blue-600">{formatCurrency(viewingSale.total_amount, currency)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="py-2 px-4 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
