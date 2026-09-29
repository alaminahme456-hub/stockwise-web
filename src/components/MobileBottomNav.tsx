import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Boxes, 
  ShoppingCart, 
  Users, 
  Receipt, 
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { NavigationTab } from '../types';
import { useStore } from '../context/StoreContext';

interface MobileBottomNavProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMoreMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMoreMenu,
}) => {
  const { products, hasPermission, isStoreOwner } = useStore();

  const lowStockCount = products.filter(
    (p) => Number(p.current_stock) <= Number(p.min_stock_level) && p.status === 'active'
  ).length;

  const isTabAllowed = (tabId: NavigationTab): boolean => {
    if (isStoreOwner) return true;
    switch (tabId) {
      case 'dashboard':
        return hasPermission('dashboard.view');
      case 'pos':
        return hasPermission('sales.create') || hasPermission('sales.view');
      case 'products':
        return hasPermission('products.view');
      case 'inventory':
        return hasPermission('products.view') || hasPermission('products.adjust_stock');
      case 'transactions':
        return hasPermission('sales.view');
      default:
        return false;
    }
  };

  const primaryMobileTabs: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Stock', icon: Boxes, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'transactions', label: 'Sales', icon: Receipt },
  ].filter((t) => isTabAllowed(t.id));

  return (
    <nav 
      id="mobile-bottom-navigation" 
      aria-label="Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl px-2 py-1 sm:py-1.5 pb-safe"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {primaryMobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`bottom-nav-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-xl transition relative active:scale-95 cursor-pointer ${
                isActive 
                  ? 'text-blue-600 font-semibold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold rounded-full bg-amber-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-0.5" />
              )}
            </button>
          );
        })}

        {/* More button to toggle full drawer navigation */}
        <button
          type="button"
          id="bottom-nav-more"
          onClick={onOpenMoreMenu}
          className="flex-1 flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer"
        >
          <MoreHorizontal className="w-5 h-5 stroke-[1.8px]" />
          <span className="text-[10px] mt-1 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
