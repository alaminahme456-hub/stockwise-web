import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { 
  Building2, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  Settings,
  Menu
} from 'lucide-react';
import { NavigationTab } from '../types';

interface NavbarProps {
  onNavigate?: (tab: NavigationTab) => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, onOpenMobileMenu }) => {
  const { user, profile, signOut } = useAuth();
  const { currentStore, isRealtimeConnected, currentMemberRole } = useStore();
  
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userInitials = profile?.full_name 
    ? profile.full_name.charAt(0).toUpperCase() 
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const displayRole = currentMemberRole
    ? currentMemberRole.charAt(0).toUpperCase() + currentMemberRole.slice(1).toLowerCase()
    : 'Owner';

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-4 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Position the StockWise branding at the top */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-sm shadow-blue-500/20 shrink-0">
          SW
        </div>
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
            <span>StockWise</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5 hidden sm:block">
            Cloud Retail Management &amp; POS
          </div>
        </div>
      </div>

      {/* Right Actions: Active Store indicator, Owner Role Badge, Realtime status, User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Active Store Display - 'Switch Store' link hidden (store switching is handled via Settings) */}
        <div 
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shrink-0"
          title={`Active store: ${currentStore?.name || 'Main Store'}`}
        >
          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-400 hidden md:inline text-xs">Store:</span>
          <span className="font-semibold text-slate-800 max-w-[70px] xs:max-w-[100px] sm:max-w-[140px] truncate text-[11px] sm:text-xs">
            {currentStore?.name || 'Main Store'}
          </span>
        </div>

        {/* Owner Role Display - Clearly visible on all screen sizes */}
        <div className="relative shrink-0">
          <div 
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-xs"
            title={`Role: ${displayRole}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{displayRole}</span>
          </div>
        </div>

        {/* Real-time Status Indicator */}
        <div 
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
          title={isRealtimeConnected ? 'Cross-device sync active' : 'Connected to Supabase'}
        >
          {isRealtimeConnected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime Live</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Connected</span>
            </>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            id="user-profile-button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-700 cursor-pointer"
            aria-label="User Account"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
              {userInitials}
            </div>
            <span className="hidden lg:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
              {profile?.full_name || user?.email?.split('@')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
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
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
