import { getLang, getLessonTitle } from '../../lib/languages';

export default function SyllabusCourseItem({ syllabus, progress, isActive, isExpanded, standaloneKey, syllabusView, loading, onSyllabusClick, onToggleExpand, onLessonClick }) {
  const sLang = getLang(syllabus.langId);
  const completedSet = new Set(progress.completedLessons);
  const lessons = syllabus.lessons || [];

  return (
    <div className="syllabus-panel__item-group">
      <button
        className={`syllabus-panel__item-btn ${isActive ? 'syllabus-panel__item-btn--active' : ''}`}
        onClick={() => onSyllabusClick(syllabus.id)}
      >
        <span className="syllabus-panel__item-text">
          <span className="syllabus-panel__item-title text-chinese">{syllabus.topic}</span>
          <span className="syllabus-panel__item-meta text-muted">
            {sLang.proficiency.name} {syllabus.level} · {completedSet.size}/{lessons.length}
          </span>
        </span>
        {lessons.length > 0 && (
          <span
            className="syllabus-panel__caret-btn"
            onClick={(e) => onToggleExpand(e, syllabus.id)}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse lessons' : 'Expand lessons'}
          >
            {isExpanded ? '▾' : '▸'}
          </span>
        )}
      </button>

      {/* Always-visible progress bar */}
      {lessons.length > 0 && (
        <div className="syllabus-panel__progress-bar syllabus-panel__progress-bar--always">
          <div
            className="syllabus-panel__progress-fill"
            style={{ width: `${(completedSet.size / lessons.length) * 100}%` }}
          />
        </div>
      )}

      {/* Nested lessons when expanded */}
      {isExpanded && lessons.length > 0 && (
        <div className="syllabus-panel__nested-lessons">
          <ul className="syllabus-panel__list" role="list">
            {lessons.map((lesson, idx) => {
              const lessonActive = idx === progress.lessonIndex && syllabusView === 'lesson' && !standaloneKey && isActive;
              const isCompleted = completedSet.has(idx);
              return (
                <li key={idx}>
                  <button
                    className={`syllabus-panel__lesson-btn
                      ${lessonActive ? 'syllabus-panel__lesson-btn--active' : ''}
                      ${isCompleted ? 'syllabus-panel__lesson-btn--completed' : ''}
                    `}
                    onClick={() => onLessonClick(syllabus.id, idx)}
                    disabled={loading}
                  >
                    <span className="syllabus-panel__lesson-num">
                      {isCompleted ? '✓' : `${idx + 1}`}
                    </span>
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh text-chinese">
                        {getLessonTitle(lesson, syllabus.langId)}
                      </span>
                      <span className="syllabus-panel__lesson-en text-muted">
                        {lesson.title_en}
                      </span>
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
