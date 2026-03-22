import { useT } from '../../i18n';

export default function SeriesGroup({ seriesId, episodes, standaloneKey, loading, generatedReaders, isExpanded, onToggle, onSelect }) {
  const t = useT();
  const firstEp = episodes[0];
  const baseTopic = (firstEp.topic || '').replace(/^Continuation:\s*/i, '');

  return (
    <div className="syllabus-panel__item-group">
      <button
        className="syllabus-panel__item-btn syllabus-panel__series-header"
        onClick={() => onToggle(seriesId)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? `Collapse ${baseTopic} series` : `Expand ${baseTopic} series`}
      >
        <span className="syllabus-panel__item-text">
          <span className="syllabus-panel__item-title text-chinese">
            {firstEp.titleZh || generatedReaders[firstEp.key]?.titleZh || baseTopic}
          </span>
          <span className="syllabus-panel__item-meta text-muted">
            {episodes.length === 1 ? t('series.episodeOne') : t('series.episodes', { count: episodes.length })}
          </span>
        </span>
        <span className="syllabus-panel__caret-btn">{isExpanded ? '\u25BE' : '\u25B8'}</span>
      </button>
      {isExpanded && (
        <ul className="syllabus-panel__nested-lessons syllabus-panel__list" role="list">
          {episodes.map(r => (
            <li key={r.key}>
              <div className={`syllabus-panel__lesson-btn syllabus-panel__standalone-item ${standaloneKey === r.key ? 'syllabus-panel__lesson-btn--active' : ''} ${r.completedAt ? 'syllabus-panel__lesson-btn--completed' : ''}`}>
                <button
                  className="syllabus-panel__standalone-select"
                  onClick={() => onSelect?.(r.key)}
                  disabled={loading}
                >
                  <span className="syllabus-panel__lesson-text">
                    <span className="syllabus-panel__lesson-num">{r.completedAt ? '\u2713' : (r.episodeNumber || '\u00B7')}</span>
                    <span className="syllabus-panel__lesson-zh text-chinese">
                      {r.titleZh || generatedReaders[r.key]?.titleZh || r.topic}
                    </span>
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
