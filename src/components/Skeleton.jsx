import './Skeleton.css';

/**
 * Skeleton loader component.
 * @param {'text'|'title'|'card'|'stat'} variant
 * @param {number} lines - Number of text lines (only for variant="text")
 * @param {string} width - Optional inline width override
 */
export default function Skeleton({ variant = 'text', lines = 1, width, style }) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className="skeleton-paragraph" style={style}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="skeleton skeleton--text" style={i === lines - 1 ? { width: '70%' } : undefined} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`skeleton skeleton--${variant}`}
      style={{ ...style, ...(width ? { width } : {}) }}
    />
  );
}
