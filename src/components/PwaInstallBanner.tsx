import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, RefreshCw, Sparkles, X } from 'lucide-react';
import { useI18n } from '../i18n/context';

export const PwaInstallBanner: React.FC = () => {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // If running inside desktop app, install prompt is unnecessary
    if (window.desktop) {
      return;
    }

    // PWA install prompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Online / Offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker in web mode
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            };
          }
        };
      }).catch((err) => {
        // Preview environments or sandboxes may restrict service workers; log quietly
        console.debug('ServiceWorker registration note:', err);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Offline Status Badge */}
      <div className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${
        isOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      }`}>
        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span>{isOnline ? 'Offline Ready' : 'Offline Mode'}</span>
      </div>

      {/* Update Available notification */}
      {updateAvailable && (
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-colors animate-pulse"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Update Available</span>
        </button>
      )}

      {/* Install App button */}
      {showInstallBtn && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors"
          title="Install LogicBench as a standalone desktop app"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      )}
    </div>
  );
};
