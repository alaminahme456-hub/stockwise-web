import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Customer, Sale, CustomerPayment, CustomerLedgerEntry } from '../types';
import { createCustomer, updateCustomer, deleteCustomer, calculateCustomerCreditLedger } from '../lib/db';
import { formatCurrency, formatDate } from '../lib/utils';
import { ExpandableSearch } from './ExpandableSearch';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Receipt, 
  X,
  ShoppingBag,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Calendar,
  Filter,
  Check,
  CreditCard,
  RotateCcw,
  Wallet
} from 'lucide-react';

interface CustomersViewProps {
  initialCustomerId?: string | null;
  onClearInitialCustomer?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ 
  initialCustomerId, 
  onClearInitialCustomer 
}) => {
  const { 
    currentStore, 
    customers, 
    sales, 
    customerPayments, 
    recordCustomerPayment, 
    deleteCustomerPayment,
    refreshStoreData 
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'debt' | 'paid'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Repayment Modal State
  const [repaymentModalCustomer, setRepaymentModalCustomer] = useState<Customer | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentMethod, setRepaymentMethod] = useState<'cash' | 'bank_transfer' | 'pos' | 'card' | 'other'>('cash');
  const [repaymentDate, setRepaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [repaymentRef, setRepaymentRef] = useState('');
  const [repaymentNotes, setRepaymentNotes] = useState('');
  const [repaymentLoading, setRepaymentLoading] = useState(false);
  const [repaymentError, setRepaymentError] = useState<string | null>(null);
  const [repaymentSuccess, setRepaymentSuccess] = useState<string | null>(null);

  // Profile View Sub-Tab
  const [profileTab, setProfileTab] = useState<'ledger' | 'orders'>('ledger');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currency = currentStore?.currency || 'USD';

  // Open initial customer if provided via props
  useEffect(() => {
    if (initialCustomerId && customers.length > 0) {
      const match = customers.find((c) => c.id === initialCustomerId);
      if (match) {
        setViewingCustomer(match);
      }
      if (onClearInitialCustomer) {
        onClearInitialCustomer();
      }
    }
  }, [initialCustomerId, customers, onClearInitialCustomer]);

  // Compute comprehensive credit ledger & stats per customer
  const customerLedgers = useMemo(() => {
    const data: Record<string, ReturnType<typeof calculateCustomerCreditLedger>> = {};
    customers.forEach((c) => {
      data[c.id] = calculateCustomerCreditLedger(c.id, sales, customerPayments);
    });
    return data;
  }, [customers, sales, customerPayments]);

  // High-level aggregate metrics for the customer directory
  const directoryMetrics = useMemo(() => {
    let totalOutstanding = 0;
    let customersWithDebtCount = 0;
    let totalCreditIssued = 0;
    let totalRepayments = 0;

    Object.values(customerLedgers).forEach((stat) => {
      totalCreditIssued += stat.totalCreditTaken;
      totalRepayments += stat.totalRepaid;
      if (stat.outstandingBalance > 0) {
        totalOutstanding += stat.outstandingBalance;
        customersWithDebtCount++;
      }
    });

    return {
      totalCustomers: customers.length,
      customersWithDebtCount,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalCreditIssued: Math.round(totalCreditIssued * 100) / 100,
      totalRepayments: Math.round(totalRepayments * 100) / 100,
    };
  }, [customers, customerLedgers]);

  // Filter customers by query and debt status
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const stat = customerLedgers[c.id];
      const hasDebt = stat ? stat.outstandingBalance > 0 : false;
      const isSettled = stat ? (stat.totalCreditTaken > 0 && stat.outstandingBalance === 0) : false;

      if (filterTab === 'debt') {
        return hasDebt;
      }
      if (filterTab === 'paid') {
        return !hasDebt;
      }
      return true; // 'all'
    });
  }, [customers, searchQuery, filterTab, customerLedgers]);

  const handleOpenAdd = () => {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
    });
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        setEditingCustomer(null);
      } else {
        await createCustomer(currentStore.id, formData);
        setIsAddModalOpen(false);
      }
      await refreshStoreData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save customer details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await deleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
      if (viewingCustomer?.id === deletingCustomer.id) {
        setViewingCustomer(null);
      }
      await refreshStoreData();
    } catch (err: any) {
      alert(`Could not delete customer: ${err?.message}`);
    }
  };

  // Open Repayment Modal
  const handleOpenRepayment = (c: Customer) => {
    const ledger = customerLedgers[c.id];
    const defaultAmount = ledger?.outstandingBalance ? ledger.outstandingBalance.toString() : '';
    setRepaymentModalCustomer(c);
    setRepaymentAmount(defaultAmount);
    setRepaymentMethod('cash');
    setRepaymentDate(new Date().toISOString().split('T')[0]);
    setRepaymentRef(`REP-${Date.now().toString().slice(-6)}`);
    setRepaymentNotes('');
    setRepaymentError(null);
    setRepaymentSuccess(null);
  };

  // Submit Repayment
  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentModalCustomer || !currentStore) return;

    const amt = parseFloat(repaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setRepaymentError('Please enter a valid repayment amount greater than 0.');
      return;
    }

    setRepaymentLoading(true);
    setRepaymentError(null);

    try {
      await recordCustomerPayment({
        store_id: currentStore.id,
        customer_id: repaymentModalCustomer.id,
        customer_name: repaymentModalCustomer.name,
        amount: amt,
        payment_method: repaymentMethod,
        payment_date: new Date(repaymentDate).toISOString(),
        reference_id: repaymentRef || `REP-${Date.now().toString().slice(-6)}`,
        notes: repaymentNotes || `Credit repayment recorded on ${repaymentDate}`,
      });

      setRepaymentSuccess(`Successfully recorded payment of ${formatCurrency(amt, currency)}.`);
      setTimeout(() => {
        setRepaymentModalCustomer(null);
        setRepaymentSuccess(null);
      }, 1200);
    } catch (err: any) {
      setRepaymentError(err?.message || 'Failed to record repayment.');
    } finally {
      setRepaymentLoading(false);
    }
  };

  const handleVoidPayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to void this repayment transaction? This will recalculate the customer debt ledger.')) {
      return;
    }
    try {
      await deleteCustomerPayment(paymentId);
    } catch (err: any) {
      alert(`Could not void payment: ${err?.message}`);
    }
  };

  // Active ledger for modal
  const viewingCustomerLedger = viewingCustomer ? customerLedgers[viewingCustomer.id] : null;
  const viewingCustomerSales = viewingCustomer ? sales.filter((s) => s.customer_id === viewingCustomer.id) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Credit &amp; Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Debt Ledger Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Client profiles, accounts receivable ledger, credit sales, and debt recovery tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by customer name, phone, or email..."
          />

          <button
            type="button"
            id="btn-add-customer"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-xs transition shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* High-Level Credit Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Customers</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {directoryMetrics.totalCustomers}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Registered directory profiles
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>Total Outstanding Debt</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 mt-2 font-mono">
            {formatCurrency(directoryMetrics.totalOutstanding, currency)}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
            {directoryMetrics.customersWithDebtCount} {directoryMetrics.customersWithDebtCount === 1 ? 'customer has' : 'customers have'} pending debt
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Credit Issued</span>
            <ArrowUpRight className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatCurrency(directoryMetrics.totalCreditIssued, currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            All-time credit sales value
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <span>Total Repaid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-2 font-mono">
            {formatCurrency(directoryMetrics.totalRepayments, currency)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Collections from customers
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Customers</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterTab === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {customers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('debt')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'debt'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/70'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>With Outstanding Debt</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterTab === 'debt' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'}`}>
              {directoryMetrics.customersWithDebtCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('paid')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero Balance / Settled</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterTab === 'paid' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {customers.length - directoryMetrics.customersWithDebtCount}
            </span>
          </button>
        </div>

        {searchQuery && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl self-start sm:self-auto">
            <span>Query: &quot;{searchQuery}&quot; ({filteredCustomers.length} results)</span>
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
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="px-5 py-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No customers match your criteria</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterTab === 'debt' 
                ? 'Great news! No customers currently have outstanding credit balances.'
                : 'Try adjusting your search query or add a new customer.'}
            </p>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const stat = customerLedgers[c.id] || { 
              totalSpent: 0, 
              totalOrders: 0, 
              totalCreditTaken: 0, 
              totalRepaid: 0, 
              outstandingBalance: 0 
            };
            const hasDebt = stat.outstandingBalance > 0;
            const hasCreditHistory = stat.totalCreditTaken > 0;

            return (
              <div
                key={c.id}
                onClick={() => setViewingCustomer(c)}
                className={`p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 group ${
                  hasDebt ? 'bg-amber-50/15' : ''
                }`}
              >
                {/* Left: Customer Profile Information */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-xs ${
                    hasDebt 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {c.name ? c.name[0].toUpperCase() : 'C'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm sm:text-base">
                        {c.name}
                      </h3>

                      {/* Outstanding Debt Badge */}
                      {hasDebt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Debt: {formatCurrency(stat.outstandingBalance, currency)}</span>
                        </span>
                      ) : hasCreditHistory ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" />
                          <span>Paid &amp; Settled</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Contact Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      {c.phone && (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </span>
                      )}
                      {c.phone && c.email && <span aria-hidden="true" className="text-slate-300">·</span>}
                      {c.email && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </span>
                      )}
                      {(c.phone || c.email) && c.address && <span aria-hidden="true" className="text-slate-300">·</span>}
                      {c.address && (
                        <span className="truncate max-w-xs text-slate-500">{c.address}</span>
                      )}
                      {!c.phone && !c.email && !c.address && (
                        <span className="text-slate-400">No contact info recorded</span>
                      )}
                    </div>

                    {c.notes && (
                      <p className="text-xs text-slate-400 truncate max-w-md mt-1 italic">&quot;{c.notes}&quot;</p>
                    )}
                  </div>
                </div>

                {/* Right: Credit Ledger Breakdown, Lifetime Spend & Actions */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {/* Credit Breakdown Mini View */}
                  {hasCreditHistory ? (
                    <div className="text-left sm:text-right px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div className="text-[11px] text-slate-500">
                        Credit: <span className="font-semibold text-slate-700">{formatCurrency(stat.totalCreditTaken, currency)}</span>
                        {' '}&bull;{' '}
                        Repaid: <span className="font-semibold text-emerald-700">{formatCurrency(stat.totalRepaid, currency)}</span>
                      </div>
                      <div className="font-bold mt-0.5 font-mono">
                        {hasDebt ? (
                          <span className="text-amber-800">
                            Balance Due: {formatCurrency(stat.outstandingBalance, currency)}
                          </span>
                        ) : (
                          <span className="text-emerald-700">All Balances Paid</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-left sm:text-right">
                      <div className="font-bold text-slate-900 font-mono text-sm sm:text-base">
                        {formatCurrency(stat.totalSpent, currency)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {stat.totalOrders} {stat.totalOrders === 1 ? 'order' : 'orders'} placed
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Direct Record Repayment Button */}
                    {hasDebt && (
                      <button
                        type="button"
                        onClick={() => handleOpenRepayment(c)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                        title="Record full or partial credit repayment"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Record Payment</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setViewingCustomer(c)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                      title="View Customer Profile & Debt Ledger"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ledger</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                      title="Edit Customer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingCustomer(c)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* ADD / EDIT CUSTOMER MODAL                                */}
      {/* ======================================================== */}
      {(isAddModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingCustomer(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Johnathan Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical / Billing Address
                </label>
                <input
                  type="text"
                  placeholder="Street, City, State"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Payment habits, credit terms, authorized contacts..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingCustomer(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RECORD CREDIT REPAYMENT MODAL                            */}
      {/* ======================================================== */}
      {repaymentModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Credit Repayment</h3>
                  <p className="text-xs text-slate-500">Customer: <strong>{repaymentModalCustomer.name}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRepaymentModalCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {repaymentError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{repaymentError}</span>
              </div>
            )}

            {repaymentSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{repaymentSuccess}</span>
              </div>
            )}

            {(() => {
              const currentOutstanding = customerLedgers[repaymentModalCustomer.id]?.outstandingBalance || 0;
              const payNum = parseFloat(repaymentAmount) || 0;
              const newBalance = Math.max(0, Math.round((currentOutstanding - payNum) * 100) / 100);
              const isFullPayment = payNum >= currentOutstanding && currentOutstanding > 0;

              return (
                <form onSubmit={handleSubmitRepayment} className="mt-4 space-y-4">
                  {/* Current Balance Banner */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Current Debt Balance</span>
                      <div className="text-xl font-black text-amber-950 font-mono mt-0.5">
                        {formatCurrency(currentOutstanding, currency)}
                      </div>
                    </div>
                    {currentOutstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => setRepaymentAmount(currentOutstanding.toString())}
                        className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-200 rounded-xl transition cursor-pointer"
                      >
                        Pay Full Balance
                      </button>
                    )}
                  </div>

                  {/* Payment Amount Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Repayment Amount *
                      </label>
                      {repaymentAmount && (
                        <button
                          type="button"
                          onClick={() => setRepaymentAmount('')}
                          className="text-[11px] font-medium text-slate-400 hover:text-red-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        {currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="0.00"
                        value={repaymentAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                            setRepaymentAmount(val);
                          }
                        }}
                        className="w-full pl-10 pr-3.5 py-2.5 text-base font-bold font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Live Remaining Balance Calculation Preview */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Outstanding Balance:</span>
                      <span className="font-semibold">{formatCurrency(currentOutstanding, currency)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Less This Repayment:</span>
                      <span className="font-semibold text-emerald-700">
                        - {formatCurrency(payNum, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 font-bold">
                      <span className="text-slate-800">New Account Balance:</span>
                      <span className={`text-sm font-mono ${newBalance === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {formatCurrency(newBalance, currency)}
                      </span>
                    </div>
                    {isFullPayment && (
                      <div className="pt-1 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Debt will be marked FULLY PAID!</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'cash', label: 'Cash' },
                        { id: 'bank_transfer', label: 'Transfer' },
                        { id: 'pos', label: 'POS Card' },
                        { id: 'other', label: 'Other' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setRepaymentMethod(m.id as any)}
                          className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition cursor-pointer ${
                            repaymentMethod === m.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date & Reference */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={repaymentDate}
                        onChange={(e) => setRepaymentDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Reference / Receipt #
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. REP-892120"
                        value={repaymentRef}
                        onChange={(e) => setRepaymentRef(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Notes / Memo
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cash received by shop manager"
                      value={repaymentNotes}
                      onChange={(e) => setRepaymentNotes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setRepaymentModalCustomer(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={repaymentLoading || payNum <= 0}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      {repaymentLoading ? (
                        <span>Recording...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirm Repayment ({formatCurrency(payNum, currency)})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CUSTOMER PROFILE & COMPLETE DEBT/CREDIT LEDGER MODAL     */}
      {/* ======================================================== */}
      {viewingCustomer && viewingCustomerLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-5 sm:p-6 max-h-[92vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-lg shrink-0">
                  {viewingCustomer.name ? viewingCustomer.name[0].toUpperCase() : 'C'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      {viewingCustomer.name}
                    </h3>
                    {viewingCustomerLedger.outstandingBalance > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Debt: {formatCurrency(viewingCustomerLedger.outstandingBalance, currency)}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        Account Clear (₦0)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customer Account, Credit History &amp; Chronological Debt Ledger
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenRepayment(viewingCustomer)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Record Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCustomer(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Details Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 px-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 mt-4">
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{viewingCustomer.phone || 'No phone recorded'}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{viewingCustomer.email || 'No email recorded'}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{viewingCustomer.address || 'No address recorded'}</span>
              </div>
            </div>

            {/* 5 Customer Dashboard Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-4">
              {/* Metric 1: Outstanding Debt */}
              <div className={`p-3 rounded-2xl border ${
                viewingCustomerLedger.outstandingBalance > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className={`text-[11px] font-semibold ${
                  viewingCustomerLedger.outstandingBalance > 0 ? 'text-amber-800' : 'text-emerald-800'
                }`}>
                  Current Balance
                </div>
                <div className={`text-base sm:text-lg font-black mt-1 font-mono ${
                  viewingCustomerLedger.outstandingBalance > 0 ? 'text-amber-950' : 'text-emerald-900'
                }`}>
                  {formatCurrency(viewingCustomerLedger.outstandingBalance, currency)}
                </div>
                <div className="text-[10px] mt-0.5 text-slate-500 font-medium">
                  {viewingCustomerLedger.outstandingBalance > 0 ? 'Outstanding' : 'Marked Paid'}
                </div>
              </div>

              {/* Metric 2: Total Credit Taken */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200">
                <div className="text-[11px] text-slate-500 font-semibold">Total Credit Taken</div>
                <div className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-mono">
                  {formatCurrency(viewingCustomerLedger.totalCreditTaken, currency)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Pay-later sales</div>
              </div>

              {/* Metric 3: Total Repaid */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200">
                <div className="text-[11px] text-slate-500 font-semibold">Total Repaid</div>
                <div className="text-base sm:text-lg font-bold text-emerald-700 mt-1 font-mono">
                  {formatCurrency(viewingCustomerLedger.totalRepaid, currency)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">All payments received</div>
              </div>

              {/* Metric 4: Total Spent */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200">
                <div className="text-[11px] text-slate-500 font-semibold">Total Lifetime Spend</div>
                <div className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-mono">
                  {formatCurrency(viewingCustomerLedger.totalSpent, currency)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">All payment methods</div>
              </div>

              {/* Metric 5: Total Purchases */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-500 font-semibold">Total Purchases</div>
                <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  {viewingCustomerLedger.totalOrders}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Register orders</div>
              </div>
            </div>

            {/* Profile Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
              <button
                type="button"
                onClick={() => setProfileTab('ledger')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  profileTab === 'ledger'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Credit &amp; Debt Ledger ({viewingCustomerLedger.ledger.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('orders')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  profileTab === 'orders'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>All Orders ({viewingCustomerSales.length})</span>
              </button>
            </div>

            {/* TAB 1: Complete Debt / Credit Ledger */}
            {profileTab === 'ledger' && (
              <div className="space-y-3 flex-1">
                {viewingCustomerLedger.ledger.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No credit sales or repayments recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      When this customer makes a purchase with &quot;Credit / Pay Later&quot; at POS or makes repayments, the chronological ledger entries will automatically be audited here.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5">Date</th>
                            <th className="px-3.5 py-2.5">Type &amp; Ref</th>
                            <th className="px-3.5 py-2.5">Description</th>
                            <th className="px-3.5 py-2.5 text-right">Debit (+)</th>
                            <th className="px-3.5 py-2.5 text-right">Credit / Paid (-)</th>
                            <th className="px-3.5 py-2.5 text-right">Running Balance</th>
                            <th className="px-3.5 py-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewingCustomerLedger.ledger.map((entry) => {
                            const isSale = entry.type === 'credit_sale';
                            const isDeposit = entry.type === 'initial_payment';
                            return (
                              <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                                  {formatDate(entry.date)}
                                </td>
                                <td className="px-3.5 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isSale 
                                        ? 'bg-amber-100 text-amber-800' 
                                        : isDeposit
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {isSale ? 'Credit Sale' : isDeposit ? 'Upfront Deposit' : 'Repayment'}
                                    </span>
                                    <span className="font-mono text-[11px] font-semibold text-slate-800">
                                      {entry.reference_id}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3.5 py-3">
                                  <div className="font-medium text-slate-800">{entry.description}</div>
                                  {entry.notes && (
                                    <div className="text-[11px] text-slate-400 mt-0.5 italic">{entry.notes}</div>
                                  )}
                                  <div className="text-[10px] text-slate-400 mt-0.5">Method: {entry.payment_method}</div>
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-amber-900 whitespace-nowrap">
                                  {entry.debit > 0 ? formatCurrency(entry.debit, currency) : '—'}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                  {entry.credit > 0 ? formatCurrency(entry.credit, currency) : '—'}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                                  {formatCurrency(entry.balance, currency)}
                                </td>
                                <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                  {!isSale && entry.id.startsWith('pay-') ? (
                                    <button
                                      type="button"
                                      onClick={() => handleVoidPayment(entry.id.replace('pay-', ''))}
                                      className="text-[11px] text-red-500 hover:text-red-700 hover:underline p-1"
                                      title="Void repayment"
                                    >
                                      Void
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                          <tr>
                            <td colSpan={3} className="px-3.5 py-2.5 text-right">
                              Ledger Totals:
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-amber-900">
                              {formatCurrency(viewingCustomerLedger.totalCreditTaken, currency)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-emerald-700">
                              {formatCurrency(viewingCustomerLedger.totalRepaid, currency)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-slate-950 font-black">
                              {formatCurrency(viewingCustomerLedger.outstandingBalance, currency)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Complete Purchase History */}
            {profileTab === 'orders' && (
              <div className="space-y-2 flex-1">
                {viewingCustomerSales.length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center">No purchases recorded for this customer yet.</p>
                ) : (
                  viewingCustomerSales.map((sale) => (
                    <div 
                      key={sale.id} 
                      onClick={() => setSelectedSaleDetail(sale)}
                      className="p-3 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/80 transition flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition">
                            #{sale.id.slice(0, 8)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            sale.payment_method === 'credit'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sale.payment_method.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {formatDate(sale.created_at)} &bull; {sale.items?.length || 1} items
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          {formatCurrency(sale.total_amount, currency)}
                        </div>
                        {sale.payment_method === 'credit' && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            Credit Sale
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cust = viewingCustomer;
                    setViewingCustomer(null);
                    handleOpenEdit(cust);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Info</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cust = viewingCustomer;
                    setViewingCustomer(null);
                    setDeletingCustomer(cust);
                  }}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SALE RECEIPT DETAIL MODAL                                */}
      {/* ======================================================== */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Receipt #{selectedSaleDetail.id.slice(0, 8)}</h3>
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Date:</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedSaleDetail.created_at)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Method:</span>
                <span className="font-semibold capitalize text-slate-800">{selectedSaleDetail.payment_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Amount:</span>
                <span className="font-bold font-mono text-sm text-slate-900">{formatCurrency(selectedSaleDetail.total_amount, currency)}</span>
              </div>
              {selectedSaleDetail.payment_method === 'credit' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] space-y-1 mt-2">
                  <div className="flex justify-between text-slate-700">
                    <span>Upfront Paid at POS:</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(selectedSaleDetail.amount_paid || 0, currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-950">
                    <span>Outstanding Added to Debt:</span>
                    <span className="font-mono">{formatCurrency(selectedSaleDetail.balance_due || (selectedSaleDetail.total_amount - (selectedSaleDetail.amount_paid || 0)), currency)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedSaleDetail(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
            >
              Back to Customer Ledger
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL                                */}
      {/* ======================================================== */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 animate-in zoom-in-95 duration-100">
            <h3 className="text-base font-bold text-slate-900">Delete Customer</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to remove <strong>{deletingCustomer.name}</strong> from your customer records?
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
