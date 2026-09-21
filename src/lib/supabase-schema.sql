-- ==============================================================================
-- ALTECH StockWise - Production Supabase PostgreSQL Schema with RLS & Realtime
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    business_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    currency TEXT DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Store Members (Role Based Access: owner, manager, cashier)
CREATE TABLE IF NOT EXISTS public.store_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'cashier' CHECK (role IN ('owner', 'manager', 'cashier')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(store_id, user_id)
);

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT,
    description TEXT,
    cost_price NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    selling_price NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    current_stock NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    min_stock_level NUMERIC(12,2) DEFAULT 5.00 NOT NULL,
    unit TEXT DEFAULT 'pcs' NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Inventory Movements (Audit Log for all additions, reductions, and sales)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('addition', 'reduction', 'sale', 'adjustment', 'initial')) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    previous_stock NUMERIC(12,2) NOT NULL,
    new_stock NUMERIC(12,2) NOT NULL,
    reason TEXT,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    discount NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    tax NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'pos', 'mixed')) NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'cancelled')) NOT NULL,
    staff_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Sale Items Table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    cost_price NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 12. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE NOT NULL,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 13. Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE NOT NULL,
    receipt_header TEXT DEFAULT 'ALTECH StockWise Store',
    receipt_footer TEXT DEFAULT 'Thank you for your patronage!',
    tax_rate NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- Indexes for High-Performance Queries
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_id ON public.inventory_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store_id ON public.expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store_user ON public.store_members(store_id, user_id);

-- ==============================================================================
-- Row-Level Security (RLS) Setup
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check if current user is member or owner of store
CREATE OR REPLACE FUNCTION public.is_store_member(lookup_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = lookup_store_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = lookup_store_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Stores Policies
CREATE POLICY "Members can view store" ON public.stores FOR SELECT 
  USING (owner_id = auth.uid() OR public.is_store_member(id));
CREATE POLICY "Owners can insert store" ON public.stores FOR INSERT 
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update store" ON public.stores FOR UPDATE 
  USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete store" ON public.stores FOR DELETE 
  USING (owner_id = auth.uid());

-- Store Members Policies
CREATE POLICY "Members can view store membership" ON public.store_members FOR SELECT 
  USING (user_id = auth.uid() OR public.is_store_member(store_id));
CREATE POLICY "Store owners can manage membership" ON public.store_members FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND owner_id = auth.uid()));

-- Product Policies
CREATE POLICY "Store members can view products" ON public.products FOR SELECT 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can insert products" ON public.products FOR INSERT 
  WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "Store members can update products" ON public.products FOR UPDATE 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can delete products" ON public.products FOR DELETE 
  USING (public.is_store_member(store_id));

-- Inventory Movements Policies
CREATE POLICY "Store members can view movements" ON public.inventory_movements FOR SELECT 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can insert movements" ON public.inventory_movements FOR INSERT 
  WITH CHECK (public.is_store_member(store_id));

-- Sales Policies
CREATE POLICY "Store members can view sales" ON public.sales FOR SELECT 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can insert sales" ON public.sales FOR INSERT 
  WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "Store members can update sales" ON public.sales FOR UPDATE 
  USING (public.is_store_member(store_id));

-- Sale Items Policies
CREATE POLICY "Store members can view sale items" ON public.sale_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.sales WHERE id = sale_items.sale_id AND public.is_store_member(sales.store_id)));
CREATE POLICY "Store members can insert sale items" ON public.sale_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales WHERE id = sale_items.sale_id AND public.is_store_member(sales.store_id)));

-- Customers Policies
CREATE POLICY "Store members can view customers" ON public.customers FOR SELECT 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can insert customers" ON public.customers FOR INSERT 
  WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "Store members can update customers" ON public.customers FOR UPDATE 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can delete customers" ON public.customers FOR DELETE 
  USING (public.is_store_member(store_id));

-- Suppliers Policies
CREATE POLICY "Store members can view suppliers" ON public.suppliers FOR SELECT 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can insert suppliers" ON public.suppliers FOR INSERT 
  WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "Store members can update suppliers" ON public.suppliers FOR UPDATE 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can delete suppliers" ON public.suppliers FOR DELETE 
  USING (public.is_store_member(store_id));

-- Categories Policies
CREATE POLICY "Store members can view categories" ON public.categories FOR SELECT 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can insert categories" ON public.categories FOR INSERT 
  WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "Store members can update categories" ON public.categories FOR UPDATE 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can delete categories" ON public.categories FOR DELETE 
  USING (public.is_store_member(store_id));

-- Expenses Policies
CREATE POLICY "Store members can view expenses" ON public.expenses FOR SELECT 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can insert expenses" ON public.expenses FOR INSERT 
  WITH CHECK (public.is_store_member(store_id));
CREATE POLICY "Store members can update expenses" ON public.expenses FOR UPDATE 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can delete expenses" ON public.expenses FOR DELETE 
  USING (public.is_store_member(store_id));

-- Store Settings Policies
CREATE POLICY "Store members can view settings" ON public.store_settings FOR SELECT 
  USING (public.is_store_member(store_id));
CREATE POLICY "Store members can insert/update settings" ON public.store_settings FOR ALL 
  USING (public.is_store_member(store_id));

-- ==============================================================================
-- Realtime Replication
-- ==============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_movements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
EXCEPTION
  WHEN others THEN NULL;
END $$;
