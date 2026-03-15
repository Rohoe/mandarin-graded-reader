import { getLang } from '../../lib/languages';
import { useT } from '../../i18n';

export default function StandaloneReaderItem({ reader, isActive, loading, generatedReader, onSelect, onArchive, onDelete }) {
  const t = useT();

  return (
    <div className="syllabus-panel__item-group">
      <div
        className={`syllabus-panel__lesson-btn syllabus-panel__standalone-item ${isActive ? 'syllabus-panel__lesson-btn--active' : ''} ${reader.completedAt ? 'syllabus-panel__lesson-btn--completed' : ''}`}
      >
        <button
          className="syllabus-panel__standalone-select"
          onClick={() => onSelect?.(reader.key)}
          disabled={loading}
        >
          {reader.completedAt && <span className="syllabus-panel__lesson-num">✓</span>}
          <span className="syllabus-panel__lesson-text">
            <span className="syllabus-panel__lesson-zh text-chinese">
              {reader.titleZh || generatedReader?.titleZh || reader.topic}
              {reader.isDemo && <span className="text-muted" style={{ fontSize: 'var(--text-xs)', marginLeft: '0.35em' }}>{t('standalone.sample')}</span>}
            </span>
            <span className="syllabus-panel__lesson-en text-muted">
              {reader.titleEn || generatedReader?.titleEn || `${getLang(reader.langId).proficiency.name} ${reader.level}`}
            </span>
          </span>
        </button>
        {!reader.isDemo && (
          <button
            className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
            onClick={() => onArchive(reader.key)}
            aria-label={t('standalone.archiveReader')}
            title={t('standalone.archiveTooltip')}
          >⊟</button>
        )}
        {!reader.isDemo && (
          <button
            className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
            onClick={() => onDelete(reader.key, reader.topic)}
            aria-label={t('standalone.deleteReader')}
            title={t('standalone.deleteTooltip')}
          >×</button>
        )}
      </div>
    </div>
  );
}
