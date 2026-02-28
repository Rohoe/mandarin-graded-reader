import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppSelector } from '../../context/useAppSelector';
import { computeStats } from '../../lib/stats';
import { getAllLanguages } from '../../lib/languages';
import { loadActivityStash } from '../../lib/storage';
import './StatsDashboard.css';

export default function StatsDashboard({ onClose, onShowFlashcards }) {
  const statsState = useAppSelector(s => ({
    syllabi: s.syllabi,
    syllabusProgress: s.syllabusProgress,
    standaloneReaders: s.standaloneReaders,
    learnedVocabulary: s.learnedVocabulary,
    learningActivity: s.learningActivity,
    readingTime: s.readingTime,
    generatedReaders: s.generatedReaders,
  }));
  const [fullActivity, setFullActivity] = useState(null);
  const stateForStats = useMemo(() => {
    if (!fullActivity) return statsState;
    return { ...statsState, learningActivity: fullActivity };
  }, [statsState, fullActivity]);
  const stats = useMemo(() => computeStats(stateForStats), [stateForStats]);

  const handleLoadFullHistory = useCallback(() => {
    const stash = loadActivityStash();
    if (stash.length > 0) {
      setFullActivity([...stash, ...statsState.learningActivity]);
    }
  }, [statsState.learningActivity]);
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
                    <span className="stats-lang-row__name">{lang?.nameNative || langId}</span>
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

        {/* Flashcard Review stats */}
        {stats.totalFlashcardReviews > 0 && (
          <div className="stats-dashboard__section">
            <h3 className="stats-dashboard__section-title font-display">Flashcard Review</h3>
            <div className="stats-dashboard__summary" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="stats-card">
                <span className="stats-card__value">{stats.totalFlashcardReviews}</span>
                <span className="stats-card__label">Total Reviews</span>
              </div>
              <div className="stats-card">
                <span className="stats-card__value">{stats.reviewsToday}</span>
                <span className="stats-card__label">Today</span>
              </div>
              <div className="stats-card">
                <span className="stats-card__value">{stats.flashcardStreak}</span>
                <span className="stats-card__label">Review Streak</span>
              </div>
              <div className="stats-card">
                <span className="stats-card__value">{stats.retentionRate != null ? `${stats.retentionRate}%` : '—'}</span>
                <span className="stats-card__label">Retention</span>
              </div>
            </div>
            {/* Mastery breakdown bar */}
            {stats.totalWords > 0 && (
              <div className="stats-mastery">
                <div className="stats-mastery__bar">
                  {stats.flashcardMastery.mastered > 0 && (
                    <div
                      className="stats-mastery__segment stats-mastery__segment--mastered"
                      style={{ flex: stats.flashcardMastery.mastered }}
                      title={`${stats.flashcardMastery.mastered} mastered`}
                    />
                  )}
                  {stats.flashcardMastery.learning > 0 && (
                    <div
                      className="stats-mastery__segment stats-mastery__segment--learning"
                      style={{ flex: stats.flashcardMastery.learning }}
                      title={`${stats.flashcardMastery.learning} learning`}
                    />
                  )}
                  {stats.flashcardMastery.new > 0 && (
                    <div
                      className="stats-mastery__segment stats-mastery__segment--new"
                      style={{ flex: stats.flashcardMastery.new }}
                      title={`${stats.flashcardMastery.new} new`}
                    />
                  )}
                </div>
                <div className="stats-mastery__labels">
                  <span className="stats-mastery__label"><span className="stats-mastery__dot stats-mastery__dot--mastered"></span>{stats.flashcardMastery.mastered} mastered</span>
                  <span className="stats-mastery__label"><span className="stats-mastery__dot stats-mastery__dot--learning"></span>{stats.flashcardMastery.learning} learning</span>
                  <span className="stats-mastery__label"><span className="stats-mastery__dot stats-mastery__dot--new"></span>{stats.flashcardMastery.new} new</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Forecast (7-day) */}
        {stats.reviewForecast && stats.totalWords > 0 && (
          <div className="stats-dashboard__section">
            <h3 className="stats-dashboard__section-title font-display">Review Forecast</h3>
            <div className="stats-chart">
              {stats.reviewForecast.map((day, i) => {
                const maxForecast = Math.max(...stats.reviewForecast.map(d => d.count), 1);
                return (
                  <div key={i} className="stats-chart__col">
                    <div className="stats-chart__bar-wrap">
                      <div
                        className="stats-chart__bar stats-chart__bar--forecast"
                        style={{ height: `${(day.count / maxForecast) * 100}%` }}
                      />
                    </div>
                    <span className="stats-chart__count">{day.count || ''}</span>
                    <span className="stats-chart__label">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Retention Curve (8-week) */}
        {stats.retentionCurve && stats.totalFlashcardReviews > 0 && (
          <div className="stats-dashboard__section">
            <h3 className="stats-dashboard__section-title font-display">Retention Curve</h3>
            <div className="stats-chart">
              {stats.retentionCurve.map((week, i) => (
                <div key={i} className="stats-chart__col">
                  <div className="stats-chart__bar-wrap">
                    <div
                      className="stats-chart__bar stats-chart__bar--retention"
                      style={{ height: week.rate != null ? `${week.rate}%` : '0%' }}
                    />
                  </div>
                  <span className="stats-chart__count">{week.rate != null ? `${week.rate}%` : ''}</span>
                  <span className="stats-chart__label">{week.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Heatmap */}
        {stats.reviewHeatmap && stats.totalFlashcardReviews > 0 && (
          <div className="stats-dashboard__section">
            <h3 className="stats-dashboard__section-title font-display">Review Activity</h3>
            <div className="stats-heatmap">
              <div className="stats-heatmap__grid">
                {stats.reviewHeatmap.map((day, i) => (
                  <div
                    key={i}
                    className={`stats-heatmap__cell stats-heatmap__cell--${day.level}`}
                    title={`${day.date}: ${day.count} reviews`}
                  />
                ))}
              </div>
              <div className="stats-heatmap__legend">
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>Less</span>
                {[0, 1, 2, 3, 4].map(level => (
                  <div key={level} className={`stats-heatmap__cell stats-heatmap__cell--${level}`} />
                ))}
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>More</span>
              </div>
            </div>
          </div>
        )}

        {/* Reading Speed */}
        {stats.readingStats && (
          <div className="stats-dashboard__section">
            <h3 className="stats-dashboard__section-title font-display">Reading</h3>
            <div className="stats-dashboard__summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="stats-card">
                <span className="stats-card__value">{stats.readingStats.totalMinutes}</span>
                <span className="stats-card__label">Minutes Read</span>
              </div>
              <div className="stats-card">
                <span className="stats-card__value">{stats.readingStats.sessionsCount}</span>
                <span className="stats-card__label">Sessions</span>
              </div>
              <div className="stats-card">
                <span className="stats-card__value">{stats.readingStats.unitsPerMinute ?? '—'}</span>
                <span className="stats-card__label">Chars/min</span>
              </div>
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
