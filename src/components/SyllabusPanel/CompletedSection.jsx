import { useState } from 'react';
import { getLang } from '../../lib/languages';
import { useT } from '../../i18n';

export default function CompletedSection({ completedSyllabi, completedStandalone, completedSeries, completedPaths = [], generatedReaders, syllabusProgress, onSyllabusClick, onSelectStandalone, onSelectPath, standaloneKey, activeSyllabusId, activePathId, loading }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const count = completedSyllabi.length + completedStandalone.length + completedSeries.length + completedPaths.length;
  if (count === 0) return null;

  return (
    <div className="syllabus-panel__archived-section">
      <button
        className="syllabus-panel__archived-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="completed-items-list"
      >
        <span className="form-label text-muted">{t('completed.title', { count })}</span>
        <span className="syllabus-panel__caret-btn">{open ? '\u25BE' : '\u25B8'}</span>
      </button>
      {open && (
        <div id="completed-items-list">
          {completedSyllabi.map(s => {
            const sLang = getLang(s.langId);
            const progress = syllabusProgress[s.id] || { completedLessons: [] };
            const lessons = s.lessons || [];
            return (
              <div key={s.id} className="syllabus-panel__item-group">
                <button
                  className={`syllabus-panel__item-btn ${s.id === activeSyllabusId ? 'syllabus-panel__item-btn--active' : ''}`}
                  onClick={() => onSyllabusClick(s.id)}
                  disabled={loading}
                >
                  <span className="syllabus-panel__item-text">
                    <span className="syllabus-panel__item-title text-chinese">{s.topic}</span>
                    <span className="syllabus-panel__item-meta text-muted">
                      {sLang.proficiency.name} {s.level} {'\u00B7'} {progress.completedLessons.length}/{lessons.length}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
          {completedPaths.map(path => (
            <div key={path.id} className="syllabus-panel__item-group">
              <button
                className={`syllabus-panel__item-btn ${activePathId === path.id ? 'syllabus-panel__item-btn--active' : ''}`}
                onClick={() => onSelectPath?.(path.id)}
                disabled={loading}
              >
                <span className="syllabus-panel__item-text">
                  <span className="syllabus-panel__item-title">📚 {path.title}</span>
                  <span className="syllabus-panel__item-meta text-muted">
                    {path.units?.length || 0} units
                  </span>
                </span>
              </button>
            </div>
          ))}
          {completedSeries.map(({ seriesId, episodes }) => {
            const firstEp = episodes[0];
            const baseTopic = (firstEp.topic || '').replace(/^Continuation:\s*/i, '');
            return (
              <div key={`series-${seriesId}`} className="syllabus-panel__item-group">
                <div className={`syllabus-panel__lesson-btn syllabus-panel__standalone-item ${standaloneKey && episodes.some(r => r.key === standaloneKey) ? 'syllabus-panel__lesson-btn--active' : ''}`}>
                  <button
                    className="syllabus-panel__standalone-select"
                    onClick={() => onSelectStandalone?.(firstEp.key)}
                    disabled={loading}
                  >
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh text-chinese">
                        {firstEp.titleZh || generatedReaders[firstEp.key]?.titleZh || baseTopic}
                      </span>
                      <span className="syllabus-panel__lesson-en text-muted">
                        {t('series.episodes', { count: episodes.length })}
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
          {completedStandalone.map(r => (
            <div key={r.key} className="syllabus-panel__item-group">
              <div className={`syllabus-panel__lesson-btn syllabus-panel__standalone-item ${standaloneKey === r.key ? 'syllabus-panel__lesson-btn--active' : ''}`}>
                <button
                  className="syllabus-panel__standalone-select"
                  onClick={() => onSelectStandalone?.(r.key)}
                  disabled={loading}
                >
                  <span className="syllabus-panel__lesson-text">
                    <span className="syllabus-panel__lesson-zh text-chinese">
                      {r.titleZh || generatedReaders[r.key]?.titleZh || r.topic}
                    </span>
                    <span className="syllabus-panel__lesson-en text-muted">
                      {r.titleEn || generatedReaders[r.key]?.titleEn || `${getLang(r.langId).proficiency.name} ${r.level}`}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
