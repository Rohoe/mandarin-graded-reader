import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { generateSyllabus, generateReader } from '../lib/api';
import { parseReaderResponse } from '../lib/parser';
import GenerationProgress from './GenerationProgress';
import './TopicForm.css';

const HSK_LEVELS = [
  { value: 1, label: 'HSK 1', desc: 'Absolute beginner (~150 words)' },
  { value: 2, label: 'HSK 2', desc: 'Elementary (~300 words)' },
  { value: 3, label: 'HSK 3', desc: 'Pre-intermediate (~600 words)' },
  { value: 4, label: 'HSK 4', desc: 'Intermediate (~1,200 words)' },
  { value: 5, label: 'HSK 5', desc: 'Upper-intermediate (~2,500 words)' },
  { value: 6, label: 'HSK 6', desc: 'Advanced (~5,000 words)' },
];

export default function TopicForm({ onNewSyllabus, onStandaloneGenerated, onStandaloneGenerating, onCancel }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);

  const [topic, setTopic]         = useState('');
  const [level, setLevel]         = useState(state.defaultLevel ?? 3);
  const [mode, setMode]           = useState('syllabus'); // 'syllabus' | 'standalone'
  const [lessonCount, setLessonCount] = useState(6);
  const [readerLength, setReaderLength] = useState(1200);

  async function handleGenerateSyllabus(e) {
    e.preventDefault();
    if (!topic.trim()) return;

    act.setLoading(true, '正在生成课程大纲…');
    act.clearError();
    try {
      const { summary, lessons } = await generateSyllabus(state.apiKey, topic.trim(), level, lessonCount);
      const newSyllabus = {
        id:        `syllabus_${Date.now().toString(36)}`,
        topic:     topic.trim(),
        level,
        summary,
        lessons,
        createdAt: Date.now(),
      };
      act.addSyllabus(newSyllabus);
      act.notify('success', `Syllabus generated: ${lessons.length} lessons on "${topic}"`);
      onNewSyllabus?.(newSyllabus.id);
    } catch (err) {
      act.setError(err.message);
    } finally {
      act.setLoading(false);
    }
  }

  async function handleGenerateStandalone(e) {
    e.preventDefault();
    if (!topic.trim()) return;

    const lessonKey = `standalone_${Date.now()}`;
    const topicStr  = topic.trim();

    // Register in sidebar and navigate to the reader view immediately
    act.addStandaloneReader({ key: lessonKey, topic: topicStr, level, createdAt: Date.now() });
    act.startPendingReader(lessonKey);
    act.clearError();
    onStandaloneGenerating?.();
    onStandaloneGenerated?.(lessonKey);

    // Generate in background — form can close, user can navigate away
    try {
      const raw    = await generateReader(state.apiKey, topicStr, level, state.learnedVocabulary, readerLength, state.maxTokens);
      const parsed = parseReaderResponse(raw);
      act.setReader(lessonKey, { ...parsed, topic: topicStr, level, lessonKey, isStandalone: true });
      if (parsed.ankiJson?.length > 0) {
        act.addVocabulary(parsed.ankiJson.map(c => ({
          chinese: c.chinese, pinyin: c.pinyin, english: c.english,
        })));
      }
      act.notify('success', `Reader ready: "${topicStr}"`);
    } catch (err) {
      act.notify('error', `Generation failed: ${err.message.slice(0, 80)}`);
      act.removeStandaloneReader(lessonKey);
    } finally {
      act.clearPendingReader(lessonKey);
    }
  }

  const onSubmit = mode === 'syllabus' ? handleGenerateSyllabus : handleGenerateStandalone;

  return (
    <form className="topic-form" onSubmit={onSubmit}>
      <div className="topic-form__modes">
        <button
          type="button"
          className={`topic-form__mode-btn ${mode === 'syllabus' ? 'active' : ''}`}
          onClick={() => setMode('syllabus')}
        >
          Course Syllabus
        </button>
        <button
          type="button"
          className={`topic-form__mode-btn ${mode === 'standalone' ? 'active' : ''}`}
          onClick={() => setMode('standalone')}
        >
          Single Reader
        </button>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="topic-input">Topic</label>
        <input
          id="topic-input"
          type="text"
          className="form-input"
          placeholder={mode === 'syllabus'
            ? 'e.g. Chinese business culture, Traditional festivals…'
            : 'e.g. A day at a Beijing market…'}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          disabled={state.loading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">HSK Level</label>
        <div className="topic-form__hsk-pills">
          {HSK_LEVELS.map(l => (
            <button
              key={l.value}
              type="button"
              className={`topic-form__hsk-pill ${level === l.value ? 'active' : ''}`}
              onClick={() => setLevel(l.value)}
              disabled={state.loading}
              title={`${l.label} — ${l.desc}`}
            >
              {l.value}
            </button>
          ))}
        </div>
        <p className="topic-form__hsk-desc">
          {HSK_LEVELS.find(l => l.value === level)?.desc}
        </p>
      </div>

      {mode === 'syllabus' && (
        <div className="form-group">
          <div className="topic-form__slider-row">
            <label className="form-label" htmlFor="lesson-count">Lessons</label>
            <span className="topic-form__slider-value">{lessonCount}</span>
          </div>
          <input
            id="lesson-count"
            type="range"
            className="topic-form__slider"
            min={2} max={12} step={1}
            value={lessonCount}
            onChange={e => setLessonCount(Number(e.target.value))}
            disabled={state.loading}
          />
          <div className="topic-form__slider-ticks">
            <span>2</span><span>12</span>
          </div>
        </div>
      )}

      <div className="form-group">
        <div className="topic-form__slider-row">
          <label className="form-label" htmlFor="reader-length">Reader Length</label>
          <span className="topic-form__slider-value">~{readerLength} chars</span>
        </div>
        <input
          id="reader-length"
          type="range"
          className="topic-form__slider"
          min={500} max={2000} step={100}
          value={readerLength}
          onChange={e => setReaderLength(Number(e.target.value))}
          disabled={state.loading}
        />
        <div className="topic-form__slider-ticks">
          <span>Short</span><span>Long</span>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg topic-form__submit"
        disabled={state.loading || !topic.trim()}
      >
        {state.loading
          ? '生成中…'
          : mode === 'syllabus'
            ? 'Generate Syllabus'
            : 'Generate Reader'}
      </button>

      {!state.loading && !topic.trim() && (
        <p className="topic-form__hint">Enter a topic above to get started</p>
      )}

      {state.loading && mode === 'syllabus' && (
        <GenerationProgress type="syllabus" />
      )}

      {onCancel && !state.loading && (
        <div className="topic-form__footer-row">
          <button
            type="button"
            className="btn btn-ghost btn-sm topic-form__clear"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
