import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { NavigationTab } from '../types';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Sparkles, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Store as StoreIcon, 
  Package, 
  Users, 
  ShoppingCart, 
  UserCheck 
} from 'lucide-react';

interface StoreSetupProgressProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const StoreSetupProgress: React.FC<StoreSetupProgressProps> = ({ onNavigate }) => {
  const { currentStore, products, customers, sales } = useStore();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`stockwise_setup_dismissed_${currentStore?.id}`) === 'true';
    }
    return false;
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Check stored staff invitation or members count
  const [hasStaff, setHasStaff] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentStore) {
      try {
        const storedKey = `stockwise_user_data_${currentStore.owner_id}`;
        const raw = localStorage.getItem(storedKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const members = parsed.storeMembers || [];
          const invs = parsed.staffInvitations || [];
          setHasStaff(members.length > 1 || invs.length > 0);
        }
      } catch {
        setHasStaff(false);
      }
    }
  }, [currentStore]);

  // Real milestone determinations
  const stepStoreInfo = Boolean(
    currentStore?.name && 
    (currentStore.phone || currentStore.address || currentStore.email || currentStore.business_name)
  );
  const stepProduct = products.length > 0;
  const stepCustomer = customers.length > 0;
  const stepSale = sales.length > 0;
  const stepStaff = hasStaff;

  const steps = [
    {
      id: 'store_info',
      title: 'Store information',
      description: 'Add your business contact and location details',
      completed: stepStoreInfo,
      tab: 'settings' as NavigationTab,
      icon: StoreIcon,
      actionText: 'Update Details',
    },
    {
      id: 'product',
      title: 'Add your first product',
      description: 'Create catalog item with pricing and stock levels',
      completed: stepProduct,
      tab: 'products' as NavigationTab,
      icon: Package,
      actionText: 'Add Product',
    },
    {
      id: 'customer',
      title: 'Add your first customer',
      description: 'Record customer directory profiles and credit lines',
      completed: stepCustomer,
      tab: 'customers' as NavigationTab,
      icon: Users,
      actionText: 'Add Customer',
    },
    {
      id: 'sale',
      title: 'Make your first sale',
      description: 'Ring up a checkout or credit order in the POS register',
      completed: stepSale,
      tab: 'pos' as NavigationTab,
      icon: ShoppingCart,
      actionText: 'Open POS Register',
    },
    {
      id: 'staff',
      title: 'Invite your staff',
      description: 'Delegate cashier, sales, and manager role permissions',
      completed: stepStaff,
      tab: 'staff' as NavigationTab,
      icon: UserCheck,
      actionText: 'Invite Team',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isAllComplete = completedCount === steps.length;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined' && currentStore) {
      localStorage.setItem(`stockwise_setup_dismissed_${currentStore.id}`, 'true');
    }
  };

  const handleRestore = () => {
    setIsDismissed(false);
    if (typeof window !== 'undefined' && currentStore) {
      localStorage.removeItem(`stockwise_setup_dismissed_${currentStore.id}`);
    }
  };

  if (isDismissed) {
    if (isAllComplete) return null;
    return (
      <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold">Store Setup: {progressPercent}% complete ({completedCount}/{steps.length} steps)</span>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
        >
          Resume Setup
        </button>
      </div>
    );
  }

  // 100% celebration
  if (isAllComplete) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-950">Store Setup Complete (100%)</div>
            <div className="text-xs text-emerald-800">All 5 core operational steps are completed. Your business is ready to scale!</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold px-2 py-1 rounded-lg hover:bg-emerald-100/60 transition cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200">
      {/* Header bar */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {progressPercent}%
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Set up your store</h3>
              <span className="text-xs text-slate-500 font-medium">
                {completedCount} of {steps.length} completed
              </span>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-36 sm:w-48 h-2 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Step checklist */}
      {isExpanded && (
        <div className="divide-y divide-slate-100 p-2 sm:p-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl flex items-center justify-between gap-3 transition ${
                  step.completed 
                    ? 'opacity-80 bg-slate-50/40' 
                    : 'hover:bg-blue-50/50 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs sm:text-sm font-semibold truncate ${
                        step.completed ? 'text-slate-600 line-through' : 'text-slate-900'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>

                {!step.completed && (
                  <button
                    type="button"
                    onClick={() => onNavigate(step.tab)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <span>{step.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
