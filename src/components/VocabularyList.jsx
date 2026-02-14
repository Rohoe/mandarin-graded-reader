import { useState } from 'react';
import './VocabularyList.css';

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
              <p className="vocab-card__example-text text-chinese">{word.exampleStory}</p>
              {word.usageNoteStory && (
                <p className="vocab-card__usage-note text-subtle">{word.usageNoteStory}</p>
              )}
            </div>
          )}
          {word.exampleExtra && (
            <div className="vocab-card__example">
              <span className="vocab-card__example-label text-subtle">Additional example</span>
              <p className="vocab-card__example-text text-chinese">{word.exampleExtra}</p>
              {word.usageNoteExtra && (
                <p className="vocab-card__usage-note text-subtle">{word.usageNoteExtra}</p>
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
