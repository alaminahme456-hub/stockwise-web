import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'badge' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone PWA or native app, don't show prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'sidebar') {
      return (
        <button
          type="button"
          onClick={install}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/20 transition cursor-pointer ${className}`}
          title="Install StockWise App"
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Install App</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200">
            PWA
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition cursor-pointer ${className}`}
        title="Install StockWise on your device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit doesn't fire beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        {variant === 'sidebar' ? (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer ${className}`}
            title="Add StockWise to iPhone Home Screen"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Add to Home Screen</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">iOS</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer border border-slate-200 ${className}`}
            title="Add StockWise to your iPhone Home Screen"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Add to Home Screen</span>
            <span className="sm:hidden">Install</span>
          </button>
        )}

        {/* iOS Safari Step-by-Step Installation Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    SW
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Add StockWise to Home Screen</h3>
                    <p className="text-[11px] text-slate-400">Install StockWise on iPhone / iPad</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Tap the Share button</span>
                      <Share2 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Located in the bottom Safari toolbar (or top on iPad).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Select &quot;Add to Home Screen&quot;</span>
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Scroll down in the share sheet and tap the &quot;Add to Home Screen&quot; option.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>Tap &quot;Add&quot;</span>
                      <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      StockWise will appear on your Home Screen and launch in full-screen standalone mode.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
