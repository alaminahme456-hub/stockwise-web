import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { 
  Building2, 
  LogOut, 
  ChevronDown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  CreditCard, 
  RotateCcw,
  Settings
} from 'lucide-react';
import { NavigationTab } from '../types';
import { resetDemoData } from '../lib/demoData';

interface NavbarProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { user, profile, signOut, isDemo, loginWithDemo, exitDemo } = useAuth();
  const { currentStore, isRealtimeConnected, currentMemberRole, refreshStoreData, refreshStores } = useStore();
  
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

  const userInitials = profile?.full_name 
    ? profile.full_name.charAt(0).toUpperCase() 
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Position the StockWise branding at the top */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm shadow-blue-500/20">
          SW
        </div>
        <div>
          <div className="text-lg font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <span>StockWise</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5 hidden sm:block">
            Cloud Retail Management &amp; POS
          </div>
        </div>
      </div>

      {/* Right Actions: Active Store indicator, Demo Role Switcher, Realtime status, User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Active Store Display with link to Settings */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-400 hidden xs:inline">Store:</span>
          <span className="font-semibold text-slate-800 max-w-[120px] sm:max-w-[160px] truncate">
            {currentStore?.name || 'Select Store'}
          </span>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] hover:underline ml-0.5 cursor-pointer"
              title="Switch store in Settings"
            >
              Switch
            </button>
          )}
        </div>

        {/* Demo Mode Role Switcher */}
        {isDemo && (
          <div className="relative">
            <button
              type="button"
              id="btn-demo-role-selector"
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen);
                setUserDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden sm:inline">Role: {currentMemberRole.toUpperCase()}</span>
              <span className="sm:hidden">{currentMemberRole.toUpperCase()}</span>
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
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
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
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
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
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
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
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
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
                      className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition cursor-pointer"
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

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            id="user-profile-button"
            onClick={() => {
              setUserDropdownOpen(!userDropdownOpen);
              setRoleDropdownOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-700 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              {userInitials}
            </div>
            <span className="hidden md:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
          </button>

          {userDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
                  {currentStore && (
                    <div className="mt-1 text-xs text-slate-600 flex items-center justify-between">
                      <span className="text-slate-400">Store:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[130px]">{currentStore.name}</span>
                    </div>
                  )}
                  {isDemo && (
                    <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
                      Demo Account ({currentMemberRole})
                    </span>
                  )}
                </div>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('settings');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Manage &amp; Switch Stores</span>
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    signOut();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition cursor-pointer"
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
