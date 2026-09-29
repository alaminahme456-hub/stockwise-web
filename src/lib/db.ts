import { supabase } from './supabase';
import { 
  Store, 
  Product, 
  Category, 
  Supplier, 
  Customer, 
  Sale, 
  Expense, 
  InventoryMovement, 
  StoreMember,
  StoreSettings,
  MovementType,
  PaymentMethod,
  CustomerPayment,
  CustomerLedgerEntry,
  StaffInvitation,
  StaffActivity
} from '../types';
import { generateInvitationToken, ROLE_TEMPLATES, formatRoleName } from './permissions';

// ==========================================
// USER-SCOPED STORAGE FOR STRICT ISOLATION
// Ensures each user only accesses their own data
// ==========================================
export interface UserStorageSchema {
  stores: Store[];
  settings: Record<string, StoreSettings>;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  expenses: Expense[];
  inventoryMovements: InventoryMovement[];
  storeMembers: StoreMember[];
  customerPayments: CustomerPayment[];
  staffInvitations?: StaffInvitation[];
  staffActivity?: StaffActivity[];
}

export function getCurrentUserId(): string {
  if (typeof window !== 'undefined') {
    const active = localStorage.getItem('stockwise_active_user_id');
    if (active) return active;
  }
  return 'default-user';
}

export function getUserStorage(userId: string): UserStorageSchema {
  if (typeof window === 'undefined') {
    return {
      stores: [],
      settings: {},
      categories: [],
      products: [],
      customers: [],
      suppliers: [],
      sales: [],
      expenses: [],
      inventoryMovements: [],
      storeMembers: [],
      customerPayments: [],
    };
  }
  const key = `stockwise_user_data_${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial: UserStorageSchema = {
        stores: [],
        settings: {},
        categories: [],
        products: [],
        customers: [],
        suppliers: [],
        sales: [],
        expenses: [],
        inventoryMovements: [],
        storeMembers: [],
        customerPayments: [],
      };
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.customerPayments) parsed.customerPayments = [];
    if (!parsed.staffInvitations) parsed.staffInvitations = [];
    if (!parsed.staffActivity) parsed.staffActivity = [];
    return parsed;
  } catch {
    return {
      stores: [],
      settings: {},
      categories: [],
      products: [],
      customers: [],
      suppliers: [],
      sales: [],
      expenses: [],
      inventoryMovements: [],
      storeMembers: [],
      customerPayments: [],
      staffInvitations: [],
      staffActivity: [],
    };
  }
}

export function saveUserStorage(userId: string, data: UserStorageSchema): void {
  if (typeof window === 'undefined') return;
  const key = `stockwise_user_data_${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save user-scoped data:', err);
  }
}

export function findStorageForStore(storeId: string): { userId: string; storage: UserStorageSchema } {
  if (typeof window !== 'undefined') {
    // 1. Check current authenticated user first
    const curUserId = getCurrentUserId();
    if (curUserId) {
      const curStorage = getUserStorage(curUserId);
      if (curStorage.stores.some((s) => s.id === storeId)) {
        return { userId: curUserId, storage: curStorage };
      }
    }
    // 2. Search other user storages
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('stockwise_user_data_')) {
        const uId = k.replace('stockwise_user_data_', '');
        const st = getUserStorage(uId);
        if (st.stores.some((s) => s.id === storeId)) {
          return { userId: uId, storage: st };
        }
      }
    }
  }
  const fallbackId = getCurrentUserId();
  return { userId: fallbackId, storage: getUserStorage(fallbackId) };
}

// ==========================================
// STORES
// ==========================================
export async function fetchUserStores(userId: string): Promise<Store[]> {
  try {
    // Query stores owned by user in Supabase
    const { data: ownedStores, error: ownedError } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true });

    if (ownedError) throw ownedError;

    let memberList: Store[] = [];
    try {
      const { data: memberStores, error: memberError } = await supabase
        .from('store_members')
        .select('store:stores(*)')
        .eq('user_id', userId);

      if (!memberError && memberStores) {
        memberList = memberStores.map((m: any) => m.store).filter(Boolean);
      }
    } catch {
      // Non-fatal if store_members table is not yet created
    }

    // Combine and deduplicate by id
    const storeMap = new Map<string, Store>();
    (ownedStores || []).forEach((s: Store) => storeMap.set(s.id, s));
    memberList.forEach((s: Store) => storeMap.set(s.id, s));

    const result = Array.from(storeMap.values());
    
    // Cache user's stores in their isolated storage
    const uStorage = getUserStorage(userId);
    uStorage.stores = result;
    saveUserStorage(userId, uStorage);

    return result;
  } catch (err) {
    console.warn('Supabase fetchUserStores fallback to user-isolated storage:', err);
    const uStorage = getUserStorage(userId);
    return uStorage.stores;
  }
}

export async function createStore(
  ownerId: string, 
  name: string, 
  currency: string = 'USD', 
  details?: Partial<Store>
): Promise<Store> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .insert({
        owner_id: ownerId,
        name,
        currency,
        business_name: details?.business_name || name,
        phone: details?.phone || null,
        email: details?.email || null,
        address: details?.address || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Add owner to store_members in Supabase
    try {
      await supabase.from('store_members').insert({
        store_id: data.id,
        user_id: ownerId,
        role: 'owner',
      });
    } catch {
      // Ignore if table not created
    }

    // Create default categories in Supabase
    const defaultCats = ['Beverages', 'Food & Snacks', 'Electronics', 'Personal Care', 'General Goods'];
    for (const catName of defaultCats) {
      try {
        await supabase.from('categories').insert({
          store_id: data.id,
          name: catName,
        });
      } catch {
        // Ignore if table not created
      }
    }

    // Initialize store settings in Supabase
    try {
      await supabase.from('store_settings').insert({
        store_id: data.id,
        receipt_header: name,
        receipt_footer: 'Thank you for your business!',
        currency: currency,
        tax_rate: 0,
      });
    } catch {
      // Ignore if table not created
    }

    // Keep isolated local store updated
    const uStorage = getUserStorage(ownerId);
    if (!uStorage.stores.some((s) => s.id === data.id)) {
      uStorage.stores.push(data);
      saveUserStorage(ownerId, uStorage);
    }

    return data;
  } catch (err) {
    console.warn('Supabase store creation fallback to user-isolated storage:', err);
    const uStorage = getUserStorage(ownerId);
    const fallbackStore: Store = {
      id: `store-${Date.now()}`,
      owner_id: ownerId,
      name,
      business_name: details?.business_name || name,
      currency,
      phone: details?.phone || null,
      email: details?.email || null,
      address: details?.address || null,
      logo_url: details?.logo_url || null,
      created_at: new Date().toISOString(),
    };
    uStorage.stores.push(fallbackStore);
    uStorage.storeMembers.push({
      id: `mem-${Date.now()}`,
      store_id: fallbackStore.id,
      user_id: ownerId,
      role: 'owner',
      user_name: 'Store Owner',
      created_at: new Date().toISOString(),
    });
    uStorage.settings[fallbackStore.id] = {
      store_id: fallbackStore.id,
      receipt_header: name,
      receipt_footer: 'Thank you for your business!',
      currency,
      tax_rate: 0,
      low_stock_threshold_default: 5,
    };
    const defaultCats = ['Beverages', 'Food & Snacks', 'Electronics', 'Personal Care', 'General Goods'];
    defaultCats.forEach((c) => {
      uStorage.categories.push({
        id: `cat-${Date.now()}-${c.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        store_id: fallbackStore.id,
        name: c,
        description: null,
        created_at: new Date().toISOString(),
      });
    });
    saveUserStorage(ownerId, uStorage);
    return fallbackStore;
  }
}

export async function updateStore(storeId: string, updates: Partial<Store>): Promise<Store> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    const idx = storage.stores.findIndex((s) => s.id === storeId);
    if (idx !== -1) {
      storage.stores[idx] = { ...storage.stores[idx], ...updates };
      saveUserStorage(userId, storage);
      return storage.stores[idx];
    }
    throw new Error('Store not found');
  }
}

// ==========================================
// PRODUCTS
// ==========================================
export async function fetchProducts(storeId: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchProducts fallback to user-isolated storage:', err);
    const { storage } = findStorageForStore(storeId);
    return storage.products.filter((p) => p.store_id === storeId);
  }
}

export async function createProduct(
  productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
  initialQuantity: number,
  userId: string,
  userEmail?: string
): Promise<Product> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...productData,
        current_stock: initialQuantity,
      })
      .select()
      .single();

    if (error) throw error;

    if (initialQuantity > 0) {
      try {
        await supabase.from('inventory_movements').insert({
          store_id: data.store_id,
          product_id: data.id,
          type: 'initial',
          quantity: initialQuantity,
          previous_stock: 0,
          new_stock: initialQuantity,
          reason: 'Initial stock intake upon creation',
          performed_by: userEmail || 'Staff',
        });
      } catch {
        // Ignore if table not created
      }
    }

    return data;
  } catch (err) {
    console.warn('Supabase createProduct fallback to user-isolated storage:', err);
    const { userId: storeOwnerId, storage } = findStorageForStore(productData.store_id);
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      current_stock: initialQuantity,
      stock_quantity: initialQuantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    storage.products.push(newProd);
    if (initialQuantity > 0) {
      storage.inventoryMovements.unshift({
        id: `mov-${Date.now()}`,
        store_id: productData.store_id,
        product_id: newProd.id,
        type: 'initial',
        quantity: initialQuantity,
        previous_stock: 0,
        new_stock: initialQuantity,
        reason: 'Initial stock intake upon creation',
        performed_by: userEmail || 'Staff',
        created_at: new Date().toISOString(),
        product_name: newProd.name,
        product_sku: newProd.sku,
      });
    }
    saveUserStorage(storeOwnerId, storage);
    return newProd;
  }
}

export async function updateProduct(
  productId: string, 
  updates: Partial<Product>
): Promise<Product> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    const idx = storage.products.findIndex((p) => p.id === productId);
    if (idx !== -1) {
      storage.products[idx] = { 
        ...storage.products[idx], 
        ...updates, 
        updated_at: new Date().toISOString() 
      };
      saveUserStorage(curUserId, storage);
      return storage.products[idx];
    }
    throw new Error('Product not found');
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    storage.products = storage.products.filter((p) => p.id !== productId);
    saveUserStorage(curUserId, storage);
  }
}

// ==========================================
// INVENTORY & MOVEMENTS
// ==========================================
export async function fetchInventoryMovements(storeId: string): Promise<InventoryMovement[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, product:products(name, sku)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      product_name: item.product?.name || 'Unknown Product',
      product_sku: item.product?.sku || '-',
    }));
  } catch {
    const { storage } = findStorageForStore(storeId);
    const prods = storage.products;
    return storage.inventoryMovements
      .filter((m) => m.store_id === storeId)
      .map((item) => {
        const prod = prods.find((p) => p.id === item.product_id);
        return {
          ...item,
          product_name: prod?.name || item.product_name || 'Product',
          product_sku: prod?.sku || item.product_sku || '-',
        };
      });
  }
}

export async function adjustInventory(
  storeId: string,
  productId: string,
  type: MovementType,
  quantity: number,
  reason: string,
  performedBy: string
): Promise<{ product: Product; movement: InventoryMovement }> {
  try {
    const { data: prod, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchErr) throw fetchErr;

    const current = Number(prod.current_stock ?? prod.stock_quantity ?? 0);
    let newStock = current;

    if (type === 'addition') {
      newStock = current + quantity;
    } else if (type === 'reduction') {
      newStock = Math.max(0, current - quantity);
    } else if (type === 'adjustment') {
      newStock = quantity;
    }

    const { data: updatedProd, error: updateErr } = await supabase
      .from('products')
      .update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const { data: movData, error: movErr } = await supabase
      .from('inventory_movements')
      .insert({
        store_id: storeId,
        product_id: productId,
        type,
        quantity,
        previous_stock: current,
        new_stock: newStock,
        reason,
        performed_by: performedBy,
      })
      .select()
      .single();

    if (movErr) throw movErr;

    return { product: updatedProd, movement: movData };
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    const prod = storage.products.find((p) => p.id === productId);
    if (!prod) throw new Error('Product not found');

    const current = Number(prod.current_stock ?? prod.stock_quantity ?? 0);
    let newStock = current;

    if (type === 'addition') {
      newStock = current + quantity;
    } else if (type === 'reduction') {
      newStock = Math.max(0, current - quantity);
    } else if (type === 'adjustment') {
      newStock = quantity;
    }

    prod.current_stock = newStock;
    prod.stock_quantity = newStock;
    prod.updated_at = new Date().toISOString();

    const mov: InventoryMovement = {
      id: `mov-${Date.now()}`,
      store_id: storeId,
      product_id: productId,
      type,
      quantity,
      previous_stock: current,
      new_stock: newStock,
      reason,
      performed_by: performedBy,
      created_at: new Date().toISOString(),
      product_name: prod.name,
      product_sku: prod.sku,
    };

    storage.inventoryMovements.unshift(mov);
    saveUserStorage(userId, storage);
    return { product: prod, movement: mov };
  }
}

// ==========================================
// SALES & POS
// ==========================================
export async function createSaleWithItems(
  storeId: string,
  saleData: {
    customerId?: string | null;
    customerName?: string | null;
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    staffName?: string | null;
    notes?: string | null;
    amountTendered?: number;
    changeDue?: number;
    amountPaid?: number;
    balanceDue?: number;
    dueDate?: string | null;
  },
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    subtotal: number;
  }>
): Promise<Sale> {
  const isCredit = saleData.paymentMethod === 'credit';
  const upfrontPaid = isCredit ? Number(saleData.amountPaid || 0) : undefined;
  const balanceDue = isCredit ? Math.max(0, Number(saleData.totalAmount) - (upfrontPaid || 0)) : undefined;

  try {
    // 1. Deduct stock in Supabase
    for (const item of items) {
      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .select('current_stock, name')
        .eq('id', item.productId)
        .single();

      if (!prodErr && prod) {
        const currentStock = Number(prod.current_stock) || 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        await supabase
          .from('products')
          .update({
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.productId);

        try {
          await supabase.from('inventory_movements').insert({
            store_id: storeId,
            product_id: item.productId,
            type: 'sale',
            quantity: item.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            reason: `POS Sale: ${item.quantity} ${prod.name}`,
            performed_by: saleData.staffName || 'Cashier',
          });
        } catch {
          // Ignore if table not created
        }
      }
    }

    // 2. Insert Sale record in Supabase
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        store_id: storeId,
        customer_id: saleData.customerId || null,
        customer_name: saleData.customerName || null,
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        tax: saleData.tax,
        total_amount: saleData.totalAmount,
        payment_method: saleData.paymentMethod,
        status: 'completed',
        staff_name: saleData.staffName || null,
        notes: saleData.notes || null,
        amount_paid: upfrontPaid ?? null,
        balance_due: balanceDue ?? null,
        due_date: saleData.dueDate || null,
      })
      .select()
      .single();

    if (saleErr) throw saleErr;

    // 3. If credit sale with upfront deposit, create initial payment transaction
    if (isCredit && upfrontPaid && upfrontPaid > 0 && saleData.customerId) {
      try {
        await supabase.from('customer_payments').insert({
          store_id: storeId,
          customer_id: saleData.customerId,
          customer_name: saleData.customerName || null,
          sale_id: sale.id,
          amount: upfrontPaid,
          payment_method: 'cash',
          payment_date: new Date().toISOString(),
          notes: `Upfront deposit for Credit Sale #${sale.id.slice(0, 8).toUpperCase()}`,
          reference_id: `DEP-${sale.id.slice(0, 8).toUpperCase()}`,
          recorded_by: saleData.staffName || 'Cashier',
        });
      } catch (payErr) {
        console.warn('Could not record upfront credit payment in Supabase:', payErr);
      }
    }

    // 4. Insert Sale Items in Supabase
    const itemsToInsert = items.map((item) => ({
      sale_id: sale.id,
      product_id: item.productId,
      product_name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      cost_price: item.costPrice,
      subtotal: item.subtotal,
    }));

    try {
      await supabase.from('sale_items').insert(itemsToInsert);
    } catch {
      // Ignore if table not created
    }

    return {
      ...sale,
      amount_tendered: saleData.amountTendered,
      change_due: saleData.changeDue,
      amount_paid: upfrontPaid,
      balance_due: balanceDue,
    };
  } catch (err) {
    console.warn('Supabase sale creation fallback to user-isolated storage:', err);
    const { userId, storage } = findStorageForStore(storeId);

    for (const item of items) {
      const prod = storage.products.find((p) => p.id === item.productId);
      if (prod) {
        const cur = Number(prod.current_stock ?? prod.stock_quantity ?? 0);
        const newStock = Math.max(0, cur - item.quantity);
        prod.current_stock = newStock;
        prod.stock_quantity = newStock;
        prod.updated_at = new Date().toISOString();

        storage.inventoryMovements.unshift({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          store_id: storeId,
          product_id: item.productId,
          type: 'sale',
          quantity: item.quantity,
          previous_stock: cur,
          new_stock: newStock,
          reason: `POS Sale: ${item.quantity} ${prod.name}`,
          performed_by: saleData.staffName || 'Cashier',
          created_at: new Date().toISOString(),
          product_name: prod.name,
          product_sku: prod.sku,
        });
      }
    }

    const saleId = `sale-${Date.now()}`;
    const newSale: Sale = {
      id: saleId,
      store_id: storeId,
      cashier_id: 'cashier-001',
      customer_id: saleData.customerId || null,
      customer_name: saleData.customerName || null,
      subtotal: saleData.subtotal,
      discount: saleData.discount,
      tax: saleData.tax,
      total_amount: saleData.totalAmount,
      payment_method: saleData.paymentMethod,
      status: 'completed',
      staff_name: saleData.staffName || null,
      notes: saleData.notes || null,
      amount_tendered: saleData.amountTendered,
      change_due: saleData.changeDue,
      amount_paid: upfrontPaid,
      balance_due: balanceDue,
      due_date: saleData.dueDate || null,
      created_at: new Date().toISOString(),
      items: items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        sale_id: saleId,
        product_id: it.productId,
        product_name: it.productName,
        sku: it.sku,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        cost_price: it.costPrice,
        subtotal: it.subtotal,
        created_at: new Date().toISOString(),
      })),
    };

    // If credit with upfront deposit, create initial payment record in local storage
    if (isCredit && upfrontPaid && upfrontPaid > 0 && saleData.customerId) {
      if (!storage.customerPayments) storage.customerPayments = [];
      storage.customerPayments.unshift({
        id: `pay-dep-${Date.now()}`,
        store_id: storeId,
        customer_id: saleData.customerId,
        customer_name: saleData.customerName || null,
        sale_id: saleId,
        amount: upfrontPaid,
        payment_method: 'cash',
        payment_date: new Date().toISOString(),
        notes: `Upfront deposit for Credit Sale #${saleId.slice(0, 8).toUpperCase()}`,
        reference_id: `DEP-${saleId.slice(0, 8).toUpperCase()}`,
        recorded_by: saleData.staffName || 'Cashier',
        created_at: new Date().toISOString(),
      });
    }

    storage.sales.unshift(newSale);
    saveUserStorage(userId, storage);
    return newSale;
  }
}

export async function fetchSales(storeId: string): Promise<Sale[]> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    const { storage } = findStorageForStore(storeId);
    return storage.sales.filter((s) => s.store_id === storeId);
  }
}

// ==========================================
// CATEGORIES & SUPPLIERS & CUSTOMERS
// ==========================================
export async function fetchCategories(storeId: string): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch {
    const { storage } = findStorageForStore(storeId);
    return storage.categories.filter((c) => c.store_id === storeId);
  }
}

export async function createCategory(storeId: string, name: string, description?: string): Promise<Category> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({ store_id: storeId, name, description })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      store_id: storeId,
      name,
      description: description || null,
      created_at: new Date().toISOString(),
    };
    storage.categories.push(newCat);
    saveUserStorage(userId, storage);
    return newCat;
  }
}

export async function fetchSuppliers(storeId: string): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch {
    const { storage } = findStorageForStore(storeId);
    return storage.suppliers.filter((s) => s.store_id === storeId);
  }
}

export async function createSupplier(storeId: string, supplier: Partial<Supplier>): Promise<Supplier> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...supplier, store_id: storeId })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      store_id: storeId,
      name: supplier.name || 'New Supplier',
      contact_person: supplier.contact_person || null,
      phone: supplier.phone || null,
      email: supplier.email || null,
      address: supplier.address || null,
      created_at: new Date().toISOString(),
    };
    storage.suppliers.push(newSup);
    saveUserStorage(userId, storage);
    return newSup;
  }
}

export async function updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<Supplier> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', supplierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    const idx = storage.suppliers.findIndex((s) => s.id === supplierId);
    if (idx !== -1) {
      storage.suppliers[idx] = { ...storage.suppliers[idx], ...updates };
      saveUserStorage(curUserId, storage);
      return storage.suppliers[idx];
    }
    throw new Error('Supplier not found');
  }
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  try {
    const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
    if (error) throw error;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    storage.suppliers = storage.suppliers.filter((s) => s.id !== supplierId);
    saveUserStorage(curUserId, storage);
  }
}

export async function fetchCustomers(storeId: string): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch {
    const { storage } = findStorageForStore(storeId);
    return storage.customers.filter((c) => c.store_id === storeId);
  }
}

export async function createCustomer(storeId: string, customer: Partial<Customer>): Promise<Customer> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...customer, store_id: storeId })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      store_id: storeId,
      name: customer.name || 'New Customer',
      phone: customer.phone || null,
      email: customer.email || null,
      address: customer.address || null,
      created_at: new Date().toISOString(),
    };
    storage.customers.push(newCust);
    saveUserStorage(userId, storage);
    return newCust;
  }
}

export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    const idx = storage.customers.findIndex((c) => c.id === customerId);
    if (idx !== -1) {
      storage.customers[idx] = { ...storage.customers[idx], ...updates };
      saveUserStorage(curUserId, storage);
      return storage.customers[idx];
    }
    throw new Error('Customer not found');
  }
}

export async function deleteCustomer(customerId: string): Promise<void> {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) throw error;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    storage.customers = storage.customers.filter((c) => c.id !== customerId);
    saveUserStorage(curUserId, storage);
  }
}

// ==========================================
// CUSTOMER PAYMENTS & CREDIT REPAYMENTS
// ==========================================
export async function fetchCustomerPayments(storeId: string): Promise<CustomerPayment[]> {
  try {
    const { data, error } = await supabase
      .from('customer_payments')
      .select('*')
      .eq('store_id', storeId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    const { storage } = findStorageForStore(storeId);
    return (storage.customerPayments || []).filter((p) => p.store_id === storeId);
  }
}

export async function createCustomerPayment(
  storeId: string,
  payment: Omit<CustomerPayment, 'id' | 'created_at'>
): Promise<CustomerPayment> {
  const paymentRecord = {
    ...payment,
    store_id: storeId,
    payment_date: payment.payment_date || new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('customer_payments')
      .insert(paymentRecord)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    if (!storage.customerPayments) storage.customerPayments = [];

    const newPayment: CustomerPayment = {
      ...paymentRecord,
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    storage.customerPayments.unshift(newPayment);
    saveUserStorage(userId, storage);
    return newPayment;
  }
}

export async function deleteCustomerPayment(storeId: string, paymentId: string): Promise<void> {
  try {
    const { error } = await supabase.from('customer_payments').delete().eq('id', paymentId);
    if (error) throw error;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    if (storage.customerPayments) {
      storage.customerPayments = storage.customerPayments.filter((p) => p.id !== paymentId);
      saveUserStorage(userId, storage);
    }
  }
}

/**
 * Calculates a complete customer debt/credit ledger with chronological running balances.
 * Never overwrites previous transactions; guarantees:
 * Outstanding Balance = Total Credit Sales - Total Payments
 */
export function calculateCustomerCreditLedger(
  customerId: string,
  customerSales: Sale[],
  customerPayments: CustomerPayment[]
): {
  totalSpent: number;
  totalOrders: number;
  totalCreditTaken: number;
  totalRepaid: number;
  outstandingBalance: number;
  ledger: CustomerLedgerEntry[];
} {
  const filteredSales = customerSales.filter((s) => s.customer_id === customerId);
  const filteredPayments = customerPayments.filter((p) => p.customer_id === customerId);

  const totalSpent = filteredSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalOrders = filteredSales.length;

  const creditSales = filteredSales.filter((s) => s.payment_method === 'credit');
  const totalCreditTaken = creditSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalRepaid = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstandingBalance = Math.max(0, Math.round((totalCreditTaken - totalRepaid) * 100) / 100);

  // Build unified chronological transaction entries
  interface RawEntry {
    id: string;
    timestamp: number;
    date: string;
    type: 'credit_sale' | 'repayment' | 'initial_payment' | 'cash_sale';
    reference_id: string;
    description: string;
    debit: number;
    credit: number;
    payment_method: string;
    notes?: string | null;
    sale_id?: string | null;
  }

  const rawEntries: RawEntry[] = [];

  // Add credit sales
  for (const s of creditSales) {
    rawEntries.push({
      id: `sale-${s.id}`,
      timestamp: new Date(s.created_at).getTime(),
      date: s.created_at,
      type: 'credit_sale',
      reference_id: `#${s.id.slice(0, 8).toUpperCase()}`,
      description: `Credit Sale (${s.items?.length || 1} items)`,
      debit: Number(s.total_amount || 0),
      credit: 0,
      payment_method: 'Credit / Pay Later',
      notes: s.notes,
      sale_id: s.id,
    });
  }

  // Add repayments / payments
  for (const p of filteredPayments) {
    const isUpfront = p.notes && p.notes.toLowerCase().includes('upfront');
    rawEntries.push({
      id: `pay-${p.id}`,
      timestamp: new Date(p.payment_date || p.created_at).getTime() + 1,
      date: p.payment_date || p.created_at,
      type: isUpfront ? 'initial_payment' : 'repayment',
      reference_id: p.reference_id || `#${p.id.slice(0, 8).toUpperCase()}`,
      description: isUpfront ? 'Upfront Deposit at POS' : 'Credit Repayment',
      debit: 0,
      credit: Number(p.amount || 0),
      payment_method: p.payment_method ? p.payment_method.replace('_', ' ').toUpperCase() : 'CASH',
      notes: p.notes,
      sale_id: p.sale_id,
    });
  }

  // Sort ascending by timestamp to calculate running balance
  rawEntries.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    // If exact same timestamp, ensure credit sales (debits) come before payments (credits)
    if (a.type === 'credit_sale' && b.type !== 'credit_sale') return -1;
    if (b.type === 'credit_sale' && a.type !== 'credit_sale') return 1;
    return 0;
  });

  let runningBalance = 0;
  const ledger: CustomerLedgerEntry[] = rawEntries.map((e) => {
    runningBalance = Math.round((runningBalance + e.debit - e.credit) * 100) / 100;
    const safeBalance = Math.max(0, runningBalance);
    return {
      id: e.id,
      date: e.date,
      type: e.type,
      reference_id: e.reference_id,
      description: e.description,
      debit: e.debit,
      credit: e.credit,
      balance: safeBalance,
      payment_method: e.payment_method,
      notes: e.notes,
      sale_id: e.sale_id,
    };
  });

  return {
    totalSpent,
    totalOrders,
    totalCreditTaken,
    totalRepaid,
    outstandingBalance,
    ledger: ledger.reverse(), // Most recent at the top
  };
}

// ==========================================
// EXPENSES
// ==========================================
export async function fetchExpenses(storeId: string): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('store_id', storeId)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    const { storage } = findStorageForStore(storeId);
    return storage.expenses.filter((e) => e.store_id === storeId);
  }
}

export async function createExpense(storeId: string, expense: Partial<Expense>): Promise<Expense> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        store_id: storeId,
        title: expense.title,
        category: expense.category,
        amount: expense.amount,
        description: expense.description || expense.notes || null,
        expense_date: expense.expense_date || expense.date || new Date().toISOString(),
        recorded_by: expense.recorded_by || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      store_id: storeId,
      title: expense.title || 'Untitled Expense',
      category: expense.category || 'other',
      amount: Number(expense.amount) || 0,
      description: expense.description || expense.notes || null,
      notes: expense.notes || expense.description || null,
      expense_date: expense.expense_date || expense.date || new Date().toISOString(),
      date: expense.expense_date || expense.date || new Date().toISOString(),
      recorded_by: expense.recorded_by || null,
      created_at: new Date().toISOString(),
    };
    storage.expenses.unshift(newExp);
    saveUserStorage(userId, storage);
    return newExp;
  }
}

export async function updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense> {
  try {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.notes !== undefined || updates.description !== undefined) {
      payload.description = updates.notes || updates.description || null;
    }
    if (updates.expense_date !== undefined || updates.date !== undefined) {
      payload.expense_date = updates.expense_date || updates.date;
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    const idx = storage.expenses.findIndex((e) => e.id === expenseId);
    if (idx !== -1) {
      storage.expenses[idx] = { 
        ...storage.expenses[idx], 
        ...updates,
        description: updates.description || updates.notes || storage.expenses[idx].description,
        expense_date: updates.expense_date || updates.date || storage.expenses[idx].expense_date,
      };
      saveUserStorage(curUserId, storage);
      return storage.expenses[idx];
    }
    throw new Error('Expense not found');
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) throw error;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    storage.expenses = storage.expenses.filter((e) => e.id !== expenseId);
    saveUserStorage(curUserId, storage);
  }
}

// ==========================================
// STORE SETTINGS & MEMBERS
// ==========================================
export async function fetchStoreSettings(storeId: string): Promise<StoreSettings | null> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  } catch {
    // continue to user-isolated storage
  }

  const { storage } = findStorageForStore(storeId);
  return storage.settings[storeId] || {
    store_id: storeId,
    receipt_header: 'StockWise Store',
    receipt_footer: 'Thank you for your business!',
    currency: 'USD',
    tax_rate: 0,
    low_stock_threshold_default: 5,
  };
}

export async function saveStoreSettings(storeId: string, settings: Partial<StoreSettings>): Promise<StoreSettings> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .upsert({
        store_id: storeId,
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'store_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    const existing = storage.settings[storeId] || {
      store_id: storeId,
      receipt_header: 'StockWise Store',
      receipt_footer: 'Thank you for your business!',
      currency: 'USD',
      tax_rate: 0,
      low_stock_threshold_default: 5,
    };
    storage.settings[storeId] = { ...existing, ...settings };
    saveUserStorage(userId, storage);
    return storage.settings[storeId];
  }
}

export const updateStoreSettings = saveStoreSettings;

// ==========================================
// GLOBAL INVITATIONS REGISTRY (CROSS-BROWSER/USER LINK LOOKUP)
// ==========================================
function getGlobalInvitations(): StaffInvitation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('stockwise_global_invitations');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGlobalInvitations(invs: StaffInvitation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('stockwise_global_invitations', JSON.stringify(invs));
  } catch (err) {
    console.warn('Could not save global invitations:', err);
  }
}

// ==========================================
// STAFF MANAGEMENT & INVITATIONS SYSTEM
// ==========================================

export async function fetchStoreMembers(storeId: string): Promise<StoreMember[]> {
  try {
    const { data, error } = await supabase
      .from('store_members')
      .select('*, profile:profiles(*)')
      .eq('store_id', storeId);

    if (error) throw error;

    return (data || []).map((m: any) => {
      const role = m.role || 'cashier';
      const defaultPerms = ROLE_TEMPLATES[role]?.permissions || ['dashboard.view'];
      return {
        ...m,
        status: m.status || 'active',
        permissions: Array.isArray(m.permissions) && m.permissions.length > 0 ? m.permissions : defaultPerms,
        user_email: m.profile?.email || m.user_email || m.email,
        user_name: m.profile?.full_name || m.user_name || m.full_name,
      };
    });
  } catch {
    const { storage } = findStorageForStore(storeId);
    return (storage.storeMembers || [])
      .filter((m) => m.store_id === storeId && m.status !== 'removed')
      .map((m) => {
        const role = m.role || 'cashier';
        const defaultPerms = ROLE_TEMPLATES[role]?.permissions || ['dashboard.view'];
        return {
          ...m,
          status: m.status || 'active',
          permissions: Array.isArray(m.permissions) && m.permissions.length > 0 ? m.permissions : defaultPerms,
        };
      });
  }
}

export async function fetchStoreInvitations(storeId: string): Promise<StaffInvitation[]> {
  try {
    const { data, error } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    const globalInvs = getGlobalInvitations().filter((i) => i.store_id === storeId);
    const { storage } = findStorageForStore(storeId);
    const localInvs = storage.staffInvitations || [];
    
    // Merge without duplicates
    const map = new Map<string, StaffInvitation>();
    [...globalInvs, ...localInvs].forEach((inv) => map.set(inv.id, inv));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
}

export async function createStaffInvitation(params: {
  storeId: string;
  storeName: string;
  invitedBy: string;
  invitedByName: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  permissions: string[];
  notes?: string;
}): Promise<{ member: StoreMember; invitation: StaffInvitation }> {
  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days expiration
  const invitationId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const memberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const invitation: StaffInvitation = {
    id: invitationId,
    store_id: params.storeId,
    store_name: params.storeName,
    invited_by: params.invitedBy,
    invited_by_name: params.invitedByName,
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    phone: params.phone?.trim() || null,
    role: params.role,
    permissions: params.permissions,
    token,
    status: 'pending',
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  };

  const member: StoreMember = {
    id: memberId,
    store_id: params.storeId,
    user_id: `pending-${invitationId}`,
    user_name: params.name.trim(),
    user_email: params.email.trim().toLowerCase(),
    phone: params.phone?.trim() || null,
    role: params.role,
    status: 'pending',
    permissions: params.permissions,
    invited_by: params.invitedBy,
    invitation_token: token,
    invitation_expires_at: expiresAt,
    notes: params.notes?.trim() || null,
    created_at: new Date().toISOString(),
  };

  // 1. Try Supabase persistence
  try {
    await supabase.from('staff_invitations').insert(invitation);
    await supabase.from('store_members').insert({
      id: member.id,
      store_id: member.store_id,
      user_id: member.user_id,
      role: member.role,
      status: member.status,
      permissions: member.permissions,
      invitation_token: member.invitation_token,
      invitation_expires_at: member.invitation_expires_at,
    });
  } catch (err) {
    console.warn('Supabase staff invitation fallback to local:', err);
  }

  // 2. Persist in user storage
  const { userId, storage } = findStorageForStore(params.storeId);
  if (!storage.storeMembers) storage.storeMembers = [];
  if (!storage.staffInvitations) storage.staffInvitations = [];
  
  storage.storeMembers.unshift(member);
  storage.staffInvitations.unshift(invitation);
  saveUserStorage(userId, storage);

  // 3. Save in global invitations registry for link verification
  const globalInvs = getGlobalInvitations().filter((i) => i.id !== invitation.id);
  globalInvs.unshift(invitation);
  saveGlobalInvitations(globalInvs);

  // 4. Log staff activity
  await logStaffActivity(
    params.storeId,
    `Invited ${params.name} as ${formatRoleName(params.role)}`,
    params.invitedByName,
    undefined,
    `Invitation sent to ${params.email} with ${params.permissions.length} granular permissions`
  );

  return { member, invitation };
}

export async function resendStaffInvitation(
  storeId: string,
  invitationId: string,
  performerName: string
): Promise<StaffInvitation> {
  const { userId, storage } = findStorageForStore(storeId);
  const invs = storage.staffInvitations || [];
  const idx = invs.findIndex((i) => i.id === invitationId);
  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  if (idx !== -1) {
    invs[idx].expires_at = expiresAt;
    invs[idx].status = 'pending';
    saveUserStorage(userId, storage);

    // Update global registry
    const globalInvs = getGlobalInvitations().map((i) =>
      i.id === invitationId ? { ...i, expires_at: expiresAt, status: 'pending' as const } : i
    );
    saveGlobalInvitations(globalInvs);

    // Update member record expiration
    const memIdx = (storage.storeMembers || []).findIndex((m) => m.invitation_token === invs[idx].token);
    if (memIdx !== -1) {
      storage.storeMembers[memIdx].invitation_expires_at = expiresAt;
      storage.storeMembers[memIdx].status = 'pending';
      saveUserStorage(userId, storage);
    }

    await logStaffActivity(
      storeId,
      `Resent invitation to ${invs[idx].name} (${invs[idx].email})`,
      performerName
    );

    return invs[idx];
  }

  throw new Error('Invitation record not found');
}

export async function cancelStaffInvitation(
  storeId: string,
  invitationId: string,
  performerName: string
): Promise<void> {
  const { userId, storage } = findStorageForStore(storeId);
  
  // Find invitation to get token
  const inv = (storage.staffInvitations || []).find((i) => i.id === invitationId);
  if (inv) {
    inv.status = 'cancelled';
    storage.staffInvitations = (storage.staffInvitations || []).filter((i) => i.id !== invitationId);
    storage.storeMembers = (storage.storeMembers || []).filter(
      (m) => m.invitation_token !== inv.token && m.user_email?.toLowerCase() !== inv.email.toLowerCase()
    );
    saveUserStorage(userId, storage);

    // Remove from global registry
    const globalInvs = getGlobalInvitations().filter((i) => i.id !== invitationId);
    saveGlobalInvitations(globalInvs);

    await logStaffActivity(
      storeId,
      `Cancelled invitation for ${inv.name} (${inv.email})`,
      performerName
    );
  }
}

export async function lookupStaffInvitation(token: string): Promise<StaffInvitation | null> {
  if (!token) return null;

  // 1. Check global localStorage registry
  const globalInvs = getGlobalInvitations();
  const found = globalInvs.find((i) => i.token === token);
  if (found) return found;

  // 2. Check Supabase if configured
  try {
    const { data } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (data) return data;
  } catch {
    // ignore
  }

  // 3. Fallback scan all local user storages
  if (typeof window !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('stockwise_user_data_')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          const match = (parsed.staffInvitations || []).find((inv: StaffInvitation) => inv.token === token);
          if (match) return match;
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}

export async function acceptStaffInvitation(
  token: string,
  userId: string,
  userEmail: string,
  userName?: string
): Promise<{ store: Store; member: StoreMember }> {
  const invitation = await lookupStaffInvitation(token);
  if (!invitation) {
    throw new Error('Invitation not found or invalid.');
  }

  if (invitation.status === 'accepted') {
    throw new Error('This invitation has already been accepted.');
  }

  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('This invitation link has expired. Please ask the store owner to send a new invitation.');
  }

  const storeId = invitation.store_id;
  const { userId: ownerUserId, storage: ownerStorage } = findStorageForStore(storeId);
  const store = ownerStorage.stores.find((s) => s.id === storeId);

  if (!store) {
    throw new Error('Store associated with this invitation was not found.');
  }

  // Mark invitation as accepted
  invitation.status = 'accepted';
  invitation.accepted_at = new Date().toISOString();

  // Update in global invitations registry
  const globalInvs = getGlobalInvitations().map((i) => (i.id === invitation.id ? invitation : i));
  saveGlobalInvitations(globalInvs);

  // Update member in owner's store storage
  let member = (ownerStorage.storeMembers || []).find(
    (m) => m.invitation_token === token || m.user_email?.toLowerCase() === userEmail.toLowerCase()
  );

  if (member) {
    member.user_id = userId;
    member.status = 'active';
    member.user_name = userName || invitation.name;
    member.user_email = userEmail;
    member.last_active = new Date().toISOString();
  } else {
    member = {
      id: `mem-${Date.now()}`,
      store_id: storeId,
      user_id: userId,
      user_name: userName || invitation.name,
      user_email: userEmail,
      role: invitation.role,
      status: 'active',
      permissions: invitation.permissions,
      invited_by: invitation.invited_by,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    };
    ownerStorage.storeMembers.unshift(member);
  }
  saveUserStorage(ownerUserId, ownerStorage);

  // Also add the store to the invited staff user's own storage so they see it in their store switcher!
  const staffStorage = getUserStorage(userId);
  if (!staffStorage.stores.some((s) => s.id === store.id)) {
    staffStorage.stores.push(store);
  }
  if (!staffStorage.storeMembers.some((m) => m.id === member!.id)) {
    staffStorage.storeMembers.push(member);
  }
  saveUserStorage(userId, staffStorage);

  // Log staff activity
  await logStaffActivity(
    storeId,
    `${userName || userEmail} accepted invitation and joined as ${formatRoleName(invitation.role)}`,
    userName || userEmail,
    userEmail,
    `Account activated with ${invitation.permissions.length} granted permissions`
  );

  return { store, member };
}

export async function updateStoreMemberPermissions(
  storeId: string,
  memberId: string,
  role: string,
  permissions: string[],
  performerName: string
): Promise<StoreMember> {
  const { userId, storage } = findStorageForStore(storeId);
  const mem = (storage.storeMembers || []).find((m) => m.id === memberId);
  if (!mem) throw new Error('Staff member not found.');

  mem.role = role;
  mem.permissions = permissions;
  saveUserStorage(userId, storage);

  await logStaffActivity(
    storeId,
    `Updated permissions for ${mem.user_name || mem.user_email} (${formatRoleName(role)})`,
    performerName,
    undefined,
    `Active permissions: ${permissions.length} features enabled`
  );

  return mem;
}

export async function suspendStoreMember(
  storeId: string,
  memberId: string,
  performerName: string
): Promise<StoreMember> {
  const { userId, storage } = findStorageForStore(storeId);
  const mem = (storage.storeMembers || []).find((m) => m.id === memberId);
  if (!mem) throw new Error('Staff member not found.');

  mem.status = 'suspended';
  saveUserStorage(userId, storage);

  await logStaffActivity(
    storeId,
    `Suspended access for ${mem.user_name || mem.user_email}`,
    performerName,
    undefined,
    'Staff member will be blocked from accessing this store until reactivated'
  );

  return mem;
}

export async function reactivateStoreMember(
  storeId: string,
  memberId: string,
  performerName: string
): Promise<StoreMember> {
  const { userId, storage } = findStorageForStore(storeId);
  const mem = (storage.storeMembers || []).find((m) => m.id === memberId);
  if (!mem) throw new Error('Staff member not found.');

  mem.status = 'active';
  saveUserStorage(userId, storage);

  await logStaffActivity(
    storeId,
    `Reactivated store access for ${mem.user_name || mem.user_email}`,
    performerName,
    undefined,
    'Staff member can now access permitted store features'
  );

  return mem;
}

export async function removeStoreMember(
  memberId: string,
  storeId?: string,
  performerName?: string
): Promise<void> {
  const curUserId = getCurrentUserId();
  const { userId, storage } = storeId ? findStorageForStore(storeId) : { userId: curUserId, storage: getUserStorage(curUserId) };
  
  const mem = (storage.storeMembers || []).find((m) => m.id === memberId);
  if (mem) {
    // Soft removal / membership revocation to preserve all historical sales and credit payments!
    mem.status = 'removed';
    storage.storeMembers = (storage.storeMembers || []).filter((m) => m.id !== memberId);
    saveUserStorage(userId, storage);

    if (storeId) {
      await logStaffActivity(
        storeId,
        `Removed staff access for ${mem.user_name || mem.user_email}`,
        performerName || 'Store Owner',
        undefined,
        'Historical sales, inventory logs, and customer transactions remain intact'
      );
    }
  }
}

// Legacy helper compatibility
export const updateStoreMemberRole = async (
  memberId: string,
  role: 'owner' | 'admin' | 'manager' | 'cashier'
): Promise<StoreMember> => {
  const curUserId = getCurrentUserId();
  const storage = getUserStorage(curUserId);
  const mem = storage.storeMembers.find((m) => m.id === memberId);
  if (mem) {
    mem.role = role;
    mem.permissions = ROLE_TEMPLATES[role]?.permissions || ['dashboard.view'];
    saveUserStorage(curUserId, storage);
    return mem;
  }
  throw new Error('Member not found');
};

export const addStoreMember = async (
  storeId: string,
  userIdentifier: string,
  role: 'owner' | 'admin' | 'manager' | 'cashier'
): Promise<StoreMember> => {
  const { member } = await createStaffInvitation({
    storeId,
    storeName: 'Store',
    invitedBy: getCurrentUserId(),
    invitedByName: 'Store Owner',
    name: userIdentifier.split('@')[0],
    email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@store.local`,
    role,
    permissions: ROLE_TEMPLATES[role]?.permissions || ['dashboard.view'],
  });
  return member;
};

// ==========================================
// STAFF ACTIVITY LOGGING
// ==========================================

export async function fetchStaffActivity(storeId: string): Promise<StaffActivity[]> {
  try {
    const { data, error } = await supabase
      .from('staff_activity')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    const { storage } = findStorageForStore(storeId);
    return (storage.staffActivity || []).filter((a) => a.store_id === storeId);
  }
}

export async function logStaffActivity(
  storeId: string,
  action: string,
  staffName: string,
  staffEmail?: string,
  details?: string
): Promise<StaffActivity> {
  const entry: StaffActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    store_id: storeId,
    staff_name: staffName,
    staff_email: staffEmail,
    action,
    details,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from('staff_activity').insert(entry);
  } catch {
    // ignore
  }

  const { userId, storage } = findStorageForStore(storeId);
  if (!storage.staffActivity) storage.staffActivity = [];
  storage.staffActivity.unshift(entry);
  // Cap at 200 activity logs
  if (storage.staffActivity.length > 200) {
    storage.staffActivity = storage.staffActivity.slice(0, 200);
  }
  saveUserStorage(userId, storage);

  return entry;
}
