import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { gradeAnswers } from '../lib/api';
import './ComprehensionQuestions.css';

function scoreBadgeClass(scoreStr) {
  const num = parseInt(scoreStr, 10);
  if (num >= 4) return 'comprehension__score-badge--good';
  if (num === 3) return 'comprehension__score-badge--ok';
  return 'comprehension__score-badge--poor';
}

export default function ComprehensionQuestions({ questions, lessonKey, reader, story, level }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { apiKey } = state;

  const [collapsed, setCollapsed] = useState(false);
  const [answers, setAnswers] = useState(() => reader?.userAnswers ?? {});
  const [results, setResults] = useState(() => reader?.gradingResults ?? null);
  const [grading, setGrading] = useState(false);
  const [gradingError, setGradingError] = useState(null);

  if (!questions || questions.length === 0) return null;

  const hasAnyAnswer = questions.some((_, i) => (answers[i] || '').trim().length > 0);

  async function handleGrade() {
    if (!story) { setGradingError('Story text unavailable.'); return; }
    setGrading(true);
    setGradingError(null);
    try {
      const answersArray = questions.map((_, i) => answers[i] || '');
      const result = await gradeAnswers(apiKey, questions, answersArray, story, level);
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
                  <span className="comprehension__text text-chinese">{q}</span>

                  {results === null ? (
                    <textarea
                      className="comprehension__answer"
                      placeholder="Type your answer here…"
                      value={answers[i] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
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
                          <p className="comprehension__result-feedback">
                            {results.feedback[i].feedback}
                          </p>
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
                  disabled={!hasAnyAnswer || grading}
                >
                  {grading ? 'Grading…' : 'Grade My Answers'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
