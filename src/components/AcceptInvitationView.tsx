import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { StaffInvitation } from '../types';
import { lookupStaffInvitation, acceptStaffInvitation } from '../lib/db';
import { formatRoleName, ALL_PERMISSIONS } from '../lib/permissions';
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
  X,
  Sparkles
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

  // Form states for unauthenticated users
  const [authMode, setAuthMode] = useState<'create_account' | 'sign_in'>('create_account');
  const [fullName, setFullName] = useState('');
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
          setErrorMsg('Invitation not found. Please verify the invitation link or request a new one from your store owner.');
          setLoading(false);
          return;
        }

        if (new Date(inv.expires_at) < new Date()) {
          setIsExpired(true);
          setErrorMsg('This invitation link has expired. Please ask the store owner to send a new invitation.');
          setInvitation(inv);
          setLoading(false);
          return;
        }

        if (inv.status === 'accepted') {
          setErrorMsg('This invitation has already been accepted.');
          setInvitation(inv);
          setLoading(false);
          return;
        }

        setInvitation(inv);
        setFullName(inv.name || '');
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
        user.email || invitation.email, 
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
      let activeEmail = invitation.email;

      if (!user) {
        if (authMode === 'create_account') {
          const { error, data } = await signUp(invitation.email, password, fullName || invitation.name);
          if (error) throw error;
          activeUserId = data?.user?.id || `user-${Date.now()}`;
        } else {
          const { error, data } = await signIn(invitation.email, password) as any;
          if (error) throw error;
          activeUserId = data?.user?.id || `user-${Date.now()}`;
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

  // Android Deep Link URL
  const androidDeepLink = `stockwise://invite/${token}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center animate-pulse mb-3 shadow-lg shadow-blue-500/30">
          <StoreIcon className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold">Verifying StockWise Invitation...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to store security backend...</p>
      </div>
    );
  }

  // Success Confirmation Screen
  if (successResult) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl animate-in zoom-in-95 duration-150">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Invitation Accepted
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-3">
            Welcome to {successResult.storeName}!
          </h2>
          <p className="text-xs text-slate-300 mt-2">
            You are now authorized as <strong>{successResult.role}</strong>. Your dashboard and point-of-sale tools have been personalized with your granted permissions.
          </p>

          <div className="mt-6 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onCompleted}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Store Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg && !invitation) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-6 text-center text-white shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Invalid Invitation</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">{errorMsg}</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition cursor-pointer"
            >
              Go to StockWise Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const grantedPerms = invitation?.permissions || [];
  const previewItems = ALL_PERMISSIONS.filter((p) => grantedPerms.includes(p.id));

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
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
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-200">
          {/* Invitation Banner */}
          <div className="text-center pb-5 border-b border-slate-700/80">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Store Invitation</span>
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-white mt-3 tracking-tight">
              You&apos;ve been invited to join
            </h2>
            <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
              {invitation?.store_name || 'StockWise Store'}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400">
              <span>Appointed Role:</span>
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                {formatRoleName(invitation?.role)}
              </span>
              <span>&bull;</span>
              <span>Invited by: <strong className="text-slate-200">{invitation?.invited_by_name || 'Store Owner'}</strong></span>
            </div>
          </div>

          {/* Android Deep Link Pill */}
          <div className="my-4 p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-200">
              <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Have the StockWise Android App installed?</span>
            </div>
            <a
              href={androidDeepLink}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shrink-0 transition flex items-center gap-1"
            >
              <span>Open in App</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Permissions Summary Card */}
          <div className="my-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Features You Will Be Authorized to Access:
              </span>
              <span className="font-mono text-emerald-400 font-bold">{previewItems.length} granted</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {previewItems.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{p.label}</span>
                </div>
              ))}
              {previewItems.length > 10 && (
                <div className="text-slate-400 italic text-[11px] pt-1">
                  + {previewItems.length - 10} more permissions assigned
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="my-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* If already logged in */}
          {user ? (
            <div className="pt-2 space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-400">Existing StockWise account detected</div>
                  <div className="text-slate-400 font-mono mt-0.5">{user.email}</div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>

              <button
                type="button"
                onClick={handleAcceptLoggedIn}
                disabled={submitting || isExpired}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <span>Activating Store Membership...</span>
                ) : (
                  <>
                    <span>Accept Invitation &amp; Join Store</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* If not logged in, prompt password setup / login */
            <form onSubmit={handleSubmitUnauthenticated} className="pt-2 space-y-4">
              <div className="flex border-b border-slate-700 pb-1 mb-3">
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
                  Existing Account Sign In
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Invited Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={invitation?.email || ''}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900/60 border border-slate-700 rounded-xl text-slate-400 cursor-not-allowed font-mono"
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
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {authMode === 'create_account' ? 'Create a Secure Password' : 'Your Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                {authMode === 'create_account' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">Minimum 6 characters</p>
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
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || isExpired}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>
                      {authMode === 'create_account' ? 'Create Password & Accept Invitation' : 'Sign In & Accept Invitation'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-4 pt-3 border-t border-slate-700/60 text-center">
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
