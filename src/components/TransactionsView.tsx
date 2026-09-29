import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { PaymentMethod, Sale } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { ExpandableSearch } from './ExpandableSearch';
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

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Ledger Total:</span>
            <span className="text-sm sm:text-base font-bold text-slate-900">{formatCurrency(totalRevenue, currency)}</span>
          </div>

          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by receipt ID, customer, cashier..."
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {searchQuery && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl">
              <span>Searching: "{searchQuery}" ({filteredSales.length} records)</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="hover:text-blue-900 cursor-pointer ml-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredSales.length} of {sales.length} transactions
          </span>
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
            <option value="credit">Credit (Pay Later)</option>
            <option value="mixed">Mixed Payment</option>
          </select>
        </div>
      </div>

      {/* Transactions List (Replaced horizontal scrolling table with clickable list items) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="px-5 py-16 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No transactions recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">Processed register sales will appear here.</p>
          </div>
        ) : (
          filteredSales.map((sale) => {
            const itemsCount = (sale.items || []).reduce((acc, item) => acc + Number(item.quantity), 0);
            const totalCount = itemsCount > 0 ? itemsCount : (sale.items?.length || 1);

            return (
              <div
                key={sale.id}
                onClick={() => {
                  if (onViewSaleDetail) onViewSaleDetail(sale);
                  else setViewingSale(sale);
                }}
                className="p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left: Transaction Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition text-sm sm:text-base">
                      #{sale.id.slice(0, 8)}
                    </h3>
                    <span className="font-semibold text-slate-800 text-sm">
                      {sale.customer_name || 'Walk-in Customer'}
                    </span>
                    {sale.payment_method === 'credit' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Credit (Pay Later)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-700">
                        {sale.payment_method.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {/* Unboxed Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>{formatDate(sale.created_at)}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span>Staff: <strong className="text-slate-700">{sale.staff_name || 'Cashier'}</strong></span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span>{totalCount} {totalCount === 1 ? 'item' : 'items'}</span>
                    {sale.payment_method === 'credit' && sale.amount_paid !== undefined && sale.amount_paid > 0 && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-emerald-700 font-medium">Upfront: {formatCurrency(sale.amount_paid, currency)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Action */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="font-bold text-slate-900 font-mono text-base sm:text-lg">
                      {formatCurrency(sale.total_amount, currency)}
                    </div>
                    <div className={`text-[11px] font-medium ${sale.payment_method === 'credit' ? 'text-amber-700' : 'text-emerald-600'}`}>
                      {sale.payment_method === 'credit' ? 'Credit Sale' : 'Completed'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewSaleDetail) onViewSaleDetail(sale);
                      else setViewingSale(sale);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="View Receipt"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
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
                  <span>{viewingSale.payment_method === 'credit' ? 'TOTAL SALE:' : 'TOTAL PAID:'}</span>
                  <span className="text-blue-600">{formatCurrency(viewingSale.total_amount, currency)}</span>
                </div>
                {viewingSale.payment_method === 'credit' && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Upfront Paid at Checkout:</span>
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(viewingSale.amount_paid || 0, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-950 pt-1 border-t border-amber-200/60">
                      <span>Outstanding Debt Added to Account:</span>
                      <span className="font-mono text-amber-900">
                        {formatCurrency(viewingSale.balance_due ?? Math.max(0, viewingSale.total_amount - (viewingSale.amount_paid || 0)), currency)}
                      </span>
                    </div>
                    {viewingSale.due_date && (
                      <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>Promised Repayment Date:</span>
                        <span>{formatDate(viewingSale.due_date)}</span>
                      </div>
                    )}
                  </div>
                )}
                {viewingSale.payment_method === 'cash' && viewingSale.amount_tendered !== undefined && (
                  <>
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-dashed border-slate-200">
                      <span>Cash Tendered:</span>
                      <span>{formatCurrency(viewingSale.amount_tendered, currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Change Returned:</span>
                      <span>{formatCurrency(viewingSale.change_due || 0, currency)}</span>
                    </div>
                  </>
                )}
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
