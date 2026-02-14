import { useState } from 'react';
import './VocabularyList.css';

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

function VocabCard({ word, index }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`vocab-card ${open ? 'vocab-card--open' : ''}`}>
      <button
        className="vocab-card__header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="vocab-card__num text-subtle">{index + 1}</span>
        <span className="vocab-card__chinese text-chinese">{word.chinese}</span>
        <span className="vocab-card__pinyin text-muted">{word.pinyin}</span>
        <span className="vocab-card__english">{word.english}</span>
        <span className="vocab-card__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="vocab-card__body fade-in">
          {word.exampleStory && (
            <div className="vocab-card__example">
              <span className="vocab-card__example-label text-subtle">From story</span>
              <p className="vocab-card__example-text text-chinese">{renderInline(word.exampleStory)}</p>
              {word.usageNoteStory && (
                <p className="vocab-card__usage-note text-subtle">{renderInline(word.usageNoteStory)}</p>
              )}
            </div>
          )}
          {word.exampleExtra && (
            <div className="vocab-card__example">
              <span className="vocab-card__example-label text-subtle">Additional example</span>
              <p className="vocab-card__example-text text-chinese">{renderInline(word.exampleExtra)}</p>
              {word.usageNoteExtra && (
                <p className="vocab-card__usage-note text-subtle">{renderInline(word.usageNoteExtra)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VocabularyList({ vocabulary }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!vocabulary || vocabulary.length === 0) return null;

  return (
    <section className="vocabulary-list">
      <button
        className="vocabulary-list__toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <h2 className="vocabulary-list__title font-display">
          Vocabulary <span className="vocabulary-list__count">({vocabulary.length})</span>
        </h2>
        <span className="vocabulary-list__toggle-icon">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div className="vocabulary-list__cards fade-in">
          {vocabulary.map((word, i) => (
            <VocabCard key={word.chinese + i} word={word} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
