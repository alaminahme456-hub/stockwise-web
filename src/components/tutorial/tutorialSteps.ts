import type { NavigationTab } from '../../types';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  tab?: NavigationTab;
  feature: string;
}

export const tutorialSteps: TutorialStep[] = [
  { id: 'dashboard', title: 'Your business at a glance', description: 'Your dashboard summarizes activity for the active store, including sales and stock indicators. The figures shown depend on your role and store data.', target: '#nav-item-dashboard', tab: 'dashboard', feature: 'Overview' },
  { id: 'products', title: 'Manage your products', description: 'Open Products to view and manage product records, prices, and details available to your account.', target: '#nav-item-products', tab: 'products', feature: 'Products' },
  { id: 'inventory', title: 'Keep an eye on stock', description: 'Inventory helps you review stock quantities and spot low-stock items. Available actions depend on your permissions.', target: '#nav-item-inventory', tab: 'inventory', feature: 'Inventory' },
  { id: 'pos', title: 'Record a sale', description: 'The Sales / POS area is where permitted team members work with the point-of-sale workflow. This tour will not create or submit a sale.', target: '#nav-item-pos', tab: 'pos', feature: 'Sales / POS' },
  { id: 'customers', title: 'Customer records', description: 'Use Customers to find and manage customer records and supported customer-related information.', target: '#nav-item-customers', tab: 'customers', feature: 'Customers' },
  { id: 'transactions', title: 'Review transactions', description: 'Transactions provides access to recorded sales and their available details. The tutorial never changes transaction records.', target: '#nav-item-transactions', tab: 'transactions', feature: 'Transactions' },
  { id: 'reports', title: 'Understand performance', description: 'Reports presents the business analytics available to your role, including supported sales and financial summaries.', target: '#nav-item-reports', tab: 'reports', feature: 'Reports' },
  { id: 'staff', title: 'Team and permissions', description: 'Where your role permits it, Staff lets you review team membership and the staff-management tools assigned to you.', target: '#nav-item-staff', tab: 'staff', feature: 'Staff' },
  { id: 'settings', title: 'Stores and settings', description: 'Settings and My Stores provide the store configuration and branch-switching options available to your account.', target: '#nav-item-settings', tab: 'settings', feature: 'Settings' },
  { id: 'suppliers', title: 'Supplier records', description: 'The Suppliers section is available to users with the appropriate product-management permissions.', target: '#nav-item-suppliers', tab: 'suppliers', feature: 'Suppliers' },
  { id: 'expenses', title: 'Track expenses', description: 'Open Expenses to review the expense tools available to your role.', target: '#nav-item-expenses', tab: 'expenses', feature: 'Expenses' },
];
