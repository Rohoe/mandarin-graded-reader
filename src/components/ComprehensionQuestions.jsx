import { useState } from 'react';
import './ComprehensionQuestions.css';

export default function ComprehensionQuestions({ questions }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!questions || questions.length === 0) return null;

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
        <ol className="comprehension__list fade-in">
          {questions.map((q, i) => (
            <li key={i} className="comprehension__item">
              <span className="comprehension__num">{i + 1}.</span>
              <span className="comprehension__text text-chinese">{q}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
