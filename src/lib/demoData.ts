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
  Role,
  Profile
} from '../types';

export interface DemoUserAccount {
  id: string;
  email: string;
  fullName: string;
  password?: string;
  role: Role;
  title: string;
  badge: string;
  description: string;
}

export const DEMO_ACCOUNTS: Record<'owner' | 'manager' | 'cashier', DemoUserAccount> = {
  owner: {
    id: 'demo-user-owner-001',
    email: 'owner@demo.altech.com',
    fullName: 'Alex Vance',
    password: 'demo123456',
    role: 'owner',
    title: 'Store Owner',
    badge: 'Full Access',
    description: 'Complete administrative access, reports, multi-store settings, and staff control',
  },
  cashier: {
    id: 'demo-user-cashier-002',
    email: 'cashier@demo.altech.com',
    fullName: 'Maria Chen',
    password: 'demo123456',
    role: 'cashier',
    title: 'Store Cashier',
    badge: 'POS Terminal',
    description: 'Dedicated POS checkout, digital receipts, barcode lookups, and transaction ledger',
  },
  manager: {
    id: 'demo-user-manager-003',
    email: 'manager@demo.altech.com',
    fullName: 'David Miller',
    password: 'demo123456',
    role: 'manager',
    title: 'Inventory Manager',
    badge: 'Stock & Operations',
    description: 'Product catalog, stock adjustments, supplier reorders, and expense tracking',
  },
};

export const DEMO_ACCOUNTS_LIST: DemoUserAccount[] = Object.values(DEMO_ACCOUNTS);

const DEMO_STORE_ID = 'demo-store-01';

interface DemoStorageSchema {
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

const INITIAL_DEMO_DATA: DemoStorageSchema = {
  stores: [
    {
      id: DEMO_STORE_ID,
      owner_id: 'demo-user-owner-001',
      name: 'ALTECH Flagship Superstore',
      business_name: 'ALTECH Retail Group Ltd',
      currency: 'USD',
      phone: '+1 (555) 019-2834',
      email: 'flagship@altechstockwise.com',
      address: '742 Evergreen Terrace, Downtown Metro',
      logo_url: null,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'demo-store-02',
      owner_id: 'demo-user-owner-001',
      name: 'ALTECH Express Kiosk (Airport)',
      business_name: 'ALTECH Retail Group Ltd',
      currency: 'USD',
      phone: '+1 (555) 019-5678',
      email: 'airport@altechstockwise.com',
      address: 'Terminal 2 Concourse B, Int Airport',
      logo_url: null,
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    }
  ],
  settings: {
    [DEMO_STORE_ID]: {
      store_id: DEMO_STORE_ID,
      receipt_header: 'ALTECH Flagship Superstore\nDowntown Metro Plaza, Suite 100\nTel: +1 (555) 019-2834',
      receipt_footer: 'Thank you for shopping at ALTECH StockWise!\nRetain receipt for 7-day exchanges on non-perishables.',
      tax_rate: 7.5,
      currency: 'USD',
      low_stock_threshold_default: 6,
    },
    'demo-store-02': {
      store_id: 'demo-store-02',
      receipt_header: 'ALTECH Express Kiosk\nAirport Terminal 2',
      receipt_footer: 'Have a safe flight! Thank you for your business.',
      tax_rate: 8.25,
      currency: 'USD',
      low_stock_threshold_default: 5,
    }
  },
  categories: [
    { id: 'cat-bev', store_id: DEMO_STORE_ID, name: 'Beverages', description: 'Cold drinks, sodas, and juices', created_at: new Date().toISOString() },
    { id: 'cat-snk', store_id: DEMO_STORE_ID, name: 'Groceries & Snacks', description: 'Packaged chips, biscuits, and confectionery', created_at: new Date().toISOString() },
    { id: 'cat-ele', store_id: DEMO_STORE_ID, name: 'Electronics & Accessories', description: 'Cables, chargers, audio, and gadgets', created_at: new Date().toISOString() },
    { id: 'cat-per', store_id: DEMO_STORE_ID, name: 'Personal Care', description: 'Dental, hygiene, and skincare essentials', created_at: new Date().toISOString() },
    { id: 'cat-hou', store_id: DEMO_STORE_ID, name: 'Household & Cleaning', description: 'Detergents, paper goods, and cleaning tools', created_at: new Date().toISOString() },
  ],
  products: [
    {
      id: 'prod-01',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-bev',
      name: 'Coca-Cola Classic 500ml',
      sku: 'BEV-001',
      barcode: '5449000000996',
      description: 'Chilled refreshing sparkling soda 500ml plastic bottle',
      cost_price: 0.75,
      selling_price: 1.50,
      stock_quantity: 48,
      min_stock_level: 12,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-02',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-bev',
      name: 'Red Bull Energy Drink 250ml',
      sku: 'BEV-002',
      barcode: '9002490100070',
      description: 'Vitalizes body and mind premium energy drink can',
      cost_price: 1.35,
      selling_price: 2.75,
      stock_quantity: 26,
      min_stock_level: 10,
      created_at: new Date(Date.now() - 24 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-03',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-bev',
      name: 'Pure Spring Mineral Water 1L',
      sku: 'BEV-003',
      barcode: '8901030000123',
      description: 'Naturally filtered natural spring water 1000ml bottle',
      cost_price: 0.35,
      selling_price: 0.99,
      stock_quantity: 64,
      min_stock_level: 15,
      created_at: new Date(Date.now() - 23 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-04',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-snk',
      name: 'Lay\'s Classic Salted Chips 150g',
      sku: 'SNK-001',
      barcode: '028400040012',
      description: 'Crispy farm-grown potato chips lightly salted',
      cost_price: 1.10,
      selling_price: 2.25,
      stock_quantity: 18,
      min_stock_level: 8,
      created_at: new Date(Date.now() - 22 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-05',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-snk',
      name: 'Oreo Double Stuf Cookies 280g',
      sku: 'SNK-002',
      barcode: '044000032029',
      description: 'Chocolate sandwich cookies with double creme filling',
      cost_price: 1.80,
      selling_price: 3.49,
      stock_quantity: 30,
      min_stock_level: 10,
      created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-06',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-ele',
      name: 'Anker USB-C 30W Fast Charger',
      sku: 'ELE-001',
      barcode: '848061033451',
      description: 'Ultra-compact GaN wall adapter for smartphones & tablets',
      cost_price: 9.20,
      selling_price: 19.99,
      stock_quantity: 14,
      min_stock_level: 5,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-07',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-ele',
      name: 'Braided Lightning Cable 2m',
      sku: 'ELE-002',
      barcode: '848061033468',
      description: 'Heavy duty nylon braided high-speed sync cable',
      cost_price: 3.90,
      selling_price: 11.49,
      stock_quantity: 3, // LOW STOCK TRIGGER
      min_stock_level: 8,
      created_at: new Date(Date.now() - 19 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-08',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-ele',
      name: 'Wireless Bluetooth Earbuds Pro',
      sku: 'ELE-003',
      barcode: '848061033475',
      description: 'Active noise reduction Bluetooth 5.3 earbuds with charging pod',
      cost_price: 16.50,
      selling_price: 34.99,
      stock_quantity: 8,
      min_stock_level: 4,
      created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-09',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-per',
      name: 'Colgate Total Clean Toothpaste 100ml',
      sku: 'PER-001',
      barcode: '8718951000123',
      description: 'Antibacterial oral health whole mouth protection',
      cost_price: 1.25,
      selling_price: 2.99,
      stock_quantity: 24,
      min_stock_level: 6,
      created_at: new Date(Date.now() - 17 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-10',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-per',
      name: 'Dove Deep Moisture Body Wash 500ml',
      sku: 'PER-002',
      barcode: '011111000234',
      description: 'Nourishing microbiome gentle shower lotion',
      cost_price: 3.20,
      selling_price: 6.75,
      stock_quantity: 16,
      min_stock_level: 6,
      created_at: new Date(Date.now() - 16 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-11',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-hou',
      name: 'Tide Pods Laundry Detergent 35ct',
      sku: 'HOU-001',
      barcode: '037000002345',
      description: '3-in-1 concentrated clean and freshen pods container',
      cost_price: 7.50,
      selling_price: 14.50,
      stock_quantity: 11,
      min_stock_level: 4,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-12',
      store_id: DEMO_STORE_ID,
      category_id: 'cat-hou',
      name: 'Bounty Quick-Size Paper Towels 2-Pack',
      sku: 'HOU-002',
      barcode: '037000002352',
      description: 'Ultra absorbent 2 double rolls white paper towels',
      cost_price: 4.80,
      selling_price: 9.99,
      stock_quantity: 2, // CRITICAL LOW STOCK TRIGGER
      min_stock_level: 6,
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  customers: [
    {
      id: 'cust-01',
      store_id: DEMO_STORE_ID,
      name: 'Michael Scott',
      phone: '+1 (555) 012-3456',
      email: 'michael.scott@dunderpaper.com',
      address: '1725 Slough Ave, Scranton',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'cust-02',
      store_id: DEMO_STORE_ID,
      name: 'Sarah Connor',
      phone: '+1 (555) 019-9821',
      email: 'sarah.c@cyberdyne.org',
      address: '450 Sunset Blvd, Los Angeles',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'cust-03',
      store_id: DEMO_STORE_ID,
      name: 'Bruce Wayne',
      phone: '+1 (555) 014-4321',
      email: 'bruce@wayneenterprises.com',
      address: '1007 Mountain Drive, Gotham',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ],
  suppliers: [
    {
      id: 'sup-01',
      store_id: DEMO_STORE_ID,
      name: 'Metro Beverage Logistics',
      contact_person: 'David Vance',
      phone: '+1 (555) 890-1234',
      email: 'orders@metrobev.com',
      address: 'Industrial Way Dock 4, Metro Distribution Park',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'sup-02',
      store_id: DEMO_STORE_ID,
      name: 'Apex Consumer Goods Wholesale',
      contact_person: 'Karen White',
      phone: '+1 (555) 890-5678',
      email: 'karen@apexgoods.com',
      address: 'Westside Logistics Center Blvd',
      created_at: new Date(Date.now() - 28 * 86400000).toISOString(),
    },
    {
      id: 'sup-03',
      store_id: DEMO_STORE_ID,
      name: 'Nexus Electronics Supply Direct',
      contact_person: 'Ken Tanaka',
      phone: '+1 (555) 890-9900',
      email: 'sales@nexuselec.com',
      address: 'Silicon Highway Suite 210, Tech Hub',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
  ],
  sales: [
    {
      id: 'sale-101',
      store_id: DEMO_STORE_ID,
      cashier_id: 'demo-user-cashier-002',
      customer_id: 'cust-01',
      customer_name: 'Michael Scott',
      subtotal: 39.98,
      tax_amount: 3.00,
      discount_amount: 0,
      total_amount: 42.98,
      payment_method: 'card',
      status: 'completed',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      items: [
        {
          id: 'item-101-1',
          sale_id: 'sale-101',
          product_id: 'prod-06',
          product_name: 'Anker USB-C 30W Fast Charger',
          sku: 'ELE-001',
          unit_price: 19.99,
          cost_price: 11.50,
          quantity: 2,
          subtotal: 39.98,
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        }
      ]
    },
    {
      id: 'sale-102',
      store_id: DEMO_STORE_ID,
      cashier_id: 'demo-user-owner-001',
      customer_id: 'cust-02',
      customer_name: 'Sarah Connor',
      subtotal: 18.24,
      tax_amount: 1.37,
      discount_amount: 0,
      total_amount: 19.61,
      payment_method: 'cash',
      status: 'completed',
      created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
      items: [
        {
          id: 'item-102-1',
          sale_id: 'sale-102',
          product_id: 'prod-01',
          product_name: 'Coca-Cola Classic 500ml',
          sku: 'BEV-001',
          unit_price: 1.50,
          cost_price: 0.85,
          quantity: 3,
          subtotal: 4.50,
          created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
        },
        {
          id: 'item-102-2',
          sale_id: 'sale-102',
          product_id: 'prod-04',
          product_name: 'Lay\'s Classic Salted Chips 150g',
          sku: 'SNK-001',
          unit_price: 2.25,
          cost_price: 1.20,
          quantity: 2,
          subtotal: 4.50,
          created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
        },
        {
          id: 'item-102-3',
          sale_id: 'sale-102',
          product_id: 'prod-09',
          product_name: 'Colgate Total Clean Toothpaste 100ml',
          sku: 'PER-001',
          unit_price: 2.99,
          cost_price: 1.60,
          quantity: 1,
          subtotal: 2.99,
          created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
        },
        {
          id: 'item-102-4',
          sale_id: 'sale-102',
          product_id: 'prod-02',
          product_name: 'Red Bull Energy Drink 250ml',
          sku: 'BEV-002',
          unit_price: 2.75,
          cost_price: 1.60,
          quantity: 2,
          subtotal: 5.50,
          created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
        }
      ]
    },
    {
      id: 'sale-103',
      store_id: DEMO_STORE_ID,
      cashier_id: 'demo-user-cashier-002',
      customer_id: null,
      customer_name: 'Walk-in Customer',
      subtotal: 69.98,
      tax_amount: 5.25,
      discount_amount: 5.00,
      total_amount: 70.23,
      payment_method: 'bank_transfer',
      status: 'completed',
      created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
      items: [
        {
          id: 'item-103-1',
          sale_id: 'sale-103',
          product_id: 'prod-08',
          product_name: 'Wireless Bluetooth Earbuds Pro',
          sku: 'ELE-003',
          unit_price: 34.99,
          cost_price: 19.00,
          quantity: 2,
          subtotal: 69.98,
          created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
        }
      ]
    }
  ],
  expenses: [
    {
      id: 'exp-01',
      store_id: DEMO_STORE_ID,
      title: 'Commercial Store Monthly Rent',
      category: 'rent',
      amount: 1450.00,
      description: 'Downtown retail space monthly lease payment',
      expense_date: new Date(Date.now() - 5 * 86400000).toISOString(),
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      payment_method: 'bank_transfer',
      notes: 'Downtown retail space monthly lease payment',
      recorded_by: 'demo-user-owner-001',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'exp-02',
      store_id: DEMO_STORE_ID,
      title: 'Commercial Power & HVAC Utility',
      category: 'utilities',
      amount: 285.40,
      description: 'Retail cooling and lighting electricity billing',
      expense_date: new Date(Date.now() - 8 * 86400000).toISOString(),
      date: new Date(Date.now() - 8 * 86400000).toISOString(),
      payment_method: 'bank_transfer',
      notes: 'Retail cooling and lighting electricity billing',
      recorded_by: 'demo-user-owner-001',
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
      id: 'exp-03',
      store_id: DEMO_STORE_ID,
      title: 'Thermal POS Receipt Rolls & Bags',
      category: 'supplies',
      amount: 78.50,
      description: 'Bulk 80mm thermal paper rolls & branded shopping bags',
      expense_date: new Date(Date.now() - 12 * 86400000).toISOString(),
      date: new Date(Date.now() - 12 * 86400000).toISOString(),
      payment_method: 'cash',
      notes: 'Bulk 80mm thermal paper rolls & branded shopping bags',
      recorded_by: 'demo-user-manager-003',
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    }
  ],
  inventoryMovements: [
    {
      id: 'mov-01',
      store_id: DEMO_STORE_ID,
      product_id: 'prod-06',
      type: 'sale',
      movement_type: 'sale',
      quantity: 2,
      quantity_change: -2,
      previous_stock: 16,
      previous_quantity: 16,
      new_stock: 14,
      new_quantity: 14,
      reference_id: 'sale-101',
      reason: 'POS Sale #sale-101',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 'mov-02',
      store_id: DEMO_STORE_ID,
      product_id: 'prod-07',
      type: 'adjustment',
      movement_type: 'adjustment',
      quantity: 2,
      quantity_change: -2,
      previous_stock: 5,
      previous_quantity: 5,
      new_stock: 3,
      new_quantity: 3,
      reference_id: null,
      reason: 'Damaged packaging during shelf stocking',
      created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    },
    {
      id: 'mov-03',
      store_id: DEMO_STORE_ID,
      product_id: 'prod-01',
      type: 'addition',
      movement_type: 'restock',
      quantity: 24,
      quantity_change: 24,
      previous_stock: 24,
      previous_quantity: 24,
      new_stock: 48,
      new_quantity: 48,
      reference_id: null,
      reason: 'Supplier Batch Delivery PO #MB-9921',
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    }
  ],
  storeMembers: [
    {
      id: 'mem-01',
      store_id: DEMO_STORE_ID,
      user_id: 'demo-user-owner-001',
      role: 'owner',
      user_name: 'Alex Vance',
      user_email: 'owner@demo.altech.com',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'mem-02',
      store_id: DEMO_STORE_ID,
      user_id: 'demo-user-cashier-002',
      role: 'cashier',
      user_name: 'Maria Chen',
      user_email: 'cashier@demo.altech.com',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'mem-03',
      store_id: DEMO_STORE_ID,
      user_id: 'demo-user-manager-003',
      role: 'manager',
      user_name: 'David Miller',
      user_email: 'manager@demo.altech.com',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ]
};

const STORAGE_KEY = 'stockwise_demo_database_v2';

export function getDemoStorage(): DemoStorageSchema {
  if (typeof window === 'undefined') return INITIAL_DEMO_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
      return INITIAL_DEMO_DATA;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse demo data from localStorage, resetting:', err);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
    return INITIAL_DEMO_DATA;
  }
}

export function saveDemoStorage(data: DemoStorageSchema): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to persist demo data:', err);
  }
}

export function resetDemoStorage(): DemoStorageSchema {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DATA));
  }
  return INITIAL_DEMO_DATA;
}

export function isDemoActive(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('stockwise_active_demo_role'));
}

export function getActiveDemoRole(): Role | null {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem('stockwise_active_demo_role') as Role) || null;
}

export function setActiveDemoRole(role: Role | null): void {
  if (typeof window === 'undefined') return;
  if (role) {
    localStorage.setItem('stockwise_active_demo_role', role);
  } else {
    localStorage.removeItem('stockwise_active_demo_role');
  }
}

export function getActiveDemoAccount(role?: Role | null): DemoUserAccount {
  const currentRole = role || getActiveDemoRole() || 'owner';
  return (DEMO_ACCOUNTS as any)[currentRole] || DEMO_ACCOUNTS.owner;
}

export function clearDemoSession(): void {
  setActiveDemoRole(null);
}

export const resetDemoData = resetDemoStorage;
