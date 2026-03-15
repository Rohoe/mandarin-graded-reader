import { signInWithGoogle, signInWithApple, signOut } from '../lib/cloudSync';
import { useT } from '../i18n';

export default function SettingsSyncTab({
  state,
  dispatch,
  act,
  usage,
  handleExportBackup,
  confirmRestore,
  setConfirmRestore,
  restoreError,
  handleRestoreFile,
  handlePushToCloud,
  handlePullFromCloud,
  confirmRevert,
  setConfirmRevert,
  saveFolder,
  fsSupported,
  pickSaveFolder,
  removeSaveFolder,
  performRevertMerge,
}) {
  const t = useT();

  return (
    <>
      {/* localStorage usage */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">{t('settings.sync.storageUsage')}</h3>
        <div className="settings-storage">
          <div className="settings-storage__bar">
            <div className="settings-storage__fill" style={{ width: `${Math.max(Math.min(usage.pct, 100), usage.pct > 0 ? 3 : 0)}%` }} />
          </div>
          <p className="settings-storage__label text-subtle">
            {(usage.used / 1024).toFixed(0)} KB / {(usage.limit / 1024 / 1024).toFixed(0)} MB ({usage.pct}% used)
          </p>
        </div>
      </section>

      <hr className="divider" />

      {/* Backup & Restore */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">{t('settings.sync.backupRestore')}</h3>
        <p className="settings-section__desc text-muted">
          {t('settings.sync.backupDesc')}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportBackup}>
            {t('settings.sync.exportBackup')}
          </button>
          {!confirmRestore ? (
            <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmRestore(true); setRestoreError(null); }}>
              {t('settings.sync.restoreFromBackup')}
            </button>
          ) : (
            <>
              <label
                className="btn btn-sm"
                style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)', cursor: 'pointer' }}
              >
                {t('settings.sync.replaceAllData')}
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleRestoreFile}
                />
              </label>
              <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmRestore(false); setRestoreError(null); }}>
                {t('common.cancel')}
              </button>
            </>
          )}
        </div>
        {restoreError && (
          <p className="settings-section__desc" style={{ color: 'var(--color-error)', marginTop: 'var(--space-2)' }}>
            ⚠ {restoreError}
          </p>
        )}
      </section>

      <hr className="divider" />

      {/* Cloud Sync */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">{t('settings.sync.cloudSync')}</h3>
        {state.cloudUser ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p className="settings-section__desc text-muted" style={{ margin: 0 }}>
                {t('settings.sync.signedInAs')} <strong>{state.cloudUser.email || state.cloudUser.user_metadata?.full_name || state.cloudUser.id}</strong>
              </p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
                onClick={() => signOut()}
              >
                {t('settings.sync.signOut')}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handlePushToCloud}
                disabled={state.cloudSyncing}
              >
                {state.cloudSyncing ? t('settings.sync.syncing') : t('settings.sync.pushToCloud')}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handlePullFromCloud}
                disabled={state.cloudSyncing}
              >
                {state.cloudSyncing ? t('settings.sync.syncing') : t('settings.sync.pullFromCloud')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="settings-section__desc text-muted">
              {t('settings.sync.signInDesc')}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => signInWithGoogle()}>
                {t('settings.sync.signInGoogle')}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => signInWithApple()}>
                {t('settings.sync.signInApple')}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Revert last sync — only when a merge snapshot exists and user is signed in */}
      {state.hasMergeSnapshot && state.cloudUser && (() => {
        let snapshotDate = '';
        try {
          const raw = localStorage.getItem('gradedReader_preMergeSnapshot');
          if (raw) {
            const snap = JSON.parse(raw);
            snapshotDate = new Date(snap.timestamp).toLocaleString();
          }
        } catch {}
        return (
          <>
            <hr className="divider" />
            <section className="settings-section">
              <h3 className="settings-section__title form-label">{t('settings.sync.revertLastSync')}</h3>
              <p className="settings-section__desc text-muted">
                {t('settings.sync.revertDesc', { date: snapshotDate ? ` (${snapshotDate})` : '' })}
              </p>
              {!confirmRevert ? (
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmRevert(true)}>
                  {t('settings.sync.revertBtn')}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--color-error)' }}
                    onClick={() => {
                      performRevertMerge();
                      setConfirmRevert(false);
                      act.notify('success', t('notify.revertedToPreMerge'));
                    }}
                  >
                    {t('settings.sync.confirmRevert')}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRevert(false)}>
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </section>
          </>
        );
      })()}

      <hr className="divider" />

      {/* Save folder */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">{t('settings.sync.saveFolder')}</h3>

        {!fsSupported ? (
          <p className="settings-section__desc text-muted">
            {t('settings.sync.fsNotSupported')}
          </p>
        ) : saveFolder ? (
          <>
            <div className="settings-folder-active">
              <span className="settings-folder-icon">📁</span>
              <div>
                <p className="settings-folder-name">{saveFolder.name}</p>
                <p className="settings-section__desc text-muted" style={{ marginTop: 2 }}>
                  {t('settings.sync.saveFolderActive')}
                </p>
              </div>
            </div>
            <div className="settings-section__form">
              <button className="btn btn-secondary btn-sm" onClick={pickSaveFolder}>
                {t('settings.sync.changeFolder')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={removeSaveFolder}>
                {t('settings.sync.removeFolder')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="settings-section__desc text-muted">
              {t('settings.sync.saveFolderDesc')}
            </p>
            <button className="btn btn-secondary btn-sm" onClick={pickSaveFolder}>
              📁 {t('settings.sync.chooseSaveFolder')}
            </button>
          </>
        )}
      </section>
    </>
  );
}
