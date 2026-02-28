import { useState, useEffect, useCallback } from 'react';

/**
 * PWA hook: tracks online/offline status, SW update availability, and install prompt.
 */
export function usePWA() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  // Track online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Track SW updates — listen for controllerchange indicating a new SW activated
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    function onControllerChange() {
      setNeedRefresh(true);
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Also detect waiting SW on page load
    navigator.serviceWorker.ready.then(reg => {
      if (reg.waiting) setNeedRefresh(true);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedRefresh(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // Capture beforeinstallprompt
  useEffect(() => {
    function handleInstallPrompt(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  const updateApp = useCallback(() => {
    window.location.reload();
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const dismissInstall = useCallback(() => {
    setInstallPrompt(null);
  }, []);

  return {
    isOnline,
    needRefresh,
    canInstall: !!installPrompt,
    updateApp,
    installApp,
    dismissInstall,
  };
}
