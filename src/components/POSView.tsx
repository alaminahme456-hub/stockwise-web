import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { CartItem, NavigationTab, PaymentMethod, Product, Sale } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { createSaleWithItems } from '../lib/db';
import { ExpandableSearch } from './ExpandableSearch';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Building, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Receipt, 
  Printer, 
  X, 
  AlertCircle,
  PackageCheck,
  UserPlus,
  ShoppingBag,
  Calculator,
  Coins,
  Delete
} from 'lucide-react';

interface POSViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const POSView: React.FC<POSViewProps> = ({ onNavigate }) => {
  const { currentStore, products, categories, customers, settings, refreshStoreData } = useStore();
  const { user, profile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const currency = currentStore?.currency || 'USD';
  const taxRate = settings?.tax_rate || 0;

  // Filter products for catalog
  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      const isActive = p.status === 'active';
      return matchesSearch && matchesCat && isActive;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCheckoutError(null);
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      // Check stock availability
      if (existing.quantity + 1 > Number(product.current_stock)) {
        setCheckoutError(`Cannot add more than available stock (${product.current_stock} in stock)`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1,
        subtotal: (existing.quantity + 1) * existing.unit_price,
      };
      setCart(updatedCart);
    } else {
      if (Number(product.current_stock) < 1) {
        setCheckoutError(`Product "${product.name}" is currently out of stock`);
        return;
      }
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unit_price: Number(product.selling_price),
          subtotal: Number(product.selling_price),
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, newQty: number) => {
    setCheckoutError(null);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          if (newQty > Number(item.product.current_stock)) {
            setCheckoutError(`Only ${item.product.current_stock} units available in stock`);
            return item;
          }
          return {
            ...item,
            quantity: newQty,
            subtotal: newQty * item.unit_price,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setNotes('');
    setCashTendered('');
    setCheckoutError(null);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const taxAmount = useMemo(() => {
    return ((subtotal - discountAmount) * taxRate) / 100;
  }, [subtotal, discountAmount, taxRate]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount);
  }, [subtotal, discountAmount, taxAmount]);

  // Cash Tender & Calculator Calculations
  const tenderedNum = useMemo(() => {
    const parsed = parseFloat(cashTendered);
    return isNaN(parsed) ? 0 : parsed;
  }, [cashTendered]);

  const changeDue = useMemo(() => {
    if (tenderedNum >= totalAmount) {
      return Math.round((tenderedNum - totalAmount) * 100) / 100;
    }
    return 0;
  }, [tenderedNum, totalAmount]);

  const amountShort = useMemo(() => {
    if (totalAmount > tenderedNum) {
      return Math.round((totalAmount - tenderedNum) * 100) / 100;
    }
    return 0;
  }, [tenderedNum, totalAmount]);

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setCashTendered('');
      return;
    }
    if (val === 'BACK') {
      setCashTendered((prev) => prev.slice(0, -1));
      return;
    }
    if (val === '.') {
      if (!cashTendered.includes('.')) {
        setCashTendered((prev) => (prev === '' ? '0.' : prev + '.'));
      }
      return;
    }
    // Limit decimal precision to 2
    if (cashTendered.includes('.')) {
      const parts = cashTendered.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }
    setCashTendered((prev) => {
      if (prev === '0') return val;
      return prev + val;
    });
  };

  const handleAddCash = (amountToAdd: number) => {
    const cur = parseFloat(cashTendered) || 0;
    const nextVal = (cur + amountToAdd).toFixed(2);
    setCashTendered(nextVal);
  };

  // Checkout Execution
  const handleCompleteSale = async () => {
    if (!currentStore || cart.length === 0 || isProcessing) return;

    // Double check stock availability
    for (const item of cart) {
      const freshProd = products.find((p) => p.id === item.product.id);
      if (!freshProd || Number(freshProd.current_stock) < item.quantity) {
        setCheckoutError(`Insufficient stock for ${item.product.name}. Please refresh catalog.`);
        return;
      }
    }

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
      const cashierName = profile?.full_name || user?.email || 'Store Cashier';
      const isCash = paymentMethod === 'cash';
      const finalTendered = isCash ? (tenderedNum || totalAmount) : undefined;
      const finalChange = isCash ? (tenderedNum >= totalAmount ? changeDue : 0) : undefined;

      const sale = await createSaleWithItems(
        currentStore.id,
        {
          customerId: selectedCustomerId || null,
          customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          totalAmount,
          paymentMethod,
          staffName: cashierName,
          notes: notes || null,
          amountTendered: finalTendered,
          changeDue: finalChange,
        },
        cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          costPrice: Number(item.product.cost_price || 0),
          subtotal: item.subtotal,
        }))
      );

      // Successfully processed sale
      setCompletedSale({
        ...sale,
        amount_tendered: finalTendered,
        change_due: finalChange,
        items: cart.map((item) => ({
          id: item.product.id,
          sale_id: sale.id,
          product_id: item.product.id,
          product_name: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: Number(item.product.cost_price),
          subtotal: item.subtotal,
          created_at: new Date().toISOString(),
        })),
      });

      // Clear register cart
      clearCart();
      await refreshStoreData();
    } catch (err: any) {
      console.error('POS sale checkout error:', err);
      setCheckoutError(err?.message || 'Transaction could not be completed. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-32 lg:pb-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Point of Sale (POS)</h1>
            <p className="text-xs text-slate-500">Live checkout terminal • {currentStore?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Expandable Search Button in Top Right Corner */}
          <ExpandableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search products by name or SKU..."
          />

          {/* Quick navigation pill back to other sections on mobile */}
          {onNavigate && (
            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => onNavigate('transactions')}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                Sales
              </button>
            </div>
          )}
        </div>
      </div>

      {/* POS Grid: Catalog on left, Cart & Checkout on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT / MAIN: Product Catalog (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category filter */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-semibold text-slate-500">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {searchQuery && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg">
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">"{searchQuery}"</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-blue-900 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Filter Horizontal Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Items ({products.filter(p => p.status === 'active').length})
              </button>
              {categories.map((c) => {
                const count = products.filter(p => p.category_id === c.id && p.status === 'active').length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap font-medium transition ${
                      selectedCategory === c.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.name} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {availableProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <PackageCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-medium text-slate-600">No active products match</p>
                <p className="text-xs text-slate-400 mt-1">Check stock levels or search filter.</p>
              </div>
            ) : (
              availableProducts.map((prod) => {
                const stock = Number(prod.current_stock);
                const isOutOfStock = stock <= 0;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod)}
                    className={`text-left p-3.5 rounded-2xl border transition flex flex-col justify-between h-32 group ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer active:scale-98'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-mono truncate">{prod.sku}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {stock} in stock
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(prod.selling_price, currency)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Current Cart / Checkout Register (5 cols on lg) */}
        <div className={`
          lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col
          ${isMobileCartOpen 
            ? 'fixed inset-x-0 bottom-0 top-12 sm:top-14 z-[60] rounded-t-3xl border-t-2 shadow-2xl overflow-y-auto' 
            : 'hidden lg:flex lg:sticky lg:top-20'}
        `}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">Checkout Register</h3>
              {cart.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  {cart.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded cursor-pointer"
                >
                  Clear All
                </button>
              )}
              {isMobileCartOpen && (
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="lg:hidden px-2.5 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Back to Catalog</span>
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {checkoutError && (
            <div className="m-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Customer Attachment */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Customer Assignment
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="">Walk-in Customer (Guest)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="p-4 space-y-3 max-h-72 overflow-y-auto flex-1 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-0.5">Click items from the catalog on the left to add.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{formatCurrency(item.unit_price, currency)} each</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(item.subtotal, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'bank_transfer', label: 'Transfer', icon: Building },
                { id: 'pos', label: 'POS Card', icon: CreditCard },
                { id: 'mixed', label: 'Mixed', icon: Receipt },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Payment Calculator Interface */}
          {paymentMethod === 'cash' && (
            <div className="px-4 py-3 border-t border-slate-200 bg-blue-50/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>Cash Tendered &amp; Change Calculator</span>
                </div>
                {cashTendered && (
                  <button
                    type="button"
                    onClick={() => setCashTendered('')}
                    className="text-[11px] font-medium text-slate-500 hover:text-red-600 transition"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Amount Tendered Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Amount Tendered by Customer
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currency === 'USD' ? '$' : currency}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={cashTendered}
                    onFocus={(e) => {
                      if (e.target.value === '0' || e.target.value === '0.00') {
                        setCashTendered('');
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                        setCashTendered(val);
                      }
                    }}
                    className="w-full pl-8 pr-16 py-2 bg-white border border-slate-300 rounded-xl text-lg font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setCashTendered(totalAmount.toFixed(2))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition"
                    title="Set Exact Total"
                  >
                    Exact
                  </button>
                </div>
              </div>

              {/* Quick Cash Presets */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCashTendered(totalAmount.toFixed(2))}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition"
                >
                  Exact ({formatCurrency(totalAmount, currency)})
                </button>
                {[5, 10, 20, 50, 100].map((denomination) => {
                  const roundVal = Math.ceil(totalAmount / denomination) * denomination;
                  if (roundVal > totalAmount && roundVal <= totalAmount + denomination * 2) {
                    return (
                      <button
                        key={roundVal}
                        type="button"
                        onClick={() => setCashTendered(roundVal.toFixed(2))}
                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                      >
                        ${roundVal}
                      </button>
                    );
                  }
                  return null;
                }).filter(Boolean).slice(0, 3)}
              </div>

              {/* On-Screen Calculator Keypad */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {['1', '2', '3', '+5', '4', '5', '6', '+10', '7', '8', '9', '+20', 'C', '0', '.', '⌫'].map((key) => {
                  const isQuickAdd = key.startsWith('+');
                  const isAction = key === 'C' || key === '⌫';
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (isQuickAdd) {
                          handleAddCash(parseInt(key.replace('+', ''), 10));
                        } else if (key === '⌫') {
                          handleKeypadPress('BACK');
                        } else {
                          handleKeypadPress(key);
                        }
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                        isQuickAdd 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                          : isAction
                          ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {/* Change Due / Remaining Automatic Calculation */}
              <div className="pt-2 border-t border-slate-200/80">
                {tenderedNum >= totalAmount ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      <span>Change Due to Customer:</span>
                    </div>
                    <span className="text-base font-bold font-mono text-emerald-700">
                      {formatCurrency(changeDue, currency)}
                    </span>
                  </div>
                ) : tenderedNum > 0 ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <div className="text-amber-800 font-semibold text-xs">
                      <span>Remaining to Pay:</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-amber-700">
                      {formatCurrency(amountShort, currency)}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 text-center py-1">
                    Enter customer's cash to calculate change automatically
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Totals & Discount Calculation */}
          <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50/50 text-xs pb-32 sm:pb-8">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(subtotal, currency)}</span>
            </div>

            {/* Discount Control */}
            <div className="flex justify-between items-center text-slate-600">
              <span>Discount (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-16 px-2 py-1 text-right text-xs bg-white border border-slate-200 rounded-md font-semibold"
              />
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied:</span>
                <span>-{formatCurrency(discountAmount, currency)}</span>
              </div>
            )}

            {taxRate > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Sales Tax ({taxRate}%):</span>
                <span>{formatCurrency(taxAmount, currency)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Payable:</span>
              <span className="text-xl text-blue-600">{formatCurrency(totalAmount, currency)}</span>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              id="btn-complete-sale"
              data-testid="pay-button"
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCompleteSale}
              className="w-full mt-3 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay &amp; Complete Sale ({formatCurrency(totalAmount, currency)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sale Receipt Modal (Post-Checkout) */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-base">Sale Completed Successfully!</h3>
              </div>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div id="pos-receipt-print" className="p-4 my-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-sm uppercase">{settings?.receipt_header || currentStore?.name}</h4>
                <p className="text-[10px] text-slate-500">{currentStore?.address || 'Retail Store'}</p>
                <p className="text-[10px] text-slate-500">Tel: {currentStore?.phone || 'N/A'}</p>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Receipt: #{completedSale.id.slice(0, 8)}</span>
                <span>{formatDate(completedSale.created_at)}</span>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Customer: {completedSale.customer_name || 'Walk-in'}</span>
                <span>Payment: {completedSale.payment_method}</span>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
                {(completedSale.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="font-semibold">{formatCurrency(item.subtotal, currency)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right pt-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(completedSale.subtotal, currency)}</span>
                </div>
                {Number(completedSale.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(completedSale.discount || 0, currency)}</span>
                  </div>
                )}
                {Number(completedSale.tax) > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatCurrency(completedSale.tax || 0, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-300">
                  <span>TOTAL PAID:</span>
                  <span>{formatCurrency(completedSale.total_amount, currency)}</span>
                </div>
                {completedSale.payment_method === 'cash' && completedSale.amount_tendered !== undefined && (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-600 pt-1 border-t border-dotted border-slate-200">
                      <span>Cash Tendered:</span>
                      <span>{formatCurrency(completedSale.amount_tendered, currency)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                      <span>Change Returned:</span>
                      <span>{formatCurrency(completedSale.change_due || 0, currency)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500 border-t border-dashed border-slate-300">
                {settings?.receipt_footer || 'Thank you for your patronage!'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition"
              >
                New Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Bar (When on mobile and cart has items) */}
      {cart.length > 0 && !isMobileCartOpen && (
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 animate-in slide-in-from-bottom-3 duration-200 pb-safe">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between border border-slate-700/50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center relative font-bold text-xs">
                <ShoppingBag className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-[10px] flex items-center justify-center text-white border-2 border-slate-900">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">View Cart &amp; Checkout</div>
                <div className="text-sm font-bold text-white">{formatCurrency(totalAmount, currency)}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-xl transition shadow-xs">
              <span>View Cart &amp; Pay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
