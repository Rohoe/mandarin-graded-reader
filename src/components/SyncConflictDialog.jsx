import './SyncConflictDialog.css';

export default function SyncConflictDialog({ conflict, onResolve, onCancel }) {
  return (
    <div className="sync-conflict-overlay" onClick={e => e.target === e.currentTarget && onCancel?.()}>
      <div className="sync-conflict-dialog card card-padded fade-in">
        <h2 className="font-display">⚠️ Sync Conflict Detected</h2>

        <div className="sync-conflict-warning">
          <p>
            Your local data differs from the cloud. This can happen if you have an old browser tab open
            or haven't synced in a while.
          </p>
        </div>

        <div className="sync-conflict-comparison">
          <div className="sync-conflict-option">
            <h3>☁️ Cloud Data</h3>
            <ul>
              <li><strong>Last updated:</strong> {conflict.cloudDate}</li>
              <li><strong>Syllabi:</strong> {conflict.cloudSyllabusCount}</li>
              <li><strong>Standalone readers:</strong> {conflict.cloudStandaloneCount ?? '—'}</li>
              <li><strong>Vocabulary:</strong> {conflict.cloudVocabCount ?? '—'}</li>
            </ul>
          </div>

          <div className="sync-conflict-option">
            <h3>💻 Local Data</h3>
            <ul>
              <li><strong>Last modified:</strong> {conflict.localDate}</li>
              <li><strong>Syllabi:</strong> {conflict.localSyllabusCount}</li>
              <li><strong>Standalone readers:</strong> {conflict.localStandaloneCount ?? '—'}</li>
              <li><strong>Vocabulary:</strong> {conflict.localVocabCount ?? '—'}</li>
            </ul>
          </div>
        </div>

        <div className="sync-conflict-actions">
          <button
            className="btn btn-primary"
            onClick={() => onResolve('cloud')}
          >
            Use Cloud Data {conflict.cloudNewer && '(Recommended)'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onResolve('local')}
          >
            Use Local Data {!conflict.cloudNewer && '(Recommended)'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onResolve('merge')}
          >
            Merge Both
          </button>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
          >
            Decide Later
          </button>
        </div>

        <p className="sync-conflict-note">
          <strong>Tip:</strong> "Merge Both" combines data from cloud and local without losing anything.
          "Use Cloud" or "Use Local" will overwrite the other side entirely.
        </p>
      </div>
    </div>
  );
}
