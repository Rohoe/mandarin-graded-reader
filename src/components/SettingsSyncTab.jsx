import { signInWithGoogle, signInWithApple, signOut } from '../lib/cloudSync';

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
  return (
    <>
      {/* localStorage usage */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">Browser Storage Usage</h3>
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
        <h3 className="settings-section__title form-label">Backup &amp; Restore</h3>
        <p className="settings-section__desc text-muted">
          Export all your data (syllabi, readers, vocabulary) as a JSON file, or restore from a previous backup. Your API key is never included.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportBackup}>
            Export backup ↓
          </button>
          {!confirmRestore ? (
            <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmRestore(true); setRestoreError(null); }}>
              Restore from backup…
            </button>
          ) : (
            <>
              <label
                className="btn btn-sm"
                style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)', cursor: 'pointer' }}
              >
                This will replace all data — choose file
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleRestoreFile}
                />
              </label>
              <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmRestore(false); setRestoreError(null); }}>
                Cancel
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
        <h3 className="settings-section__title form-label">Cloud Sync</h3>
        {state.cloudUser ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <p className="settings-section__desc text-muted" style={{ margin: 0 }}>
                Signed in as <strong>{state.cloudUser.email || state.cloudUser.user_metadata?.full_name || state.cloudUser.id}</strong>
              </p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handlePushToCloud}
                disabled={state.cloudSyncing}
              >
                {state.cloudSyncing ? 'Syncing\u2026' : 'Push to cloud'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handlePullFromCloud}
                disabled={state.cloudSyncing}
              >
                {state.cloudSyncing ? 'Syncing\u2026' : 'Pull from cloud'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="settings-section__desc text-muted">
              Sign in to sync your syllabi, readers, and vocabulary across devices.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => signInWithGoogle()}>
                Sign in with Google
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => signInWithApple()}>
                Sign in with Apple
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
              <h3 className="settings-section__title form-label">Revert Last Sync</h3>
              <p className="settings-section__desc text-muted">
                Undo the auto-merge that ran on startup{snapshotDate ? ` (${snapshotDate})` : ''}. Restores your local data to its pre-merge state.
              </p>
              {!confirmRevert ? (
                <button className="btn btn-secondary btn-sm" onClick={() => setConfirmRevert(true)}>
                  Revert last sync
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--color-error)' }}
                    onClick={() => {
                      performRevertMerge();
                      setConfirmRevert(false);
                      act.notify('success', 'Reverted to pre-merge state.');
                    }}
                  >
                    Confirm revert
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRevert(false)}>
                    Cancel
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
        <h3 className="settings-section__title form-label">Save Folder</h3>

        {!fsSupported ? (
          <p className="settings-section__desc text-muted">
            File System Access API is not supported in this browser.
            Use Chrome or Edge to enable disk persistence.
          </p>
        ) : saveFolder ? (
          <>
            <div className="settings-folder-active">
              <span className="settings-folder-icon">📁</span>
              <div>
                <p className="settings-folder-name">{saveFolder.name}</p>
                <p className="settings-section__desc text-muted" style={{ marginTop: 2 }}>
                  Data is being saved to this folder on every change.
                </p>
              </div>
            </div>
            <div className="settings-section__form">
              <button className="btn btn-secondary btn-sm" onClick={pickSaveFolder}>
                Change folder
              </button>
              <button className="btn btn-ghost btn-sm" onClick={removeSaveFolder}>
                Remove folder
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="settings-section__desc text-muted">
              Choose a folder on your computer where the app will save your syllabi,
              readers, and vocabulary as JSON files. This is in addition to browser
              storage and survives clearing browser data.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={pickSaveFolder}>
              📁 Choose save folder…
            </button>
          </>
        )}
      </section>
    </>
  );
}
