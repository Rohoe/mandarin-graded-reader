import { useT } from '../../i18n';

export default function ReaderErrorState({ error, onRetry, onDismiss }) {
  const t = useT();
  return (
    <div className="reader-view reader-view--error">
      <div className="reader-view__error card card-padded">
        <p className="reader-view__error-title font-display">{t('reader.error.title')}</p>
        <p className="reader-view__error-msg text-muted">{error}</p>
        <div className="reader-view__error-actions">
          <button className="btn btn-primary" onClick={onRetry}>{t('common.retry')}</button>
          <button className="btn btn-ghost" onClick={onDismiss}>{t('common.dismiss')}</button>
        </div>
      </div>
    </div>
  );
}
