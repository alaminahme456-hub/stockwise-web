import React, { useState } from 'react';
import { 
  STOCKWISE_ANDROID_APK_URL, 
  isApkConfigured, 
  getAndroidDeepLink,
  getAndroidIntentUrl,
  ANDROID_PACKAGE_NAME 
} from '../config/appConfig';
import { 
  Download, 
  Store as StoreIcon, 
  ExternalLink, 
  Smartphone, 
  CheckCircle2, 
  ArrowLeft, 
  AlertCircle,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

interface AndroidDownloadViewProps {
  token?: string | null;
  onOpenInvitation?: () => void;
  onContinueInBrowser?: () => void;
}

export const AndroidDownloadView: React.FC<AndroidDownloadViewProps> = ({
  token,
  onOpenInvitation,
  onContinueInBrowser,
}) => {
  const isReady = isApkConfigured();
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false);

  const inviteUrl = token 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${token}` 
    : '/';

  const deepLink = token ? getAndroidDeepLink(token) : 'stockwise://';
  const intentUrl = token ? getAndroidIntentUrl(token) : `intent://#Intent;package=${ANDROID_PACKAGE_NAME};end`;

  const handleDownloadClick = () => {
    if (!isReady) return;
    setDownloadTriggered(true);
    // User triggered download manually
    if (typeof window !== 'undefined') {
      window.location.href = STOCKWISE_ANDROID_APK_URL;
    }
  };

  const handleOpenAppClick = () => {
    setDeepLinkAttempted(true);
    if (typeof window !== 'undefined') {
      // Attempt custom scheme first, fallback to intent URI
      window.location.href = deepLink;
      setTimeout(() => {
        // If app is not installed, prompt or keep them on download screen
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-md w-full mx-auto my-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/25 border border-blue-400/30">
            <StoreIcon className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">ALTECH StockWise</h1>
          <p className="text-xs text-blue-400 font-medium tracking-wider uppercase">Android Staff App</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Application</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Download StockWise
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Install the StockWise Android app to continue using your staff invitation.
            </p>
          </div>

          {/* Invitation Token Indicator */}
          {token && (
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="text-slate-300 font-medium">Your invitation is secured:</span>{' '}
                <span className="font-mono text-blue-300 font-bold">
                  {token.slice(0, 12)}...
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Your store credentials and role permissions will be applied once you open the app.
                </p>
              </div>
            </div>
          )}

          {/* Download Action Section */}
          <div className="space-y-3">
            {isReady ? (
              <button
                type="button"
                onClick={handleDownloadClick}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Download StockWise APK</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs text-left flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-300">Download Being Prepared</div>
                  <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                    StockWise Android download is currently being prepared. Please try again later.
                  </p>
                </div>
              </div>
            )}

            {downloadTriggered && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>APK download requested. Check your notifications.</span>
              </div>
            )}
          </div>

          {/* Secondary instruction */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 text-left flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-slate-300">
              <strong>Next step:</strong> After installing StockWise, return to your invitation link to continue.
            </p>
          </div>

          {/* "Already installed StockWise?" section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <p className="text-xs font-medium text-slate-400">
              Already installed StockWise?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleOpenAppClick}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-white font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Launch StockWise Android Application"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>Open in StockWise App</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenInvitation) {
                    onOpenInvitation();
                  } else if (typeof window !== 'undefined') {
                    window.location.href = inviteUrl;
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 active:bg-blue-600/30 text-blue-300 font-semibold text-xs border border-blue-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Open invitation acceptance page"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-300" />
                <span>Open Invitation</span>
              </button>
            </div>

            {deepLinkAttempted && (
              <p className="text-[11px] text-slate-400">
                Opening app via <span className="font-mono text-blue-400">stockwise://invite</span>... If nothing happens, install the APK above.
              </p>
            )}
          </div>

          {/* Browser fallback option for administrators / preview mode */}
          {onContinueInBrowser && (
            <div className="pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onContinueInBrowser}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline transition cursor-pointer"
              >
                Continue in Web Browser (Preview / Admin mode)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-500">
          StockWise by ALTECH &bull; Secure Multi-Store Retail Platform
        </div>
      </div>
    </div>
  );
};
