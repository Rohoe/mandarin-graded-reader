import { getLang } from '../../lib/languages';
import { useT } from '../../i18n';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

export default function PathGroup({
  path, isActive, isExpanded, onPathClick, onToggleExpand, onUnitClick,
}) {
  const t = useT();
  const langConfig = getLang(path.langId);
  const completedCount = path.units.filter(u => u.status === 'completed').length;
  const totalCount = path.units.length;

  return (
    <div className="syllabus-panel__item-group">
      <button
        className={`syllabus-panel__item-btn ${isActive ? 'syllabus-panel__item-btn--active' : ''}`}
        onClick={() => onPathClick(path.id)}
      >
        <span className="syllabus-panel__item-text">
          <span className="syllabus-panel__item-title">{path.title}</span>
          <span className="syllabus-panel__item-meta text-muted">
            {langConfig.proficiency.name} {path.level} · {completedCount}/{totalCount} {t('pathHome.units', { count: '' }).trim()}
          </span>
        </span>
        {totalCount > 0 && (
          <span
            className="syllabus-panel__caret-btn"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(path.id); }}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('path.collapse') : t('path.expand')}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
      </button>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="syllabus-panel__progress-bar syllabus-panel__progress-bar--always">
          <div
            className="syllabus-panel__progress-fill"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Nested units when expanded */}
      {isExpanded && totalCount > 0 && (
        <div className="syllabus-panel__nested-lessons">
          <ul className="syllabus-panel__list" role="list">
            {path.units.map((unit, i) => {
              const isCompleted = unit.status === 'completed';
              return (
                <li key={i}>
                  <button
                    className={`syllabus-panel__lesson-btn${isCompleted ? ' syllabus-panel__lesson-btn--completed' : ''}`}
                    onClick={() => unit.syllabusId ? onUnitClick(unit.syllabusId) : onPathClick(path.id)}
                    disabled={!unit.syllabusId}
                  >
                    <span className="syllabus-panel__lesson-num">
                      {isCompleted ? <Check size={14} /> : `${i + 1}`}
                    </span>
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh">{unit.title}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
