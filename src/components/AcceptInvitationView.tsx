import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { StaffInvitation } from '../types';
import { lookupStaffInvitation, acceptStaffInvitation } from '../lib/db';
import { formatRoleName, ALL_PERMISSIONS } from '../lib/permissions';
import { detectDeviceType, isCapacitorNative, isIOSUser, isAndroidUser } from '../lib/deviceDetection';
import { AndroidDownloadView } from './AndroidDownloadView';
import { 
  Store as StoreIcon, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  User, 
  Mail, 
  Smartphone, 
  ExternalLink,
  Sparkles,
  Share2,
  PlusSquare,
  ChevronRight,
  Clock,
  Layers
} from 'lucide-react';

interface AcceptInvitationViewProps {
  token: string;
  onCompleted: () => void;
  onCancel: () => void;
}

export const AcceptInvitationView: React.FC<AcceptInvitationViewProps> = ({
  token,
  onCompleted,
  onCancel,
}) => {
  const { user, signIn, signUp } = useAuth();
  const { refreshStores, setCurrentStore } = useStore();

  const [invitation, setInvitation] = useState<StaffInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isAlreadyAccepted, setIsAlreadyAccepted] = useState(false);

  // Device detection
  const [deviceType] = useState<'android' | 'ios' | 'desktop'>(() => detectDeviceType());
  const [isNativeApp] = useState<boolean>(() => isCapacitorNative());
  const [androidBypassToWeb, setAndroidBypassToWeb] = useState(false);

  // iOS-specific UI state: Show the "Continue to StockWise" form when tapped
  const [iosContinueClicked, setIosContinueClicked] = useState(false);

  // Form states for unauthenticated users
  const [authMode, setAuthMode] = useState<'create_account' | 'sign_in'>('create_account');
  const [fullName, setFullName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ storeName: string; role: string } | null>(null);

  useEffect(() => {
    async function loadInvitation() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const inv = await lookupStaffInvitation(token);
        if (!inv) {
          setErrorMsg('This invitation link is invalid.');
          setLoading(false);
          return;
        }

        if (new Date(inv.expires_at) < new Date()) {
          setIsExpired(true);
          setErrorMsg('This invitation has expired. Ask the store owner to send you a new invitation.');
          setInvitation(inv);
          setLoading(false);
          return;
        }

        if (inv.status === 'accepted') {
          setIsAlreadyAccepted(true);
          setErrorMsg('This invitation has already been accepted.');
          setInvitation(inv);
          setLoading(false);
          return;
        }

        setInvitation(inv);
        setFullName(inv.name || '');
        if (inv.email) {
          setEmailInput(inv.email);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to inspect invitation details.');
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [token]);

  // Handle immediate acceptance if user is already authenticated
  const handleAcceptLoggedIn = async () => {
    if (!invitation || !user) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await acceptStaffInvitation(
        token, 
        user.id, 
        user.email || invitation.email || '', 
        user.user_metadata?.full_name || fullName || invitation.name
      );

      await refreshStores();
      setCurrentStore(result.store);
      setSuccessResult({
        storeName: result.store.name,
        role: formatRoleName(result.member.role),
      });

      setTimeout(() => {
        onCompleted();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle account creation and immediate acceptance
  const handleSubmitUnauthenticated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (authMode === 'create_account') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let activeUserId = user?.id;
      const activeEmail = (invitation.email || emailInput).trim().toLowerCase();

      if (!activeEmail || !activeEmail.includes('@')) {
        setErrorMsg('Please enter a valid email address to complete your staff account setup.');
        return;
      }

      if (!user) {
        if (authMode === 'create_account') {
          const { error, data } = await signUp(activeEmail, password, fullName || invitation.name);
          if (error) throw error;
          activeUserId = data?.user?.id || `user-${Date.now()}`;
        } else {
          const res = (await signIn(activeEmail, password)) as any;
          if (res?.error) throw res.error;
          activeUserId = res?.data?.user?.id || `user-${Date.now()}`;
        }
      }

      const result = await acceptStaffInvitation(
        token, 
        activeUserId || `user-${Date.now()}`, 
        activeEmail, 
        fullName || invitation.name
      );

      await refreshStores();
      setCurrentStore(result.store);
      setSuccessResult({
        storeName: result.store.name,
        role: formatRoleName(result.member.role),
      });

      setTimeout(() => {
        onCompleted();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to authenticate and accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Android Deep Link URLs
  const androidDeepLink = `stockwise://invite/${token}`;

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-14 h-14 rounded-3xl bg-blue-600 flex items-center justify-center animate-pulse mb-3 shadow-xl shadow-blue-500/30">
          <StoreIcon className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white">Verifying StockWise Invitation...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to store security backend...</p>
      </div>
    );
  }

  // 2. Success Confirmation Screen
  if (successResult) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Invitation Accepted
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-3">
              Welcome to {successResult.storeName}!
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              You are now authorized as <strong>{successResult.role}</strong>. Your store inventory, point-of-sale register, and authorized tools are ready.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onCompleted}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Store Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Error States (Invalid / Expired / Already Accepted)
  if (errorMsg && (!invitation || isExpired || isAlreadyAccepted)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl space-y-4">
          <div className={`w-14 h-14 rounded-3xl flex items-center justify-center mx-auto ${
            isAlreadyAccepted 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : isExpired 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {isAlreadyAccepted ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : isExpired ? (
              <Clock className="w-7 h-7" />
            ) : (
              <AlertCircle className="w-7 h-7" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              {isAlreadyAccepted 
                ? 'Invitation Already Accepted' 
                : isExpired 
                ? 'Invitation Expired' 
                : 'Invalid Invitation'}
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {errorMsg}
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            {isAlreadyAccepted ? (
              <button
                type="button"
                onClick={onCompleted}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
              >
                Open StockWise
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                Return to StockWise Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Android Device Experience (When not already in the native Capacitor app)
  // If Android user in a browser and hasn't explicitly chosen "Continue in Web Browser"
  if (deviceType === 'android' && !isNativeApp && !androidBypassToWeb) {
    return (
      <AndroidDownloadView
        token={token}
        onOpenInvitation={() => setAndroidBypassToWeb(true)}
        onContinueInBrowser={() => setAndroidBypassToWeb(true)}
      />
    );
  }

  const grantedPerms = invitation?.permissions || [];
  const previewItems = ALL_PERMISSIONS.filter((p) => grantedPerms.includes(p.id));

  // 5. iPhone / iPad Invitation Experience (Clean mobile-first PWA flow with Safari steps)
  if (deviceType === 'ios' && !iosContinueClicked && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-8 px-4 sm:px-6 text-white">
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/30 border border-blue-400/30">
              <StoreIcon className="w-8 h-8" />
            </div>
            <h1 className="text-xs uppercase tracking-widest font-bold text-blue-400">
              ALTECH StockWise
            </h1>
            <h2 className="text-2xl font-black text-white tracking-tight">
              You&apos;re invited to StockWise
            </h2>
          </div>

          {/* Invitation Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
            <div className="space-y-1.5 pb-4 border-b border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Store</span>
              <div className="text-2xl font-black text-blue-400 tracking-tight">
                {invitation?.store_name || 'StockWise Store'}
              </div>
              <p className="text-xs text-slate-300 pt-1">
                You&apos;ve been invited to join this store as:
              </p>
              <div className="inline-block mt-1">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {formatRoleName(invitation?.role)}
                </span>
              </div>
            </div>

            {/* Granted permissions pill */}
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-left text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorized Capabilities</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">
                {previewItems.length} features
              </span>
            </div>

            {/* Primary Action Button: "Continue to StockWise" */}
            <button
              type="button"
              onClick={() => setIosContinueClicked(true)}
              className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to StockWise</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Optional Section: "Use StockWise like an app" */}
            <div className="pt-5 border-t border-slate-800 text-left space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Use StockWise like an app
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Add StockWise to your iPhone Home Screen for quick access.
              </p>

              {/* Three Safari Steps */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/50 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    1
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <span>Tap Share</span>
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/50 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    2
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <span>Tap Add to Home Screen</span>
                    <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/50 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    3
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <span>Tap Add</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500">
            StockWise by ALTECH &bull; Progressive Web App (iOS Compatible)
          </div>
        </div>
      </div>
    );
  }

  // 6. Standard Desktop & Full Acceptance Experience (Also for iOS after tapping "Continue" or for logged in users)
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">ALTECH StockWise</h1>
            <p className="text-xs text-blue-400 font-medium tracking-wide uppercase">Staff Invitation Portal</p>
          </div>
        </div>

        {/* Main Invitation Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-200 space-y-5">
          {/* Invitation Banner */}
          <div className="text-center pb-5 border-b border-slate-800">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>You&apos;ve Been Invited!</span>
            </span>

            <div className="mt-3">
              <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Store:</span>
              <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-0.5">
                {invitation?.store_name || 'StockWise Store'}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400">
              <span>Role:</span>
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                {formatRoleName(invitation?.role)}
              </span>
              <span>&bull;</span>
              <span>Invited by: <strong className="text-slate-200">{invitation?.invited_by_name || 'Store Owner'}</strong></span>
            </div>
          </div>

          {/* If on Android Native App, show app verified badge */}
          {isNativeApp && (
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>StockWise Android App Connected</span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20">Native</span>
            </div>
          )}

          {/* Permissions Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Authorized Store Permissions:
              </span>
              <span className="font-mono text-emerald-400 font-bold">{previewItems.length} granted</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {previewItems.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{p.label}</span>
                </div>
              ))}
              {previewItems.length > 8 && (
                <div className="text-slate-400 italic text-[11px] pt-1">
                  + {previewItems.length - 8} more permissions
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Acceptance Flow: Already Logged In */}
          {user ? (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-400">Authenticated as</div>
                  <div className="text-slate-300 font-mono mt-0.5">{user.email}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>

              <button
                type="button"
                onClick={handleAcceptLoggedIn}
                disabled={submitting || isExpired}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <span>Activating Membership...</span>
                ) : (
                  <>
                    <span>Accept Invitation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Acceptance Flow: Guest / Account Setup */
            <form onSubmit={handleSubmitUnauthenticated} className="space-y-4 pt-1">
              <div className="flex border-b border-slate-800 pb-1 mb-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('create_account')}
                  className={`flex-1 py-2 text-center text-xs font-bold transition border-b-2 cursor-pointer ${
                    authMode === 'create_account'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create Password &amp; Join
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('sign_in')}
                  className={`flex-1 py-2 text-center text-xs font-bold transition border-b-2 cursor-pointer ${
                    authMode === 'sign_in'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In with Existing Account
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address {invitation?.email ? '(Pre-verified)' : '*'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    disabled={Boolean(invitation?.email)}
                    placeholder="employee@company.com"
                    value={invitation?.email || emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl font-mono ${
                      invitation?.email
                        ? 'bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-950 border-slate-700 text-white focus:outline-none focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              {authMode === 'create_account' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {authMode === 'create_account' ? 'Create a Secure Password' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                {authMode === 'create_account' && (
                  <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters</p>
                )}
              </div>

              {authMode === 'create_account' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || isExpired}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>Accept Invitation</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Cancel &amp; Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
