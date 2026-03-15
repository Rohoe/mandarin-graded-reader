import { useT } from '../../i18n';

export default function ConfirmDialog({ label, onConfirm, onCancel }) {
  const t = useT();

  return (
    <div className="syllabus-panel__confirm-overlay" role="dialog" aria-modal="true">
      <div className="syllabus-panel__confirm-dialog">
        <p className="syllabus-panel__confirm-title">
          {t('confirm.deleteReader')}
        </p>
        <p className="syllabus-panel__confirm-label text-muted">
          {t('confirm.willBeRemoved', { label })}
        </p>
        <div className="syllabus-panel__confirm-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-sm syllabus-panel__confirm-delete-btn"
            onClick={onConfirm}
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
