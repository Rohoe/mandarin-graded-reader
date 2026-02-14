import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import TopicForm from './TopicForm';
import './SyllabusPanel.css';

export default function SyllabusPanel({
  activeSyllabusId,
  standaloneKey,
  onSelectLesson,
  onNewSyllabus,
  onShowSettings,
  onStandaloneGenerated,
  onSwitchSyllabus,
  onSelectStandalone,
}) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { syllabi, syllabusProgress, standaloneReaders, loading } = state;

  const currentSyllabus  = syllabi.find(s => s.id === activeSyllabusId) || null;
  const progress         = syllabusProgress[activeSyllabusId] || { lessonIndex: 0, completedLessons: [] };
  const lessonIndex      = progress.lessonIndex;
  const completedLessons = new Set(progress.completedLessons);

  // Form is open when no syllabi exist; resets when active syllabus changes
  const [formOpen, setFormOpen] = useState(!currentSyllabus);
  useEffect(() => { setFormOpen(!currentSyllabus); }, [activeSyllabusId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNewSyllabus(newSyllabusId) {
    setFormOpen(false);
    onNewSyllabus?.(newSyllabusId);
  }

  const lessons = currentSyllabus?.lessons || [];

  function handleLessonClick(idx) {
    if (loading) return;
    act.setLessonIndex(activeSyllabusId, idx);
    onSelectLesson?.(idx);
  }

  return (
    <aside className="syllabus-panel">
      {/* Header */}
      <div className="syllabus-panel__header">
        <h1 className="syllabus-panel__app-title font-display">
          <span className="syllabus-panel__hanzi">读书</span>
          <span className="syllabus-panel__app-name">Graded Reader</span>
        </h1>
      </div>

      {/* Syllabus tabs — shown when at least one syllabus exists */}
      {syllabi.length > 0 && (
        <div className="syllabus-panel__tabs" role="tablist">
          {syllabi.map(s => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === activeSyllabusId && !standaloneKey}
              className={`syllabus-panel__tab ${s.id === activeSyllabusId && !standaloneKey ? 'syllabus-panel__tab--active' : ''}`}
              onClick={() => { onSwitchSyllabus?.(s.id); setFormOpen(false); }}
              title={`${s.topic} · HSK ${s.level}`}
            >
              <span className="syllabus-panel__tab-label">{s.topic}</span>
              <span className="syllabus-panel__tab-level">HSK {s.level}</span>
            </button>
          ))}
          <button
            className="syllabus-panel__tab syllabus-panel__tab--new"
            onClick={() => setFormOpen(true)}
            title="New syllabus or standalone reader"
            aria-label="New"
          >
            +
          </button>
        </div>
      )}

      {/* Topic form — shown when no syllabus exists or user clicked + */}
      {(!currentSyllabus || formOpen) && (
        <div className="syllabus-panel__form-section">
          <TopicForm
            onNewSyllabus={handleNewSyllabus}
            onStandaloneGenerated={onStandaloneGenerated}
            onCancel={currentSyllabus ? () => setFormOpen(false) : undefined}
          />
        </div>
      )}

      {/* Lesson list */}
      {currentSyllabus && !formOpen && lessons.length > 0 && (
        <div className="syllabus-panel__lessons">
          <div className="syllabus-panel__lessons-header">
            <span className="form-label">
              {currentSyllabus.topic} · HSK {currentSyllabus.level}
            </span>
            <span className="syllabus-panel__progress text-subtle">
              {completedLessons.size}/{lessons.length}
            </span>
          </div>

          <div className="syllabus-panel__progress-bar">
            <div
              className="syllabus-panel__progress-fill"
              style={{ width: `${(completedLessons.size / lessons.length) * 100}%` }}
            />
          </div>

          <ul className="syllabus-panel__list" role="list">
            {lessons.map((lesson, idx) => {
              const isActive    = idx === lessonIndex && !standaloneKey;
              const isCompleted = completedLessons.has(idx);

              return (
                <li key={idx}>
                  <button
                    className={`syllabus-panel__lesson-btn
                      ${isActive    ? 'syllabus-panel__lesson-btn--active'    : ''}
                      ${isCompleted ? 'syllabus-panel__lesson-btn--completed' : ''}
                    `}
                    onClick={() => handleLessonClick(idx)}
                    disabled={loading}
                  >
                    <span className="syllabus-panel__lesson-num">
                      {isCompleted ? '✓' : `${idx + 1}`}
                    </span>
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh text-chinese">
                        {lesson.title_zh}
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

      {/* Standalone readers list */}
      {standaloneReaders.length > 0 && (
        <div className="syllabus-panel__standalone">
          <div className="syllabus-panel__standalone-header">
            <span className="form-label">Standalone Readers</span>
          </div>
          <ul className="syllabus-panel__list" role="list">
            {standaloneReaders.map(r => (
              <li key={r.key}>
                <div
                  className={`syllabus-panel__lesson-btn syllabus-panel__standalone-item ${standaloneKey === r.key ? 'syllabus-panel__lesson-btn--active' : ''}`}
                >
                  <button
                    className="syllabus-panel__standalone-select"
                    onClick={() => onSelectStandalone?.(r.key)}
                    disabled={loading}
                  >
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh text-chinese">{r.topic}</span>
                      <span className="syllabus-panel__lesson-en text-muted">HSK {r.level}</span>
                    </span>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                    onClick={() => act.removeStandaloneReader(r.key)}
                    aria-label="Delete reader"
                    title="Delete this reader"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings link */}
      <div className="syllabus-panel__footer">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onShowSettings}
        >
          ⚙ Settings
        </button>
      </div>
    </aside>
  );
}
