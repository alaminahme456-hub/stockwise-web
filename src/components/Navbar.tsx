import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { 
  Store as StoreIcon, 
  ChevronDown, 
  Plus, 
  Search, 
  LogOut, 
  User as UserIcon, 
  Menu, 
  Wifi, 
  WifiOff, 
  Check,
  Building2,
  Sparkles,
  ShieldCheck,
  UserCheck,
  CreditCard,
  RotateCcw
} from 'lucide-react';
import { Store } from '../types';
import { resetDemoData } from '../lib/demoData';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onOpenCreateStore: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileMenu,
  onOpenSearch,
  onOpenCreateStore,
}) => {
  const { user, profile, signOut, isDemo, loginWithDemo, exitDemo } = useAuth();
  const { currentStore, stores, setCurrentStore, isRealtimeConnected, currentMemberRole, refreshStoreData, refreshStores } = useStore();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const handleSwitchDemoRole = (role: 'owner' | 'manager' | 'cashier') => {
    loginWithDemo(role);
    setRoleDropdownOpen(false);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to default initial store state?')) {
      resetDemoData();
      refreshStores();
      refreshStoreData();
      setRoleDropdownOpen(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Menu Trigger + Brand / Current Store Selector */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="btn-mobile-menu"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Store Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            id="store-selector-button"
            onClick={() => {
              setStoreDropdownOpen(!storeDropdownOpen);
              setUserDropdownOpen(false);
              setRoleDropdownOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition text-sm font-medium"
          >
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <StoreIcon className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs text-slate-500 leading-none">Active Store</div>
              <div className="text-sm font-semibold text-slate-900 leading-tight max-w-[140px] truncate">
                {currentStore ? currentStore.name : 'Select Store'}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>

          {storeDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setStoreDropdownOpen(false)} 
              />
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Your Stores ({stores.length})
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
                  {stores.map((s: Store) => {
                    const isSelected = currentStore?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCurrentStore(s);
                          setStoreDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-sm transition ${
                          isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="truncate">{s.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStoreDropdownOpen(false);
                      onOpenCreateStore();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 font-medium flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Store</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Actions: Demo Switcher, Real-time status, Quick Search, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Demo Mode Role Switcher */}
        {isDemo && (
          <div className="relative">
            <button
              type="button"
              id="btn-demo-role-selector"
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen);
                setUserDropdownOpen(false);
                setStoreDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Demo: {currentMemberRole.toUpperCase()}</span>
              <ChevronDown className="w-3 h-3 text-amber-700" />
            </button>

            {roleDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRoleDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Switch Demo Role
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchDemoRole('owner')}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                      currentMemberRole === 'owner' ? 'font-semibold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Store Owner (Full Access)</span>
                    </div>
                    {currentMemberRole === 'owner' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchDemoRole('manager')}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                      currentMemberRole === 'manager' ? 'font-semibold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>Manager</span>
                    </div>
                    {currentMemberRole === 'manager' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchDemoRole('cashier')}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                      currentMemberRole === 'cashier' ? 'font-semibold text-emerald-600 bg-emerald-50/50' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>POS Cashier</span>
                    </div>
                    {currentMemberRole === 'cashier' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleResetData}
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset Demo Data</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        exitDemo();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Exit Demo to Sign In</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Real-time Status Indicator */}
        <div 
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
          title={isRealtimeConnected ? 'Cross-device sync active' : 'Connecting to database...'}
        >
          {isRealtimeConnected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isDemo ? 'Demo Live' : 'Realtime Live'}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Connected</span>
            </>
          )}
        </div>

        {/* Global Search Button */}
        <button
          type="button"
          id="btn-global-search"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition text-sm"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            id="user-profile-button"
            onClick={() => {
              setUserDropdownOpen(!userDropdownOpen);
              setStoreDropdownOpen(false);
              setRoleDropdownOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-700"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden md:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
          </button>

          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
                  {isDemo && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
                      Demo Account ({currentMemberRole})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    signOut();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isDemo ? 'Exit Demo Mode' : 'Sign out'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
