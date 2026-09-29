import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { adjustInventory } from '../lib/db';
import { InventoryMovement, MovementType, Product } from '../types';
import { ExpandableSearch } from './ExpandableSearch';
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
  ArrowUpRight,
  Eye,
  Package,
  Layers
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { currentStore, products, categories, inventoryMovements, refreshStoreData } = useStore();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'levels' | 'history'>('levels');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail Modal States
  const [viewingInventoryProduct, setViewingInventoryProduct] = useState<Product | null>(null);
  const [viewingMovement, setViewingMovement] = useState<InventoryMovement | null>(null);

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

        {/* Header Actions: Tab Switcher and Expandable Search in Top Right */}
        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('levels')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'levels'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Stock Levels</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          </div>

          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by product name, SKU, reason..."
          />
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center gap-2 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl">
            <span>
              Searching {activeTab === 'levels' ? 'products' : 'movements'}: "{searchQuery}"
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="hover:text-blue-900 cursor-pointer ml-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* View Content */}
      {activeTab === 'levels' ? (
        /* Stock Levels Clickable List Items */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="px-5 py-16 text-center text-slate-400">
              <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">No matching inventory items found</p>
              <p className="text-xs text-slate-400 mt-1">Try searching by product name or SKU.</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const currentStock = Number(p.current_stock);
              const minStock = Number(p.min_stock_level);
              const isLow = currentStock > 0 && currentStock <= minStock;
              const isOut = currentStock <= 0;
              const stockValue = currentStock * Number(p.cost_price);
              const categoryName = categories.find((c) => c.id === p.category_id)?.name || 'General';

              return (
                <div
                  key={p.id}
                  onClick={() => setViewingInventoryProduct(p)}
                  className="p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Product & Stock status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate text-sm sm:text-base">
                        {p.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        isOut
                          ? 'text-red-700 font-bold'
                          : isLow
                          ? 'text-amber-700 font-semibold'
                          : 'text-emerald-700 font-medium'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Optimal'}
                      </span>
                    </div>

                    {/* Unboxed Metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-medium text-slate-700">{categoryName}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-mono text-slate-400">SKU: {p.sku}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>Min Alert: {minStock} {p.unit}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                      <span>In Stock: <strong className="text-slate-900 font-mono text-sm">{currentStock} {p.unit}</strong></span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>Valuation: <strong className="text-slate-900 font-mono">{formatCurrency(stockValue, currency)}</strong></span>
                    </div>
                  </div>

                  {/* Right: Prices & Quick Stock Adjustments */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="font-bold text-slate-900 font-mono text-sm sm:text-base">
                        {formatCurrency(p.selling_price, currency)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Cost: {formatCurrency(p.cost_price, currency)}
                      </div>
                    </div>

                    {/* Quick Stock Actions */}
                    <div 
                      className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(p, 'addition')}
                        className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition"
                        title="Add Stock (+)"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(p, 'reduction')}
                        className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 transition"
                        title="Reduce Stock (-)"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(p, 'adjustment')}
                        className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                        title="Set Specific Quantity"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingInventoryProduct(p)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Movement Audit Trail Clickable List Items */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredMovements.length === 0 ? (
            <div className="px-5 py-16 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">No stock movements recorded yet</p>
            </div>
          ) : (
            filteredMovements.map((mov) => {
              const isAddition = mov.type === 'addition' || mov.type === 'initial';
              const isSale = mov.type === 'sale';
              const isReduction = mov.type === 'reduction';

              return (
                <div
                  key={mov.id}
                  onClick={() => setViewingMovement(mov)}
                  className="p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Movement details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
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
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition text-sm">
                        {mov.product_name}
                      </h3>
                      <span className="font-mono text-xs text-slate-400">{mov.product_sku}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{formatDate(mov.created_at)}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>By: <strong className="text-slate-700">{mov.performed_by || 'Staff'}</strong></span>
                      {mov.reason && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="truncate max-w-sm text-slate-500">{mov.reason}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Quantity Changed */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className={`font-bold font-mono text-base ${
                        isAddition ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {isAddition ? `+${mov.quantity}` : `-${mov.quantity}`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {mov.previous_stock} → <strong className="text-slate-700">{mov.new_stock}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingMovement(mov);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="View Movement Log"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Inventory Item Detail Modal */}
      {viewingInventoryProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewingInventoryProduct.name}</h3>
                <p className="text-xs text-slate-500 font-mono">SKU: {viewingInventoryProduct.sku}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingInventoryProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Category:</span>
                <span className="font-medium text-slate-900">
                  {categories.find((c) => c.id === viewingInventoryProduct.category_id)?.name || 'General'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Current Stock:</span>
                <span className="font-bold text-slate-900">
                  {viewingInventoryProduct.current_stock} {viewingInventoryProduct.unit}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Stock Status:</span>
                <span className={`font-semibold text-xs ${
                  Number(viewingInventoryProduct.current_stock) <= 0
                    ? 'text-red-700'
                    : Number(viewingInventoryProduct.current_stock) <= Number(viewingInventoryProduct.min_stock_level)
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}>
                  {Number(viewingInventoryProduct.current_stock) <= 0
                    ? 'Out of Stock'
                    : Number(viewingInventoryProduct.current_stock) <= Number(viewingInventoryProduct.min_stock_level)
                    ? 'Low Stock Alert'
                    : 'Optimal Stock'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Minimum Stock Alert:</span>
                <span className="text-slate-700 font-medium">
                  {viewingInventoryProduct.min_stock_level} {viewingInventoryProduct.unit}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Cost Price:</span>
                <span className="font-mono text-slate-900">
                  {formatCurrency(viewingInventoryProduct.cost_price, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Selling Price:</span>
                <span className="font-mono font-bold text-blue-600">
                  {formatCurrency(viewingInventoryProduct.selling_price, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Profit Margin:</span>
                <span className="font-semibold text-emerald-600 font-mono">
                  {formatCurrency(Number(viewingInventoryProduct.selling_price) - Number(viewingInventoryProduct.cost_price), currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Stock Valuation:</span>
                <span className="font-mono font-bold text-slate-900 text-base">
                  {formatCurrency(Number(viewingInventoryProduct.current_stock) * Number(viewingInventoryProduct.cost_price), currency)}
                </span>
              </div>
            </div>

            {/* Quick Actions Inside Detail Modal */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const prod = viewingInventoryProduct;
                    setViewingInventoryProduct(null);
                    handleOpenAdjust(prod, 'addition');
                  }}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = viewingInventoryProduct;
                    setViewingInventoryProduct(null);
                    handleOpenAdjust(prod, 'reduction');
                  }}
                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>Reduce</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = viewingInventoryProduct;
                    setViewingInventoryProduct(null);
                    handleOpenAdjust(prod, 'adjustment');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Set Qty</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingInventoryProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Detail Modal */}
      {viewingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Stock Movement Audit</h3>
                <p className="text-xs text-slate-500">{formatDate(viewingMovement.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingMovement(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Product:</span>
                <span className="font-semibold text-slate-900">{viewingMovement.product_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">SKU:</span>
                <span className="font-mono text-slate-800">{viewingMovement.product_sku}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Movement Type:</span>
                <span className="font-semibold capitalize text-slate-900">{viewingMovement.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Quantity Changed:</span>
                <span className="font-bold font-mono text-slate-900">
                  {viewingMovement.quantity}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Previous Stock:</span>
                <span className="font-mono text-slate-700">{viewingMovement.previous_stock}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">New Stock:</span>
                <span className="font-bold font-mono text-blue-600">{viewingMovement.new_stock}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Recorded By:</span>
                <span className="text-slate-800">{viewingMovement.performed_by || 'Staff'}</span>
              </div>
              {viewingMovement.reason && (
                <div className="pt-2">
                  <span className="text-slate-500 text-xs block mb-1">Reason / Notes:</span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {viewingMovement.reason}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingMovement(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
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
