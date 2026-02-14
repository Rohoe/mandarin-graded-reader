import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import TopicForm from './TopicForm';
import './SyllabusPanel.css';

export default function SyllabusPanel({ completedLessons, onSelectLesson, onNewSyllabus, onShowSettings, onStandaloneGenerated }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { currentSyllabus, lessonIndex, loading } = state;

  // Form is open when no syllabus exists; auto-closes after generation via handleNewSyllabus
  const [formOpen, setFormOpen] = useState(!currentSyllabus);

  function handleNewSyllabus() {
    setFormOpen(false);
    onNewSyllabus?.();
  }

  const lessons = currentSyllabus?.lessons || [];

  function handleLessonClick(idx) {
    if (loading) return;
    act.setLessonIndex(idx);
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

      {/* Topic form — collapses to a compact bar when a syllabus is active */}
      <div className="syllabus-panel__form-section">
        {!currentSyllabus || formOpen ? (
          <TopicForm
            onNewSyllabus={handleNewSyllabus}
            onStandaloneGenerated={onStandaloneGenerated}
            onCancel={currentSyllabus ? () => setFormOpen(false) : undefined}
          />
        ) : (
          <div className="syllabus-panel__syllabus-bar">
            <span className="syllabus-panel__syllabus-bar-label">
              {currentSyllabus.topic} · HSK {currentSyllabus.level}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setFormOpen(true)}>
              ✎ New
            </button>
          </div>
        )}
      </div>

      {/* Lesson list */}
      {currentSyllabus && lessons.length > 0 && (
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
              const isActive    = idx === lessonIndex;
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
