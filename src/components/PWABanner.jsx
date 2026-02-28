import { usePWA } from '../hooks/usePWA';
import './PWABanner.css';

export default function PWABanner() {
  const { isOnline, needRefresh, canInstall, updateApp, installApp, dismissInstall } = usePWA();

  return (
    <>
      {!isOnline && (
        <div className="pwa-offline-bar" role="alert">
          You are offline — reading and flashcards still work.
        </div>
      )}

      {needRefresh && (
        <div className="pwa-toast" role="alert">
          <span className="pwa-toast__text">A new version is available.</span>
          <div className="pwa-toast__actions">
            <button className="btn btn-primary btn-sm" onClick={updateApp}>
              Refresh
            </button>
          </div>
        </div>
      )}

      {canInstall && !needRefresh && (
        <div className="pwa-toast">
          <span className="pwa-toast__text">Install this app for offline access.</span>
          <div className="pwa-toast__actions">
            <button className="btn btn-primary btn-sm" onClick={installApp}>
              Install
            </button>
            <button className="btn btn-ghost btn-sm" onClick={dismissInstall}>
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
