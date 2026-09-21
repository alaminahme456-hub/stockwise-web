export type Role = 'owner' | 'admin' | 'manager' | 'cashier';
export type UserRole = Role;

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role?: Role | null;
  created_at?: string;
  updated_at?: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  business_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
  currency: string;
  created_at: string;
  updated_at?: string;
}

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  description?: string | null;
  cost_price: number;
  selling_price: number;
  current_stock?: number;
  stock_quantity?: number;
  min_stock_level: number;
  unit?: string;
  supplier_id?: string | null;
  status?: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export type MovementType = 'addition' | 'reduction' | 'sale' | 'adjustment' | 'initial' | 'restock' | 'damage' | 'transfer';

export interface InventoryMovement {
  id: string;
  store_id: string;
  product_id: string;
  type: MovementType;
  movement_type?: MovementType;
  quantity: number;
  quantity_change?: number;
  previous_stock: number;
  previous_quantity?: number;
  new_stock: number;
  new_quantity?: number;
  reference_id?: string | null;
  reason?: string | null;
  performed_by?: string | null;
  created_at: string;
  product_name?: string;
  product_sku?: string;
}

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at: string;
  total_spent?: number;
  total_orders?: number;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos' | 'card' | 'mixed';
export type SaleStatus = 'completed' | 'refunded' | 'cancelled';

export interface Sale {
  id: string;
  store_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  cashier_id?: string | null;
  subtotal: number;
  discount?: number;
  discount_amount?: number;
  tax?: number;
  tax_amount?: number;
  total_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  staff_name?: string | null;
  notes?: string | null;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  subtotal: number;
  created_at?: string;
}

export interface Expense {
  id: string;
  store_id: string;
  title: string;
  category: string;
  amount: number;
  description?: string | null;
  notes?: string | null;
  expense_date: string;
  date?: string;
  payment_method?: string;
  recorded_by?: string | null;
  created_at: string;
}

export interface StoreSettings {
  id?: string;
  store_id: string;
  receipt_header: string;
  receipt_footer: string;
  tax_rate: number;
  currency: string;
  low_stock_threshold_default?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export type NavigationTab = 
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'pos'
  | 'customers'
  | 'suppliers'
  | 'transactions'
  | 'expenses'
  | 'reports'
  | 'staff'
  | 'stores'
  | 'settings';

export type DateRangeFilter = 'today' | 'week' | 'month' | 'custom' | 'all';
