import { getLang } from '../../lib/languages';
import { useT } from '../../i18n';

export default function PlanGroupItem({
  plan, planReaders, generatedReaders,
  isActive, isExpanded, standaloneKey, loading,
  onPlanClick, onToggleExpand, onReaderClick,
}) {
  const t = useT();
  const langConfig = getLang(plan.langId);
  const levelLabel = langConfig.proficiency.levels.find(l => l.value === plan.currentLevel)?.label || plan.currentLevel;

  const week = plan.currentWeek;
  let done = 0, total = 0;
  if (week && week.confirmed) {
    for (const d of week.days) for (const a of d.activities) { total++; if (a.status === 'completed') done++; }
  }

  return (
    <div className="syllabus-panel__item-group">
      <button
        className={`syllabus-panel__item-btn ${isActive ? 'syllabus-panel__item-btn--active' : ''}`}
        onClick={() => onPlanClick(plan.id)}
      >
        <span className="syllabus-panel__item-text">
          <span className="syllabus-panel__item-title">{langConfig.nameNative}</span>
          <span className="syllabus-panel__item-meta text-muted">
            {levelLabel}{total > 0 ? ` · ${done}/${total}` : ''}
          </span>
        </span>
        {planReaders.length > 0 && (
          <span
            className="syllabus-panel__caret-btn"
            onClick={(e) => onToggleExpand(e, plan.id)}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('course.collapseLessons') : t('course.expandLessons')}
          >
            {isExpanded ? '▾' : '▸'}
          </span>
        )}
      </button>

      {total > 0 && (
        <div className="syllabus-panel__progress-bar syllabus-panel__progress-bar--always">
          <div className="syllabus-panel__progress-fill" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}

      {isExpanded && planReaders.length > 0 && (
        <div className="syllabus-panel__nested-lessons">
          <ul className="syllabus-panel__list" role="list">
            {planReaders.map((r, idx) => (
              <li key={r.key}>
                <button
                  className={`syllabus-panel__lesson-btn
                    ${standaloneKey === r.key ? 'syllabus-panel__lesson-btn--active' : ''}
                    ${r.completedAt ? 'syllabus-panel__lesson-btn--completed' : ''}`}
                  onClick={() => onReaderClick(r.key)}
                  disabled={loading}
                >
                  <span className="syllabus-panel__lesson-num">
                    {r.completedAt ? '✓' : `${idx + 1}`}
                  </span>
                  <span className="syllabus-panel__lesson-text">
                    <span className="syllabus-panel__lesson-zh text-chinese">
                      {r.titleZh || generatedReaders[r.key]?.titleZh || r.topic}
                    </span>
                    <span className="syllabus-panel__lesson-en text-muted">
                      {r.titleEn || generatedReaders[r.key]?.titleEn || `${langConfig.proficiency.name} ${r.level}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
