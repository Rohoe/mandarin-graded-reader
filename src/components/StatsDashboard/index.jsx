import { useEffect, useMemo, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { computeStats } from '../../lib/stats';
import { getAllLanguages } from '../../lib/languages';
import { loadActivityStash } from '../../lib/storage';
import './StatsDashboard.css';

export default function StatsDashboard({ onClose, onShowFlashcards }) {
  const { state } = useApp();
  const [fullActivity, setFullActivity] = useState(null);
  const stateForStats = useMemo(() => {
    if (!fullActivity) return state;
    return { ...state, learningActivity: fullActivity };
  }, [state, fullActivity]);
  const stats = useMemo(() => computeStats(stateForStats), [stateForStats]);

  const handleLoadFullHistory = useCallback(() => {
    const stash = loadActivityStash();
    if (stash.length > 0) {
      setFullActivity([...stash, ...state.learningActivity]);
    }
  }, [state.learningActivity]);
  const languages = getAllLanguages();

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const maxBarCount = Math.max(...stats.wordsByPeriod.map(b => b.count), 1);

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-dashboard card" onClick={e => e.stopPropagation()}>
        <div className="stats-dashboard__header">
          <h2 className="stats-dashboard__title font-display">Learning Stats</h2>
          <button className="btn btn-ghost btn-sm stats-dashboard__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Summary cards */}
        <div className="stats-dashboard__summary">
          <div className="stats-card">
            <span className="stats-card__value">{stats.totalWords}</span>
            <span className="stats-card__label">Words Learned</span>
          </div>
          <div className="stats-card">
            <span className="stats-card__value">{stats.totalLessons === 0 ? '—' : `${stats.completedLessons}/${stats.totalLessons}`}</span>
            <span className="stats-card__label">{stats.totalLessons === 0 ? 'No courses yet' : 'Lessons Done'}</span>
          </div>
          <div className="stats-card">
            <span className="stats-card__value">{stats.streak}</span>
            <span className="stats-card__label">Day Streak</span>
          </div>
          <div className="stats-card">
            <span className="stats-card__value">{stats.avgQuizScore ?? '—'}</span>
            <span className="stats-card__label">Avg Quiz Score</span>
          </div>
        </div>

        {/* Flashcard review entry point */}
        {stats.totalWords > 0 && onShowFlashcards && (
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={onShowFlashcards}>
              Review flashcards
            </button>
          </div>
        )}

        {/* Vocab over time chart */}
        {stats.wordsByPeriod.length > 0 && (
          <div className="stats-dashboard__section">
            <h3 className="stats-dashboard__section-title font-display">Vocabulary Growth</h3>
            <div className="stats-chart">
              {stats.wordsByPeriod.map((bucket, i) => (
                <div key={i} className="stats-chart__col">
                  <div className="stats-chart__bar-wrap">
                    <div
                      className="stats-chart__bar"
                      style={{ height: `${(bucket.count / maxBarCount) * 100}%` }}
                    />
                  </div>
                  <span className="stats-chart__count">{bucket.count || ''}</span>
                  <span className="stats-chart__label">{bucket.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-language breakdown */}
        {Object.keys(stats.wordsByLang).length > 0 && (
          <div className="stats-dashboard__section">
            <h3 className="stats-dashboard__section-title font-display">By Language</h3>
            <div className="stats-dashboard__lang-list">
              {Object.entries(stats.wordsByLang).map(([langId, count]) => {
                const lang = languages.find(l => l.id === langId);
                return (
                  <div key={langId} className="stats-lang-row">
                    <span className="stats-lang-row__name">{lang?.label || langId}</span>
                    <span className="stats-lang-row__count">{count} words</span>
                    <div className="stats-lang-row__bar-wrap">
                      <div className="stats-lang-row__bar" style={{ width: `${(count / stats.totalWords) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity counts */}
        <div className="stats-dashboard__section">
          <h3 className="stats-dashboard__section-title font-display">Activity</h3>
          <div className="stats-dashboard__activity">
            <span>{stats.readersGenerated} readers generated</span>
            <span>{stats.quizCount} quizzes graded</span>
            <span>{stats.syllabusCount} syllabi created</span>
            <span>{stats.standaloneCount} standalone readers</span>
          </div>
          {!fullActivity && (
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
              Showing last 90 days.{' '}
              <button className="btn btn-ghost btn-xs" onClick={handleLoadFullHistory} style={{ padding: 0, textDecoration: 'underline' }}>
                Load full history
              </button>
            </p>
          )}
          {fullActivity && (
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
              Showing full history ({fullActivity.length} entries)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
