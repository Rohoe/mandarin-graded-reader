export default function ConfirmDialog({ label, onConfirm, onCancel }) {
  return (
    <div className="syllabus-panel__confirm-overlay" role="dialog" aria-modal="true">
      <div className="syllabus-panel__confirm-dialog">
        <p className="syllabus-panel__confirm-title">
          Delete reader?
        </p>
        <p className="syllabus-panel__confirm-label text-muted">
          "{label}" will be permanently removed.
        </p>
        <div className="syllabus-panel__confirm-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn btn-sm syllabus-panel__confirm-delete-btn"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
