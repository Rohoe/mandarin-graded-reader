import { usePWA } from '../hooks/usePWA';
import { useT } from '../i18n';
import './PWABanner.css';

export default function PWABanner() {
  const t = useT();
  const { isOnline, needRefresh, canInstall, updateApp, installApp, dismissInstall } = usePWA();

  return (
    <>
      {!isOnline && (
        <div className="pwa-offline-bar" role="alert">
          {t('pwa.offline')}
        </div>
      )}

      {needRefresh && (
        <div className="pwa-toast" role="alert">
          <span className="pwa-toast__text">{t('pwa.newVersion')}</span>
          <div className="pwa-toast__actions">
            <button className="btn btn-primary btn-sm" onClick={updateApp}>
              {t('pwa.refresh')}
            </button>
          </div>
        </div>
      )}

      {canInstall && !needRefresh && (
        <div className="pwa-toast">
          <span className="pwa-toast__text">{t('pwa.installPrompt')}</span>
          <div className="pwa-toast__actions">
            <button className="btn btn-primary btn-sm" onClick={installApp}>
              {t('pwa.install')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={dismissInstall}>
              {t('pwa.notNow')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
