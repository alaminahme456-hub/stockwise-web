import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { createProduct, updateProduct, deleteProduct, createCategory } from '../lib/db';
import { formatCurrency, formatDate } from '../lib/utils';
import { ExpandableSearch } from './ExpandableSearch';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Edit, 
  Trash2, 
  Eye, 
  Package, 
  AlertTriangle, 
  Check, 
  X,
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { currentStore, products, categories, suppliers, refreshStoreData } = useStore();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortField, setSortField] = useState<'name' | 'selling_price' | 'current_stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form State for Add / Edit (using string representations for inputs to prevent sticky 0)
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    cost_price: '',
    selling_price: '',
    initial_stock: '',
    min_stock_level: '5',
    unit: 'pcs',
    status: 'active' as 'active' | 'inactive' | 'archived',
  });

  // Custom Category State
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySaveLoading, setCategorySaveLoading] = useState(false);
  const [categorySaveError, setCategorySaveError] = useState<string | null>(null);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const currency = currentStore?.currency || 'USD';

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch = 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;

        let matchesStock = true;
        const stock = Number(p.current_stock);
        const minStock = Number(p.min_stock_level);
        if (selectedStockStatus === 'in_stock') {
          matchesStock = stock > minStock;
        } else if (selectedStockStatus === 'low_stock') {
          matchesStock = stock > 0 && stock <= minStock;
        } else if (selectedStockStatus === 'out_of_stock') {
          matchesStock = stock <= 0;
        }

        return matchesSearch && matchesCat && matchesStock;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'name') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        } else {
          valA = Number(valA);
          valB = Number(valB);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, searchQuery, selectedCategory, selectedStockStatus, sortField, sortOrder]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      description: '',
      cost_price: '',
      selling_price: '',
      initial_stock: '',
      min_stock_level: '5',
      unit: 'pcs',
      status: 'active',
    });
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setCategorySaveError(null);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category_id: p.category_id || '',
      description: p.description || '',
      cost_price: p.cost_price ? String(Number(p.cost_price)) : '',
      selling_price: p.selling_price ? String(Number(p.selling_price)) : '',
      initial_stock: p.current_stock ? String(Number(p.current_stock)) : '',
      min_stock_level: p.min_stock_level ? String(Number(p.min_stock_level)) : '5',
      unit: p.unit || 'pcs',
      status: p.status || 'active',
    });
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setCategorySaveError(null);
    setFormError(null);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setCategorySaveError(null);
    setFormError(null);
  };

  const handleSaveCustomCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategorySaveError('Please enter a category name');
      return;
    }
    if (!currentStore) {
      setCategorySaveError('No active store found');
      return;
    }

    // Check if category already exists (case-insensitive)
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setFormData((prev) => ({ ...prev, category_id: existing.id }));
      setIsCreatingCategory(false);
      setNewCategoryName('');
      setCategorySaveError(null);
      return;
    }

    setCategorySaveLoading(true);
    setCategorySaveError(null);

    try {
      const created = await createCategory(currentStore.id, trimmed);
      await refreshStoreData();
      setFormData((prev) => ({ ...prev, category_id: created.id }));
      setIsCreatingCategory(false);
      setNewCategoryName('');
    } catch (err: any) {
      setCategorySaveError(err?.message || 'Failed to save custom category');
    } finally {
      setCategorySaveLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !user) return;
    setFormLoading(true);
    setFormError(null);

    try {
      const selectedCategoryObj = categories.find((c) => c.id === formData.category_id);
      const costPriceNum = parseFloat(formData.cost_price) || 0;
      const sellingPriceNum = parseFloat(formData.selling_price) || 0;
      const initialStockNum = parseFloat(formData.initial_stock) || 0;
      const minStockLevelNum = parseFloat(formData.min_stock_level) || 5;

      // Generate a clean background SKU if none exists (satisfies schema constraint without requiring user input)
      const generatedSku = `PRD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      if (editingProduct) {
        // Update product
        await updateProduct(editingProduct.id, {
          name: formData.name,
          sku: editingProduct.sku || generatedSku,
          category_id: formData.category_id || null,
          category_name: selectedCategoryObj?.name || null,
          description: formData.description || null,
          cost_price: costPriceNum,
          selling_price: sellingPriceNum,
          min_stock_level: minStockLevelNum,
          unit: formData.unit || 'pcs',
          supplier_id: editingProduct.supplier_id || null,
          status: formData.status,
        });
        setEditingProduct(null);
      } else {
        // Create new product
        await createProduct(
          {
            store_id: currentStore.id,
            name: formData.name,
            sku: generatedSku,
            category_id: formData.category_id || null,
            category_name: selectedCategoryObj?.name || null,
            description: formData.description || null,
            cost_price: costPriceNum,
            selling_price: sellingPriceNum,
            current_stock: initialStockNum,
            min_stock_level: minStockLevelNum,
            unit: formData.unit || 'pcs',
            supplier_id: null,
            status: formData.status,
          },
          initialStockNum,
          user.id,
          user.email
        );
        setIsAddModalOpen(false);
      }
      await refreshStoreData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save product. Check database connection.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      await refreshStoreData();
    } catch (err: any) {
      alert(`Could not delete product: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products Management</h1>
          <p className="text-sm text-slate-500">
            Catalogue, inventory levels, and pricing for {currentStore?.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by product name, SKU, or description..."
          />

          <button
            type="button"
            id="btn-add-product"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {searchQuery && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl">
              <span>Searching: "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="hover:text-blue-900 cursor-pointer ml-0.5"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredProducts.length} of {products.length} products
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Stock Level Filter */}
          <select
            value={selectedStockStatus}
            onChange={(e) => setSelectedStockStatus(e.target.value as any)}
            className="text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          {/* Sort Field */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products List (Replaced horizontal scrolling table with clickable list items) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="px-5 py-16 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or add a new product.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const stock = Number(product.current_stock);
            const min = Number(product.min_stock_level);
            const isLow = stock > 0 && stock <= min;
            const isOut = stock <= 0;
            const profit = Number(product.selling_price) - Number(product.cost_price);

            return (
              <div
                key={product.id}
                onClick={() => setViewingProduct(product)}
                className="p-4 sm:px-6 hover:bg-slate-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left: Product Information & Stock */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate text-sm sm:text-base">
                      {product.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      isOut 
                        ? 'text-red-700 font-bold' 
                        : isLow 
                        ? 'text-amber-700 font-semibold' 
                        : 'text-emerald-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      {isOut ? 'Out of stock' : isLow ? `Low stock (${product.current_stock} ${product.unit})` : `${product.current_stock} ${product.unit} in stock`}
                    </span>
                  </div>

                  {/* Clean unboxed metadata with subtle typographic separators */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="font-medium text-slate-700">{product.category_name || 'General'}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono text-slate-400">SKU: {product.sku}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="capitalize text-slate-500">{product.status}</span>
                  </div>

                  {product.description && (
                    <p className="text-xs text-slate-400 truncate max-w-lg mt-1">
                      {product.description}
                    </p>
                  )}
                </div>

                {/* Right: Pricing & Quick Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="font-bold text-slate-900 font-mono text-sm sm:text-base">
                      {formatCurrency(product.selling_price, currency)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Cost: {formatCurrency(product.cost_price, currency)} {profit > 0 ? `(+${formatCurrency(profit, currency)})` : ''}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div 
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setViewingProduct(product)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(product)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Edit Product"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingProduct(product)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete Product"
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

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arabica Coffee Beans"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Category & Unit of Measure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category with Custom Option */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Category
                    </label>
                    {!isCreatingCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCategory(true);
                          setNewCategoryName('');
                          setCategorySaveError(null);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-0.5 transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Custom</span>
                      </button>
                    )}
                  </div>

                  {!isCreatingCategory ? (
                    <select
                      value={formData.category_id}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_CUSTOM__') {
                          setIsCreatingCategory(true);
                          setNewCategoryName('');
                          setCategorySaveError(null);
                        } else {
                          setFormData({ ...formData, category_id: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="">Select Category</option>
                      <option value="__ADD_CUSTOM__" className="font-semibold text-blue-600 bg-blue-50">
                        + Add Custom Category...
                      </option>
                      {categories.length > 0 && (
                        <optgroup label="Existing Categories">
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  ) : (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          autoFocus
                          placeholder="New category name..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveCustomCategory();
                            } else if (e.key === 'Escape') {
                              setIsCreatingCategory(false);
                              setCategorySaveError(null);
                            }
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          disabled={categorySaveLoading || !newCategoryName.trim()}
                          onClick={handleSaveCustomCategory}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 transition inline-flex items-center gap-1 shrink-0"
                        >
                          {categorySaveLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingCategory(false);
                            setCategorySaveError(null);
                          }}
                          className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                      {categorySaveError && (
                        <p className="text-[11px] text-red-600 font-medium">{categorySaveError}</p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        Type name & click Save (or press Enter) to add and select.
                      </p>
                    </div>
                  )}
                </div>

                {/* Unit of Measure */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    placeholder="pcs, kg, box, bottle..."
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Price Fields (Cost Price & Selling Price) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cost Price ({currency})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formData.cost_price}
                    onFocus={(e) => {
                      if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '0.0') {
                        setFormData((prev) => ({ ...prev, cost_price: '' }));
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setFormData((prev) => ({ ...prev, cost_price: val }));
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price ({currency}) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={formData.selling_price}
                    onFocus={(e) => {
                      if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '0.0') {
                        setFormData((prev) => ({ ...prev, selling_price: '' }));
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setFormData((prev) => ({ ...prev, selling_price: val }));
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Stock Levels & Status */}
              <div className={`grid grid-cols-1 ${!editingProduct ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Stock Quantity
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formData.initial_stock}
                      onFocus={(e) => {
                        if (e.target.value === '0') {
                          setFormData((prev) => ({ ...prev, initial_stock: '' }));
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setFormData((prev) => ({ ...prev, initial_stock: val }));
                        }
                      }}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="5"
                    value={formData.min_stock_level}
                    onFocus={(e) => {
                      if (e.target.value === '0') {
                        setFormData((prev) => ({ ...prev, min_stock_level: '' }));
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        setFormData((prev) => ({ ...prev, min_stock_level: val }));
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Specifications
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional product details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {formLoading ? 'Saving to Database...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Product Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">{viewingProduct.name}</h3>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">SKU Code:</span>
                <span className="font-mono font-medium text-slate-900">{viewingProduct.sku}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Category:</span>
                <span className="font-medium text-slate-900">{viewingProduct.category_name || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Selling Price:</span>
                <span className="font-bold text-blue-600">{formatCurrency(viewingProduct.selling_price, currency)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Cost Price:</span>
                <span className="font-medium text-slate-900">{formatCurrency(viewingProduct.cost_price, currency)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Estimated Profit / Margin:</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(Number(viewingProduct.selling_price) - Number(viewingProduct.cost_price), currency)}
                  {Number(viewingProduct.selling_price) > 0 && (
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      ({Math.round(((Number(viewingProduct.selling_price) - Number(viewingProduct.cost_price)) / Number(viewingProduct.selling_price)) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Current Stock:</span>
                <span className="font-bold text-slate-900">{viewingProduct.current_stock} {viewingProduct.unit}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Stock Valuation:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatCurrency(Number(viewingProduct.current_stock) * Number(viewingProduct.cost_price), currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Minimum Stock Alert:</span>
                <span className="text-slate-700">{viewingProduct.min_stock_level} {viewingProduct.unit}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Created:</span>
                <span className="text-slate-700">{formatDate(viewingProduct.created_at)}</span>
              </div>
              {viewingProduct.description && (
                <div className="pt-2">
                  <span className="text-slate-500 text-xs block mb-1">Description:</span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {viewingProduct.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prod = viewingProduct;
                    setViewingProduct(null);
                    handleOpenEdit(prod);
                  }}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Product</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = viewingProduct;
                    setViewingProduct(null);
                    setDeletingProduct(prod);
                  }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Product</h3>
            <p className="text-xs text-slate-500 mt-2">
              Are you sure you want to permanently delete <strong className="text-slate-800">{deletingProduct.name}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
