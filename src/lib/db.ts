import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Store, 
  Product, 
  Category, 
  Supplier, 
  Customer, 
  Sale, 
  SaleItem, 
  Expense, 
  InventoryMovement, 
  StoreMember,
  StoreSettings,
  MovementType,
  PaymentMethod
} from '../types';
import { 
  getDemoStorage, 
  saveDemoStorage, 
  isDemoActive, 
  DEMO_ACCOUNTS 
} from './demoData';

function shouldUseDemo(): boolean {
  return isDemoActive() || !isSupabaseConfigured;
}

// ==========================================
// STORES
// ==========================================
export async function fetchUserStores(userId: string): Promise<Store[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.stores;
  }

  try {
    // Query stores owned by user or where user is member
    const { data: ownedStores, error: ownedError } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true });

    if (ownedError) throw ownedError;

    const { data: memberStores, error: memberError } = await supabase
      .from('store_members')
      .select('store:stores(*)')
      .eq('user_id', userId);

    if (memberError) throw memberError;

    const memberList: Store[] = (memberStores || [])
      .map((m: any) => m.store)
      .filter(Boolean);

    // Combine and deduplicate by id
    const storeMap = new Map<string, Store>();
    (ownedStores || []).forEach((s: Store) => storeMap.set(s.id, s));
    memberList.forEach((s: Store) => storeMap.set(s.id, s));

    const result = Array.from(storeMap.values());
    return result.length > 0 ? result : getDemoStorage().stores;
  } catch (err) {
    console.warn('Supabase fetchUserStores failed, falling back to demo storage:', err);
    return getDemoStorage().stores;
  }
}

export async function createStore(
  ownerId: string, 
  name: string, 
  currency: string = 'USD', 
  details?: Partial<Store>
): Promise<Store> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const newStore: Store = {
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
    storage.stores.push(newStore);
    storage.storeMembers.push({
      id: `mem-${Date.now()}`,
      store_id: newStore.id,
      user_id: ownerId,
      role: 'owner',
      user_name: 'Store Owner',
      created_at: new Date().toISOString(),
    });
    storage.settings[newStore.id] = {
      store_id: newStore.id,
      receipt_header: name,
      receipt_footer: 'Thank you for your business!',
      currency,
      tax_rate: 0,
      low_stock_threshold_default: 5,
    };
    saveDemoStorage(storage);
    return newStore;
  }

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

  // Also add owner to store_members
  await supabase.from('store_members').insert({
    store_id: data.id,
    user_id: ownerId,
    role: 'owner',
  });

  // Create default categories for convenience
  const defaultCats = ['Beverages', 'Food & Snacks', 'Electronics', 'Personal Care', 'General Goods'];
  for (const catName of defaultCats) {
    await supabase.from('categories').insert({
      store_id: data.id,
      name: catName,
    });
  }

  // Initialize store settings
  await supabase.from('store_settings').insert({
    store_id: data.id,
    receipt_header: name,
    receipt_footer: 'Thank you for your business!',
    currency: currency,
    tax_rate: 0,
  });

  return data;
}

export async function updateStore(storeId: string, updates: Partial<Store>): Promise<Store> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const idx = storage.stores.findIndex((s) => s.id === storeId);
    if (idx !== -1) {
      storage.stores[idx] = { ...storage.stores[idx], ...updates };
      saveDemoStorage(storage);
      return storage.stores[idx];
    }
  }

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
}

// ==========================================
// PRODUCTS
// ==========================================
export async function fetchProducts(storeId: string): Promise<Product[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.products.filter((p) => p.store_id === storeId);
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchProducts failed, using demo fallback:', err);
    return getDemoStorage().products.filter((p) => p.store_id === storeId);
  }
}

export async function createProduct(
  productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
  initialQuantity: number,
  userId: string,
  userEmail?: string
): Promise<Product> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      current_stock: initialQuantity,
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
    saveDemoStorage(storage);
    return newProd;
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...productData,
      current_stock: initialQuantity,
    })
    .select()
    .single();

  if (error) throw error;

  // Log initial inventory movement if quantity > 0
  if (initialQuantity > 0) {
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
  }

  return data;
}

export async function updateProduct(
  productId: string, 
  updates: Partial<Product>
): Promise<Product> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const idx = storage.products.findIndex((p) => p.id === productId);
    if (idx !== -1) {
      storage.products[idx] = { 
        ...storage.products[idx], 
        ...updates, 
        updated_at: new Date().toISOString() 
      };
      saveDemoStorage(storage);
      return storage.products[idx];
    }
  }

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
}

export async function deleteProduct(productId: string): Promise<void> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    storage.products = storage.products.filter((p) => p.id !== productId);
    saveDemoStorage(storage);
    return;
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) throw error;
}

// ==========================================
// INVENTORY & MOVEMENTS
// ==========================================
export async function fetchInventoryMovements(storeId: string): Promise<InventoryMovement[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
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
  } catch (err) {
    console.warn('Supabase fetchInventoryMovements failed, using demo fallback:', err);
    return getDemoStorage().inventoryMovements.filter((m) => m.store_id === storeId);
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
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const prod = storage.products.find((p) => p.id === productId);
    if (!prod) throw new Error('Product not found');

    const current = Number(prod.current_stock) || 0;
    let newStock = current;

    if (type === 'addition') {
      newStock = current + quantity;
    } else if (type === 'reduction') {
      newStock = Math.max(0, current - quantity);
    } else if (type === 'adjustment') {
      newStock = quantity;
    }

    prod.current_stock = newStock;
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
    saveDemoStorage(storage);
    return { product: prod, movement: mov };
  }

  // First fetch current product stock
  const { data: prod, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (fetchErr) throw fetchErr;

  const current = Number(prod.current_stock) || 0;
  let newStock = current;

  if (type === 'addition') {
    newStock = current + quantity;
  } else if (type === 'reduction') {
    newStock = Math.max(0, current - quantity);
  } else if (type === 'adjustment') {
    newStock = quantity; // direct reset
  }

  // Update product stock
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

  // Insert movement record
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
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    // 1. Deduct stock for each product in demo storage
    for (const item of items) {
      const prod = storage.products.find((p) => p.id === item.productId);
      if (prod) {
        const cur = Number(prod.current_stock) || 0;
        const newStock = Math.max(0, cur - item.quantity);
        prod.current_stock = newStock;
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
    saveDemoStorage(storage);
    return newSale;
  }

  // 1. Verify and deduct stock for each product in real-time
  for (const item of items) {
    const { data: prod, error: prodErr } = await supabase
      .from('products')
      .select('current_stock, name')
      .eq('id', item.productId)
      .single();

    if (prodErr) throw prodErr;

    const currentStock = Number(prod.current_stock) || 0;
    const newStock = Math.max(0, currentStock - item.quantity);

    // Update product stock
    const { error: stockUpdateErr } = await supabase
      .from('products')
      .update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.productId);

    if (stockUpdateErr) throw stockUpdateErr;

    // Record stock movement
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
  }

  // 2. Insert Sale record
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

  // 3. Insert Sale Items
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

  const { error: itemsErr } = await supabase.from('sale_items').insert(itemsToInsert);
  if (itemsErr) throw itemsErr;

  return sale;
}

export async function fetchSales(storeId: string): Promise<Sale[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.sales.filter((s) => s.store_id === storeId);
  }

  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchSales failed, falling back to demo storage:', err);
    return getDemoStorage().sales.filter((s) => s.store_id === storeId);
  }
}

// ==========================================
// CATEGORIES & SUPPLIERS & CUSTOMERS
// ==========================================
export async function fetchCategories(storeId: string): Promise<Category[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.categories.filter((c) => c.store_id === storeId);
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchCategories failed, using demo fallback:', err);
    return getDemoStorage().categories.filter((c) => c.store_id === storeId);
  }
}

export async function createCategory(storeId: string, name: string, description?: string): Promise<Category> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      store_id: storeId,
      name,
      description: description || null,
      created_at: new Date().toISOString(),
    };
    storage.categories.push(newCat);
    saveDemoStorage(storage);
    return newCat;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ store_id: storeId, name, description })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchSuppliers(storeId: string): Promise<Supplier[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.suppliers.filter((s) => s.store_id === storeId);
  }

  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchSuppliers failed, using demo fallback:', err);
    return getDemoStorage().suppliers.filter((s) => s.store_id === storeId);
  }
}

export async function createSupplier(storeId: string, supplier: Partial<Supplier>): Promise<Supplier> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
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
    saveDemoStorage(storage);
    return newSup;
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...supplier, store_id: storeId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<Supplier> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const idx = storage.suppliers.findIndex((s) => s.id === supplierId);
    if (idx !== -1) {
      storage.suppliers[idx] = { ...storage.suppliers[idx], ...updates };
      saveDemoStorage(storage);
      return storage.suppliers[idx];
    }
  }

  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', supplierId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    storage.suppliers = storage.suppliers.filter((s) => s.id !== supplierId);
    saveDemoStorage(storage);
    return;
  }

  const { error } = await supabase.from('suppliers').delete().eq('id', supplierId);
  if (error) throw error;
}

export async function fetchCustomers(storeId: string): Promise<Customer[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.customers.filter((c) => c.store_id === storeId);
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchCustomers failed, using demo fallback:', err);
    return getDemoStorage().customers.filter((c) => c.store_id === storeId);
  }
}

export async function createCustomer(storeId: string, customer: Partial<Customer>): Promise<Customer> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
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
    saveDemoStorage(storage);
    return newCust;
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...customer, store_id: storeId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const idx = storage.customers.findIndex((c) => c.id === customerId);
    if (idx !== -1) {
      storage.customers[idx] = { ...storage.customers[idx], ...updates };
      saveDemoStorage(storage);
      return storage.customers[idx];
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomer(customerId: string): Promise<void> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    storage.customers = storage.customers.filter((c) => c.id !== customerId);
    saveDemoStorage(storage);
    return;
  }

  const { error } = await supabase.from('customers').delete().eq('id', customerId);
  if (error) throw error;
}

// ==========================================
// EXPENSES
// ==========================================
export async function fetchExpenses(storeId: string): Promise<Expense[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.expenses.filter((e) => e.store_id === storeId);
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('store_id', storeId)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Supabase fetchExpenses failed, using demo fallback:', err);
    return getDemoStorage().expenses.filter((e) => e.store_id === storeId);
  }
}

export async function createExpense(storeId: string, expense: Partial<Expense>): Promise<Expense> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
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
    saveDemoStorage(storage);
    return newExp;
  }

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
}

export async function updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const idx = storage.expenses.findIndex((e) => e.id === expenseId);
    if (idx !== -1) {
      storage.expenses[idx] = { 
        ...storage.expenses[idx], 
        ...updates,
        description: updates.description || updates.notes || storage.expenses[idx].description,
        expense_date: updates.expense_date || updates.date || storage.expenses[idx].expense_date,
      };
      saveDemoStorage(storage);
      return storage.expenses[idx];
    }
  }

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
}

export async function deleteExpense(expenseId: string): Promise<void> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    storage.expenses = storage.expenses.filter((e) => e.id !== expenseId);
    saveDemoStorage(storage);
    return;
  }

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

// ==========================================
// STORE SETTINGS & MEMBERS
// ==========================================
export async function fetchStoreSettings(storeId: string): Promise<StoreSettings | null> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.settings[storeId] || {
      store_id: storeId,
      receipt_header: 'ALTECH Flagship Superstore',
      receipt_footer: 'Thank you for your business!',
      currency: 'USD',
      tax_rate: 7.5,
      low_stock_threshold_default: 5,
    };
  }

  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase fetchStoreSettings failed, using demo fallback:', err);
    return getDemoStorage().settings[storeId] || null;
  }
}

export async function saveStoreSettings(storeId: string, settings: Partial<StoreSettings>): Promise<StoreSettings> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const existing = storage.settings[storeId] || {
      store_id: storeId,
      receipt_header: 'ALTECH Superstore',
      receipt_footer: 'Thank you for your business!',
      currency: 'USD',
      tax_rate: 0,
      low_stock_threshold_default: 5,
    };
    storage.settings[storeId] = { ...existing, ...settings };
    saveDemoStorage(storage);
    return storage.settings[storeId];
  }

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
}

export const updateStoreSettings = saveStoreSettings;

export async function fetchStoreMembers(storeId: string): Promise<StoreMember[]> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    return storage.storeMembers.filter((m) => m.store_id === storeId);
  }

  try {
    const { data, error } = await supabase
      .from('store_members')
      .select('*, profile:profiles(*)')
      .eq('store_id', storeId);

    if (error) {
      // Fallback simple query
      const { data: fallback } = await supabase.from('store_members').select('*').eq('store_id', storeId);
      return fallback || [];
    }
    return (data || []).map((m: any) => ({
      ...m,
      user_email: m.profile?.email || m.email,
      user_name: m.profile?.full_name || m.full_name,
    }));
  } catch (err) {
    console.warn('Supabase fetchStoreMembers failed, using demo fallback:', err);
    return getDemoStorage().storeMembers.filter((m) => m.store_id === storeId);
  }
}

export async function addStoreMember(
  storeId: string, 
  userIdentifier: string, 
  role: 'owner' | 'admin' | 'manager' | 'cashier'
): Promise<StoreMember> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const newMember: StoreMember = {
      id: `mem-${Date.now()}`,
      store_id: storeId,
      user_id: `user-${Date.now()}`,
      role,
      user_name: userIdentifier.split('@')[0],
      user_email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@demo.altech.com`,
      created_at: new Date().toISOString(),
    };
    storage.storeMembers.push(newMember);
    saveDemoStorage(storage);
    return newMember;
  }

  // If userIdentifier is an email, find their profile id
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
}

export async function updateStoreMemberRole(
  memberId: string, 
  role: 'owner' | 'admin' | 'manager' | 'cashier'
): Promise<StoreMember> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    const idx = storage.storeMembers.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      storage.storeMembers[idx].role = role;
      saveDemoStorage(storage);
      return storage.storeMembers[idx];
    }
  }

  const { data, error } = await supabase
    .from('store_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeStoreMember(memberId: string): Promise<void> {
  if (shouldUseDemo()) {
    const storage = getDemoStorage();
    storage.storeMembers = storage.storeMembers.filter((m) => m.id !== memberId);
    saveDemoStorage(storage);
    return;
  }

  const { error } = await supabase
    .from('store_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}
