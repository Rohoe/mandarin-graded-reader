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

function VocabCard({ word, index, renderChars, verboseVocab }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`vocab-card ${open ? 'vocab-card--open' : ''}`}>
      <button
        className="vocab-card__header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="vocab-card__num text-subtle">{index + 1}</span>
        <span className="vocab-card__chinese text-chinese">
          {renderChars ? renderChars(word.target || word.chinese, `vc-${index}`) : (word.target || word.chinese)}
        </span>
        <span className="vocab-card__pinyin text-muted">{word.romanization || word.pinyin}</span>
        <span className="vocab-card__english">{word.translation || word.english}</span>
        <span className="vocab-card__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="vocab-card__body fade-in">
          {word.exampleStory && (
            <div className="vocab-card__example">
              <span className="vocab-card__example-label text-subtle">From story</span>
              <p className="vocab-card__example-text text-chinese">
                {renderChars?.(word.exampleStory, `ves-${index}`) || renderInline(word.exampleStory)}
              </p>
              {verboseVocab && word.exampleStoryTranslation && (
                <p className="vocab-card__example-translation text-muted">{word.exampleStoryTranslation}</p>
              )}
              {word.usageNoteStory && (
                <p className="vocab-card__usage-note text-subtle">{renderInline(word.usageNoteStory)}</p>
              )}
            </div>
          )}
          {word.exampleExtra && (
            <div className="vocab-card__example">
              <span className="vocab-card__example-label text-subtle">Additional example</span>
              <p className="vocab-card__example-text text-chinese">
                {renderChars?.(word.exampleExtra, `vee-${index}`) || renderInline(word.exampleExtra)}
              </p>
              {verboseVocab && word.exampleExtraTranslation && (
                <p className="vocab-card__example-translation text-muted">{word.exampleExtraTranslation}</p>
              )}
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

export default function VocabularyList({ vocabulary, renderChars, verboseVocab }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!vocabulary || vocabulary.length === 0) return null;

  return (
    <section className="vocabulary-list">
      <button
        className="vocabulary-list__toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
        aria-controls="vocabulary-list-content"
      >
        <h2 className="vocabulary-list__title font-display">
          Vocabulary <span className="vocabulary-list__count">({vocabulary.length})</span>
        </h2>
        <span className="vocabulary-list__toggle-icon">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div id="vocabulary-list-content" className="vocabulary-list__cards fade-in">
          {vocabulary.map((word, i) => (
            <VocabCard
              key={(word.target || word.chinese) + i}
              word={word}
              index={i}
              renderChars={renderChars}
              verboseVocab={verboseVocab}
            />
          ))}
        </div>
      )}
    </section>
  );
}
