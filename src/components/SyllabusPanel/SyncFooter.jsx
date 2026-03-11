export default function SyncFooter({ cloudUser, cloudSyncing, cloudLastSynced, lastModified, onShowSettings, onShowStats, onShowFlashcards, onShowSignIn }) {
  return (
    <div className="syllabus-panel__footer">
      <div className="syllabus-panel__sync-status">
        {cloudUser ? (
          <>
            <span className="syllabus-panel__sync-icon" title={cloudUser.email || 'Signed in'}>☁</span>
            {cloudSyncing ? (
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--syncing">Syncing…</span>
            ) : cloudLastSynced && lastModified > cloudLastSynced ? (
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--unsynced">Unsynced</span>
            ) : cloudLastSynced ? (
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--synced">Synced</span>
            ) : (
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--unsynced">Not yet synced</span>
            )}
          </>
        ) : (
          <>
            <span className="syllabus-panel__sync-icon syllabus-panel__sync-icon--off" title="Not signed in">☁</span>
            <span className="syllabus-panel__sync-label syllabus-panel__sync-label--off">
              Not signed in
              <button className="syllabus-panel__sign-in-link" onClick={onShowSignIn}>Sign in</button>
            </span>
          </>
        )}
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onShowFlashcards}
        title="Flashcard review"
      >
        ⬡ Cards
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onShowStats}
        title="Learning stats"
      >
        ▦ Stats
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onShowSettings}
      >
        ⚙ Settings
      </button>
    </div>
  );
}
