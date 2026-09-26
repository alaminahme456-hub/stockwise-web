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
  PaymentMethod
} from '../types';

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
      };
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
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
      })
      .select()
      .single();

    if (saleErr) throw saleErr;

    // 3. Insert Sale Items in Supabase
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

    return sale;
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

export async function fetchStoreMembers(storeId: string): Promise<StoreMember[]> {
  try {
    const { data, error } = await supabase
      .from('store_members')
      .select('*, profile:profiles(*)')
      .eq('store_id', storeId);

    if (error) throw error;

    return (data || []).map((m: any) => ({
      ...m,
      user_email: m.profile?.email || m.email,
      user_name: m.profile?.full_name || m.full_name,
    }));
  } catch {
    const { storage } = findStorageForStore(storeId);
    return storage.storeMembers.filter((m) => m.store_id === storeId);
  }
}

export async function addStoreMember(
  storeId: string, 
  userIdentifier: string, 
  role: 'owner' | 'admin' | 'manager' | 'cashier'
): Promise<StoreMember> {
  try {
    let targetUserId = userIdentifier;
    if (userIdentifier.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userIdentifier.toLowerCase().trim())
        .maybeSingle();

      if (profile) {
        targetUserId = profile.id;
      }
    }

    const { data, error } = await supabase
      .from('store_members')
      .insert({
        store_id: storeId,
        user_id: targetUserId,
        role,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const { userId, storage } = findStorageForStore(storeId);
    const newMember: StoreMember = {
      id: `mem-${Date.now()}`,
      store_id: storeId,
      user_id: `user-${Date.now()}`,
      role,
      user_name: userIdentifier.split('@')[0],
      user_email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@store.local`,
      created_at: new Date().toISOString(),
    };
    storage.storeMembers.push(newMember);
    saveUserStorage(userId, storage);
    return newMember;
  }
}

export async function updateStoreMemberRole(
  memberId: string, 
  role: 'owner' | 'admin' | 'manager' | 'cashier'
): Promise<StoreMember> {
  try {
    const { data, error } = await supabase
      .from('store_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    const idx = storage.storeMembers.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      storage.storeMembers[idx] = { ...storage.storeMembers[idx], role };
      saveUserStorage(curUserId, storage);
      return storage.storeMembers[idx];
    }
    throw new Error('Member not found');
  }
}

export async function removeStoreMember(memberId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('store_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  } catch {
    const curUserId = getCurrentUserId();
    const storage = getUserStorage(curUserId);
    storage.storeMembers = storage.storeMembers.filter((m) => m.id !== memberId);
    saveUserStorage(curUserId, storage);
  }
}
