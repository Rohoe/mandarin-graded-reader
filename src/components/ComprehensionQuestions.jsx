import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../context/useAppSelector';
import { actions } from '../context/actions';
import { gradeAnswers } from '../lib/api';
import './ComprehensionQuestions.css';

function renderInline(text) {
  if (!text) return null;
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|[^*]+)/g;
  const parts = [];
  let m;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m[2] !== undefined)      parts.push(<strong key={i++}>{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={i++}>{m[3]}</em>);
    else                         parts.push(<span key={i++}>{m[0]}</span>);
  }
  return parts;
}

function scoreBadgeClass(scoreStr) {
  const num = parseInt(scoreStr, 10);
  if (num >= 4) return 'comprehension__score-badge--good';
  if (num === 3) return 'comprehension__score-badge--ok';
  return 'comprehension__score-badge--poor';
}

const AUTO_SAVE_DELAY = 1500;

export default function ComprehensionQuestions({ questions, lessonKey, reader, story, level, langId, renderChars }) {
  const apiKey = useAppSelector(s => s.apiKey);
  const dispatch = useAppDispatch();
  const act = actions(dispatch);

  const [collapsed, setCollapsed] = useState(false);
  const [answers, setAnswers] = useState(() => reader?.userAnswers ?? {});
  const [results, setResults] = useState(() => reader?.gradingResults ?? null);
  const [grading, setGrading] = useState(false);
  const [gradingError, setGradingError] = useState(null);

  // Refs for debounced auto-save — read current values without stale closures
  const debounceRef = useRef(null);
  const answersRef = useRef(answers);
  const readerRef = useRef(reader);
  const lessonKeyRef = useRef(lessonKey);
  answersRef.current = answers;
  readerRef.current = reader;
  lessonKeyRef.current = lessonKey;

  const flushSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const key = lessonKeyRef.current;
    if (!key) return;
    const current = readerRef.current;
    const currentAnswers = answersRef.current;
    // Only save if answers actually differ from what's persisted
    const saved = current?.userAnswers ?? {};
    const dirty = Object.keys(currentAnswers).some(i => (currentAnswers[i] ?? '') !== (saved[i] ?? ''));
    if (dirty) {
      act.setReader(key, { ...current, userAnswers: currentAnswers });
    }
  }, [act]);

  // Reset local state when switching to a different reader; flush pending save first
  useEffect(() => {
    flushSave();
    setAnswers(reader?.userAnswers ?? {});
    setResults(reader?.gradingResults ?? null);
    setGradingError(null);
  }, [lessonKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush pending save on unmount
  useEffect(() => {
    return () => flushSave();
  }, [flushSave]);

  if (!questions || questions.length === 0) {
    return (
      <section className="comprehension">
        <p className="text-muted" style={{ padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
          No comprehension questions found in this reader.{' '}
          <span style={{ opacity: 0.6 }}>(Check browser console for parse details.)</span>
        </p>
      </section>
    );
  }

  const hasAnyAnswer = questions.some((_, i) => (answers[i] || '').trim().length > 0);

  function handleAnswerChange(i, val) {
    const next = { ...answers, [i]: val };
    setAnswers(next);
    // Schedule debounced auto-save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const key = lessonKeyRef.current;
      if (!key) return;
      act.setReader(key, { ...readerRef.current, userAnswers: answersRef.current });
    }, AUTO_SAVE_DELAY);
  }

  async function handleGrade() {
    if (!story) { setGradingError('Story text unavailable.'); return; }
    // Flush any pending debounce and save immediately
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    if (lessonKey) act.setReader(lessonKey, { ...reader, userAnswers: answers });
    setGrading(true);
    setGradingError(null);
    try {
      const answersArray = questions.map((_, i) => answers[i] || '');
      const result = await gradeAnswers(apiKey, questions, answersArray, story, level, 2048, langId);
      setResults(result);
      if (lessonKey) {
        act.setReader(lessonKey, {
          ...reader,
          userAnswers: answers,
          gradingResults: { ...result, gradedAt: Date.now() },
        });
      }
    } catch (err) {
      setGradingError(err.message);
    } finally {
      setGrading(false);
    }
  }

  function handleRevise() {
    setResults(null);
    setGradingError(null);
  }

  return (
    <section className="comprehension">
      <button
        className="comprehension__toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <h2 className="comprehension__title font-display">
          Comprehension Questions
        </h2>
        <span className="comprehension__icon">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <>
          <ol className="comprehension__list fade-in">
            {questions.map((q, i) => (
              <li key={i} className="comprehension__item">
                <span className="comprehension__num">{i + 1}.</span>
                <div className="comprehension__item-body">
                  <span className="comprehension__text text-chinese">
                  {renderChars ? renderChars(q, `q${i}`) : renderInline(q)}
                </span>

                  {results === null ? (
                    <textarea
                      className="comprehension__answer"
                      placeholder="Type your answer here…"
                      value={answers[i] || ''}
                      onChange={e => handleAnswerChange(i, e.target.value)}
                      disabled={grading}
                    />
                  ) : (
                    <div className="comprehension__result">
                      {answers[i] && (
                        <p className="comprehension__user-answer">Your answer: {answers[i]}</p>
                      )}
                      {results.feedback?.[i] && (
                        <div className="comprehension__result-row">
                          <span className={`comprehension__score-badge ${scoreBadgeClass(results.feedback[i].score)}`}>
                            {results.feedback[i].score}
                          </span>
                          <div>
                            <p className="comprehension__result-feedback">
                              {results.feedback[i].feedback}
                            </p>
                            {results.feedback[i].suggestedAnswer && (
                              <p className="comprehension__suggested-answer">
                                <strong>Suggested answer:</strong> {results.feedback[i].suggestedAnswer}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {results !== null ? (
            <div className="comprehension__score-panel">
              <p className="comprehension__score-headline">{results.overallScore}</p>
              {results.overallFeedback && (
                <p className="comprehension__score-feedback">{results.overallFeedback}</p>
              )}
              <button className="btn btn-ghost btn-sm" onClick={handleRevise}>
                Revise and Regrade
              </button>
            </div>
          ) : (
            <>
              {gradingError && (
                <p className="comprehension__error">{gradingError}</p>
              )}
              <div className="comprehension__actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleGrade}
                  disabled={!hasAnyAnswer || grading || !apiKey}
                >
                  {grading ? 'Grading…' : 'Grade My Answers'}
                </button>
              </div>
              {!apiKey && (
                <p className="comprehension__hint" style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  API key required for grading. Open Settings to add your key.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
