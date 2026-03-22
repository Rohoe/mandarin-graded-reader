import { useState } from 'react';
import { getLang, getLessonTitle } from '../../lib/languages';
import { useT } from '../../i18n';

export default function CompletedSection({ completedSyllabi, completedStandalone, completedSeries, generatedReaders, syllabusProgress, onSyllabusClick, onSelectStandalone, standaloneKey, loading }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const count = completedSyllabi.length + completedStandalone.length + completedSeries.length;
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
        <ul id="completed-items-list" className="syllabus-panel__list" role="list">
          {completedSyllabi.map(s => {
            const sLang = getLang(s.langId);
            const progress = syllabusProgress[s.id] || { completedLessons: [] };
            const lessons = s.lessons || [];
            return (
              <li key={s.id}>
                <button
                  className="syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__lesson-btn--completed"
                  onClick={() => onSyllabusClick(s.id)}
                  disabled={loading}
                >
                  <span className="syllabus-panel__lesson-num">{'\u2713'}</span>
                  <span className="syllabus-panel__lesson-text">
                    <span className="syllabus-panel__lesson-zh text-chinese">{s.topic}</span>
                    <span className="syllabus-panel__lesson-en text-muted">
                      {sLang.proficiency.name} {s.level} {'\u00B7'} {progress.completedLessons.length}/{lessons.length}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {completedSeries.map(({ seriesId, episodes }) => {
            const firstEp = episodes[0];
            const baseTopic = (firstEp.topic || '').replace(/^Continuation:\s*/i, '');
            return (
              <li key={`series-${seriesId}`}>
                <button
                  className="syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__lesson-btn--completed"
                  onClick={() => onSelectStandalone?.(firstEp.key)}
                  disabled={loading}
                >
                  <span className="syllabus-panel__lesson-num">{'\u2713'}</span>
                  <span className="syllabus-panel__lesson-text">
                    <span className="syllabus-panel__lesson-zh text-chinese">
                      {firstEp.titleZh || generatedReaders[firstEp.key]?.titleZh || baseTopic}
                    </span>
                    <span className="syllabus-panel__lesson-en text-muted">
                      {t('series.episodes', { count: episodes.length })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {completedStandalone.map(r => (
            <li key={r.key}>
              <button
                className={`syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__lesson-btn--completed ${standaloneKey === r.key ? 'syllabus-panel__lesson-btn--active' : ''}`}
                onClick={() => onSelectStandalone?.(r.key)}
                disabled={loading}
              >
                <span className="syllabus-panel__lesson-num">{'\u2713'}</span>
                <span className="syllabus-panel__lesson-text">
                  <span className="syllabus-panel__lesson-zh text-chinese">
                    {r.titleZh || generatedReaders[r.key]?.titleZh || r.topic}
                  </span>
                  <span className="syllabus-panel__lesson-en text-muted">
                    {r.titleEn || generatedReaders[r.key]?.titleEn || `${getLang(r.langId).proficiency.name} ${r.level}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
