import { useT } from '../../i18n';

export default function ReaderEmptyState({ decorativeChars, charIndex, onOpenSidebar }) {
  const t = useT();
  return (
    <div className="reader-view reader-view--empty">
      <div className="reader-view__empty-state">
        <span className="reader-view__empty-hanzi">{decorativeChars[charIndex]}</span>
        <p className="font-display reader-view__empty-text">
          {t('reader.empty.text')}
        </p>
        <button className="btn btn-primary reader-view__empty-open-menu" onClick={onOpenSidebar}>
          ☰ {t('reader.empty.openMenu')}
        </button>
      </div>
    </div>
  );
}
