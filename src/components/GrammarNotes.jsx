import { useState } from 'react';
import './GrammarNotes.css';

export default function GrammarNotes({ grammarNotes, renderChars }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!grammarNotes?.length) return null;

  return (
    <section className="grammar-notes">
      <button
        className="grammar-notes__toggle"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <h2 className="grammar-notes__title font-display">Grammar Notes</h2>
        <span className="grammar-notes__icon">{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div className="grammar-notes__cards fade-in">
          {grammarNotes.map((note, i) => (
            <GrammarCard key={i} note={note} index={i} renderChars={renderChars} />
          ))}
        </div>
      )}
    </section>
  );
}

function GrammarCard({ note, index, renderChars }) {
  return (
    <div className="grammar-card">
      <div className="grammar-card__header">
        <span className="grammar-card__num">{index + 1}</span>
        <span className="grammar-card__pattern text-chinese">
          {renderChars ? renderChars(note.pattern, `gp-${index}`) : note.pattern}
        </span>
        <span className="grammar-card__label font-display text-muted">{note.label}</span>
      </div>
      <div className="grammar-card__body">
        <p className="grammar-card__explanation">{note.explanation}</p>
        {note.example && (
          <p className="grammar-card__example text-chinese">
            {renderChars ? renderChars(note.example, `ge-${index}`) : note.example}
          </p>
        )}
      </div>
    </div>
  );
}
