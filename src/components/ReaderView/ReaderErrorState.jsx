export default function ReaderErrorState({ error, onRetry, onDismiss }) {
  return (
    <div className="reader-view reader-view--error">
      <div className="reader-view__error card card-padded">
        <p className="reader-view__error-title font-display">Something went wrong</p>
        <p className="reader-view__error-msg text-muted">{error}</p>
        <div className="reader-view__error-actions">
          <button className="btn btn-primary" onClick={onRetry}>Retry</button>
          <button className="btn btn-ghost" onClick={onDismiss}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
