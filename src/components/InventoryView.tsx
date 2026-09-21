import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { adjustInventory } from '../lib/db';
import { MovementType, Product } from '../types';
import { 
  Boxes, 
  PlusCircle, 
  MinusCircle, 
  RefreshCw, 
  History, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  SlidersHorizontal,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { currentStore, products, inventoryMovements, refreshStoreData } = useStore();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'levels' | 'history'>('levels');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Adjustment Modal State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<MovementType>('addition');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const currency = currentStore?.currency || 'USD';

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filtered Movements
  const filteredMovements = inventoryMovements.filter((m) => {
    return (
      (m.product_name && m.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.product_sku && m.product_sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.reason && m.reason.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleOpenAdjust = (product: Product, type: MovementType = 'addition') => {
    setAdjustingProduct(product);
    setAdjustType(type);
    setAdjustQuantity(1);
    setAdjustReason('');
    setAdjustError(null);
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !adjustingProduct || adjustQuantity <= 0) return;

    setAdjustLoading(true);
    setAdjustError(null);

    try {
      const performer = profile?.full_name || user?.email || 'Store Staff';
      await adjustInventory(
        currentStore.id,
        adjustingProduct.id,
        adjustType,
        Number(adjustQuantity),
        adjustReason || `Manual ${adjustType}`,
        performer
      );

      await refreshStoreData();
      setAdjustingProduct(null);
    } catch (err: any) {
      setAdjustError(err?.message || 'Failed to apply inventory adjustment.');
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory & Stock Tracking</h1>
          <p className="text-sm text-slate-500">
            Monitor real-time inventory balances and audit movement records
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('levels')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'levels'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Current Stock Levels</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Movement Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or movement reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* View Content */}
      {activeTab === 'levels' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3 text-right">In Stock</th>
                  <th className="px-5 py-3 text-right">Min Level</th>
                  <th className="px-5 py-3 text-right">Cost Price</th>
                  <th className="px-5 py-3 text-right">Selling Price</th>
                  <th className="px-5 py-3 text-right">Stock Valuation</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                      No matching inventory items found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const currentStock = Number(p.current_stock);
                    const minStock = Number(p.min_stock_level);
                    const isLow = currentStock > 0 && currentStock <= minStock;
                    const isOut = currentStock <= 0;
                    const stockValue = currentStock * Number(p.cost_price);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {p.name}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                          {p.sku}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                          {currentStock} {p.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-500">
                          {minStock} {p.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-600">
                          {formatCurrency(p.cost_price, currency)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-slate-900">
                          {formatCurrency(p.selling_price, currency)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-slate-900">
                          {formatCurrency(stockValue, currency)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isOut
                              ? 'bg-red-100 text-red-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Optimal'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(p, 'addition')}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition"
                              title="Add Stock"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(p, 'reduction')}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition"
                              title="Reduce Stock"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(p, 'adjustment')}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                              title="Set Specific Quantity"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Movement Audit Trail Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Movement Type</th>
                  <th className="px-5 py-3 text-right">Change Qty</th>
                  <th className="px-5 py-3 text-right">Previous</th>
                  <th className="px-5 py-3 text-right">New Stock</th>
                  <th className="px-5 py-3">Reason / Details</th>
                  <th className="px-5 py-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => {
                    const isAddition = mov.type === 'addition' || mov.type === 'initial';
                    const isSale = mov.type === 'sale';
                    const isReduction = mov.type === 'reduction';

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(mov.created_at)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {mov.product_name}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                          {mov.product_sku}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            isAddition
                              ? 'bg-emerald-100 text-emerald-800'
                              : isSale
                              ? 'bg-blue-100 text-blue-800'
                              : isReduction
                              ? 'bg-red-100 text-red-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {isAddition && <ArrowUpRight className="w-3 h-3" />}
                            {isReduction && <ArrowDownRight className="w-3 h-3" />}
                            {mov.type}
                          </span>
                        </td>
                        <td className={`px-5 py-3.5 text-right font-bold font-mono text-xs ${
                          isAddition ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {isAddition ? `+${mov.quantity}` : `-${mov.quantity}`}
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-500 font-mono text-xs">
                          {mov.previous_stock}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900 font-mono text-xs">
                          {mov.new_stock}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                          {mov.reason || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {mov.performed_by || 'Staff'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Inventory Adjustment</h3>
                <p className="text-xs text-slate-500 mt-0.5">{adjustingProduct.name} ({adjustingProduct.sku})</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adjustError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleExecuteAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('addition')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                      adjustType === 'addition'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    + Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('reduction')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                      adjustType === 'reduction'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    - Reduce Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                      adjustType === 'adjustment'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Set Fixed
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {adjustType === 'adjustment' ? 'New Target Stock Quantity' : 'Quantity to Apply'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
                <div className="mt-1.5 text-xs text-slate-500 flex justify-between">
                  <span>Current Stock: <strong>{adjustingProduct.current_stock}</strong></span>
                  <span>
                    New Stock will be:{' '}
                    <strong>
                      {adjustType === 'addition'
                        ? Number(adjustingProduct.current_stock) + adjustQuantity
                        : adjustType === 'reduction'
                        ? Math.max(0, Number(adjustingProduct.current_stock) - adjustQuantity)
                        : adjustQuantity}
                    </strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjustment Reason / Notes *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supplier delivery, breakage, audit recount..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition disabled:opacity-50"
                >
                  {adjustLoading ? 'Persisting...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
