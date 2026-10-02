export interface PermissionItem {
  id: string;
  label: string;
  description: string;
  category: string;
}

export interface PermissionGroup {
  category: string;
  description: string;
  permissions: PermissionItem[];
}

export const ALL_PERMISSIONS: PermissionItem[] = [
  // Dashboard
  { id: 'dashboard.view', label: 'View Dashboard', description: 'Access dashboard metrics and quick summary cards', category: 'Dashboard' },

  // Sales
  { id: 'sales.view', label: 'View Sales History', description: 'Browse and inspect past register transactions and receipts', category: 'Sales' },
  { id: 'sales.create', label: 'Create Sale (POS)', description: 'Use the point-of-sale register to checkout orders', category: 'Sales' },
  { id: 'sales.edit', label: 'Edit Sale Details', description: 'Modify sales notes and line item adjustments', category: 'Sales' },
  { id: 'sales.cancel', label: 'Cancel / Refund Sale', description: 'Void completed sales transactions and process returns', category: 'Sales' },

  // Products
  { id: 'products.view', label: 'View Products', description: 'Browse catalogue products, categories, and stock numbers', category: 'Products' },
  { id: 'products.create', label: 'Add Products', description: 'Create new products, SKUs, and categories', category: 'Products' },
  { id: 'products.edit', label: 'Edit Products', description: 'Modify product descriptions, categories, and specs', category: 'Products' },
  { id: 'products.delete', label: 'Delete Products', description: 'Permanently remove or archive products', category: 'Products' },
  { id: 'products.adjust_stock', label: 'Adjust Stock Levels', description: 'Perform inventory restocks, damages, and manual adjustments', category: 'Products' },
  { id: 'products.change_prices', label: 'Change Prices', description: 'Alter cost prices and selling prices for catalogue items', category: 'Products' },

  // Customers
  { id: 'customers.view', label: 'View Customers', description: 'Browse the customer directory and contact profiles', category: 'Customers' },
  { id: 'customers.create', label: 'Add Customers', description: 'Register new customer profiles and contact details', category: 'Customers' },
  { id: 'customers.edit', label: 'Edit Customers', description: 'Update customer phone, address, and notes', category: 'Customers' },
  { id: 'customers.delete', label: 'Delete Customers', description: 'Remove customer profiles from the directory', category: 'Customers' },

  // Customer Credit
  { id: 'credit.view', label: 'View Customer Credit', description: 'Inspect outstanding debt balances and accounts receivable', category: 'Customer Credit' },
  { id: 'credit.create_sale', label: 'Create Credit Sale', description: 'Issue pay-later orders to customer credit accounts', category: 'Customer Credit' },
  { id: 'credit.record_repayment', label: 'Record Repayment', description: 'Collect full or partial credit repayments from debtors', category: 'Customer Credit' },
  { id: 'credit.view_history', label: 'View Credit History', description: 'Audit chronological debit/credit ledgers and running balances', category: 'Customer Credit' },
  { id: 'credit.edit', label: 'Edit Credit Records', description: 'Void or amend payment entries and debt adjustments', category: 'Customer Credit' },

  // Expenses
  { id: 'expenses.view', label: 'View Expenses', description: 'Browse store overhead expenditures and expense history', category: 'Expenses' },
  { id: 'expenses.create', label: 'Add Expenses', description: 'Record new store operating expenses and payments', category: 'Expenses' },
  { id: 'expenses.edit', label: 'Edit Expenses', description: 'Update existing expense amounts, dates, and memos', category: 'Expenses' },
  { id: 'expenses.delete', label: 'Delete Expenses', description: 'Remove expense line items from financial records', category: 'Expenses' },

  // Reports
  { id: 'reports.view', label: 'View Reports', description: 'Access revenue velocity, profit margin, and inventory reports', category: 'Reports' },
  { id: 'reports.export', label: 'Export Reports', description: 'Download CSV and print formal business report summaries', category: 'Reports' },

  // Staff
  { id: 'staff.view', label: 'View Staff', description: 'Inspect the store staff roster and assigned roles', category: 'Staff' },
  { id: 'staff.create', label: 'Add / Invite Staff', description: 'Invite new staff members and assign their initial roles', category: 'Staff' },
  { id: 'staff.edit', label: 'Edit Staff', description: 'Update staff member names, phone, and role templates', category: 'Staff' },
  { id: 'staff.suspend', label: 'Suspend Staff', description: 'Temporarily freeze staff access to this store', category: 'Staff' },
  { id: 'staff.remove', label: 'Remove Staff', description: 'Revoke store membership while preserving historical sales', category: 'Staff' },
  { id: 'staff.permissions', label: 'Manage Permissions', description: 'Customize granular permission toggles for staff members', category: 'Staff' },

  // Store Settings
  { id: 'settings.view', label: 'View Settings', description: 'Inspect store details, currency, and receipt configuration', category: 'Store Settings' },
  { id: 'settings.edit', label: 'Edit Settings', description: 'Update receipt headers, footers, tax rates, and store info', category: 'Store Settings' },

  // Financial Information
  { id: 'financials.view_revenue', label: 'View Revenue', description: 'See gross sales totals on dashboard and reports', category: 'Financial Information' },
  { id: 'financials.view_profit', label: 'View Profit', description: 'Access net profit calculations, margins, and COGS breakdown', category: 'Financial Information' },
  { id: 'financials.view_expenses', label: 'View Financial Expenses', description: 'Access total expense aggregates on financial summaries', category: 'Financial Information' },
  { id: 'financials.view_reports', label: 'View Financial Reports', description: 'Access high-level balance and revenue breakdowns', category: 'Financial Information' },
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: 'Dashboard',
    description: 'Dashboard overview and summary statistics access',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Dashboard'),
  },
  {
    category: 'Sales',
    description: 'Register checkout, sales history, and order editing',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Sales'),
  },
  {
    category: 'Products',
    description: 'Item catalog, stock quantities, and price configurations',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Products'),
  },
  {
    category: 'Customers',
    description: 'Customer profiles, contact directory, and CRM tracking',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Customers'),
  },
  {
    category: 'Customer Credit',
    description: 'Accounts receivable, pay-later sales, and debt repayment ledger',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Customer Credit'),
  },
  {
    category: 'Expenses',
    description: 'Operational store expenses and utility payments',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Expenses'),
  },
  {
    category: 'Reports',
    description: 'Business intelligence analytics and data export',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Reports'),
  },
  {
    category: 'Staff',
    description: 'Staff member management, invitation tokens, and access control',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Staff'),
  },
  {
    category: 'Store Settings',
    description: 'Store preferences, receipt styling, and branch configuration',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Store Settings'),
  },
  {
    category: 'Financial Information',
    description: 'Sensitive gross revenue, profit margins, and financial reports',
    permissions: ALL_PERMISSIONS.filter((p) => p.category === 'Financial Information'),
  },
];

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  cashier: {
    id: 'cashier',
    name: 'Cashier',
    description: 'Designed for employees primarily handling POS register sales and receipts.',
    permissions: [
      'dashboard.view',
      'sales.view',
      'sales.create',
      'products.view',
      'customers.view',
      'customers.create',
      'credit.view',
      'credit.create_sale',
      'credit.record_repayment',
      'credit.view_history',
    ],
  },
  sales_staff: {
    id: 'sales_staff',
    name: 'Sales Staff',
    description: 'Can handle point-of-sale checkout, customer lookups, order editing, and credit.',
    permissions: [
      'dashboard.view',
      'sales.view',
      'sales.create',
      'sales.edit',
      'products.view',
      'customers.view',
      'customers.create',
      'customers.edit',
      'credit.view',
      'credit.create_sale',
      'credit.record_repayment',
      'credit.view_history',
    ],
  },
  inventory_staff: {
    id: 'inventory_staff',
    name: 'Inventory Staff',
    description: 'Can manage stock levels, catalogue items, and view inventory movements.',
    permissions: [
      'dashboard.view',
      'products.view',
      'products.create',
      'products.edit',
      'products.adjust_stock',
    ],
  },
  manager: {
    id: 'manager',
    name: 'Manager',
    description: 'Broad operational access to sales, catalog, expenses, customers, and reports.',
    permissions: [
      'dashboard.view',
      'sales.view',
      'sales.create',
      'sales.edit',
      'sales.cancel',
      'products.view',
      'products.create',
      'products.edit',
      'products.adjust_stock',
      'products.change_prices',
      'customers.view',
      'customers.create',
      'customers.edit',
      'customers.delete',
      'credit.view',
      'credit.create_sale',
      'credit.record_repayment',
      'credit.view_history',
      'credit.edit',
      'expenses.view',
      'expenses.create',
      'expenses.edit',
      'reports.view',
      'reports.export',
      'staff.view',
      'settings.view',
      'financials.view_revenue',
      'financials.view_expenses',
      'financials.view_reports',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom Role',
    description: 'Allows the store owner to manually select specific permissions.',
    permissions: ['dashboard.view', 'sales.view', 'sales.create'],
  },
};

export function formatRoleName(role?: string | null): string {
  if (!role) return 'Staff';
  if (role === 'owner') return 'Store Owner';
  if (role === 'sales_staff') return 'Sales Staff';
  if (role === 'inventory_staff') return 'Inventory Staff';
  if (role === 'custom') return 'Custom Role';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export interface InvitationPayload {
  id: string;
  storeId: string;
  storeName: string;
  role: string;
  permissions: string[];
  name: string;
  email?: string | null;
  phone?: string | null;
  expiresAt: string;
}

export function generateInvitationToken(payload?: InvitationPayload): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    for (let i = 0; i < 16; i++) {
      rand += chars.charAt(buffer[i] % chars.length);
    }
  } else {
    for (let i = 0; i < 16; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  if (!payload) {
    return `inv_${rand}`;
  }

  try {
    const compactData = {
      i: payload.id,
      s: payload.storeId,
      n: payload.storeName,
      r: payload.role,
      p: payload.permissions,
      m: payload.name,
      e: payload.email || '',
      ph: payload.phone || '',
      x: payload.expiresAt,
    };
    const jsonStr = JSON.stringify(compactData);
    let base64 = '';
    if (typeof btoa !== 'undefined') {
      base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
    } else {
      base64 = Buffer.from(jsonStr, 'utf-8').toString('base64');
    }
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `inv_${rand}_${base64url}`;
  } catch {
    return `inv_${rand}`;
  }
}

export function decodeInvitationToken(token: string): {
  id: string;
  store_id: string;
  store_name: string;
  role: string;
  permissions: string[];
  name: string;
  email: string;
  phone: string | null;
  expires_at: string;
} | null {
  if (!token || typeof token !== 'string') return null;
  if (!token.startsWith('inv_')) return null;
  const parts = token.split('_');
  if (parts.length < 3) return null;
  const base64url = parts.slice(2).join('_');

  try {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    let jsonStr = '';
    if (typeof atob !== 'undefined') {
      jsonStr = decodeURIComponent(
        Array.prototype.map.call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
    } else {
      jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    }
    const data = JSON.parse(jsonStr);

    if (!data.s || !data.n || !data.r || !data.x) {
      return null;
    }

    return {
      id: data.i || `inv-${Date.now()}`,
      store_id: data.s,
      store_name: data.n,
      role: data.r,
      permissions: Array.isArray(data.p) ? data.p : [],
      name: data.m || 'Staff Member',
      email: data.e || '',
      phone: data.ph || null,
      expires_at: data.x,
    };
  } catch {
    return null;
  }
}
